import numpy as np
# from sqlalchemy.orm import Session -- REMOVED
# from models import Draw, SessionLocal -- REMOVED
# Lazy imports - moved inside functions to avoid initialization issues
# from firestore_service import get_all_draws_sorted as fs_get_all_draws_sorted, get_draw_count as fs_get_draw_count

# Global cache for matrices to avoid rebuilding constantly if not needed
# In a production app with multiple workers, this might need a better store (Redis),
# but for this standalone app, memory is fine.
_MATRIX_A = None
_MATRIX_B = None
_LAST_DRAW_COUNT = 0

def get_db_draw_count():
    # Use firestore count (or len of all draws if count API too expensive/complex)
    from firestore_service import get_draw_count as fs_get_draw_count  # Lazy import
    return fs_get_draw_count()

def get_all_draws_sorted():
    """
    Helper to fetch all draws sorted by date/time ascending (oldest to newest).
    Excludes pending draws.
    """
    from firestore_service import get_all_draws_sorted as fs_get_all_draws_sorted  # Lazy import
    draws = fs_get_all_draws_sorted()
    # Filter in python for source != 'ai_pending'
    return [d for d in draws if d.source != 'ai_pending']

def build_matrices(draws=None):
    """
    Constructs Matrix A (Markov/Time) and Matrix B (Co-occurrence/Space).
    
    Matrix A (25x25):
        Row i -> Col j means: Probability that j comes in Draw T+1 given i was in Draw T.
        Normalized so rows sum to 1.
        
    Matrix B (25x25):
        Row x -> Col y means: Count/Strength of x and y appearing TOGETHER in the SAME draw.
        Symmetric.
    """
    global _MATRIX_A, _MATRIX_B, _LAST_DRAW_COUNT
    
    if draws is None:
        draws = get_all_draws_sorted()
        
    # Update the cache version
    _LAST_DRAW_COUNT = len(draws)
    
    # Initialize entries 1-25. 
    # Array index 0-24 will map to Ball 1-25.
    # So index = number - 1.
    
    mat_a = np.zeros((25, 25), dtype=float)
    mat_b = np.zeros((25, 25), dtype=float)
    
    if not draws:
        _MATRIX_A = mat_a
        _MATRIX_B = mat_b
        return
        
    # --- Build Matrix B (Co-occurrence) ---
    # Scania each draw individually
    for d in draws:
        balls = d.balls_list
        # balls is a list of ints. e.g. [1, 5, 12, ...]
        # We need all pairs.
        for i in range(len(balls)):
            for j in range(i + 1, len(balls)):
                u, v = balls[i], balls[j]
                if 1 <= u <= 25 and 1 <= v <= 25:
                    # Adjust to 0-indexed
                    mat_b[u-1][v-1] += 1
                    mat_b[v-1][u-1] += 1
                    
    # --- Build Matrix A (Markov / Transition) ---
    # Iterate pairwise: Draw T and Draw T+1
    for t in range(len(draws) - 1):
        draw_curr = draws[t].balls_list
        draw_next = draws[t+1].balls_list
        
        for u in draw_curr:
            for v in draw_next:
                if 1 <= u <= 25 and 1 <= v <= 25:
                    mat_a[u-1][v-1] += 1
                    
    # Normalize Matrix A (Rows sum to 1)
    # If a row sums to 0 (number never appeared?), leave as 0 to avoid NaN
    row_sums = mat_a.sum(axis=1, keepdims=True)
    # Avoid division by zero
    # np.divide where row_sums != 0
    mat_a = np.divide(mat_a, row_sums, out=np.zeros_like(mat_a), where=row_sums!=0)
    
    _MATRIX_A = mat_a
    _MATRIX_B = mat_b
    print(f"Matrices Re-calculated using {_LAST_DRAW_COUNT} draws.")

def get_matrix_a():
    global _LAST_DRAW_COUNT
    
    # Check if we need to rebuild
    current_count = get_db_draw_count()
    if _MATRIX_A is None or current_count != _LAST_DRAW_COUNT:
        print(f"Updates detected (DB={current_count}, Cache={_LAST_DRAW_COUNT}). Rebuilding...")
        build_matrices()
        
    return _MATRIX_A

def get_matrix_b():
    global _LAST_DRAW_COUNT
    
    # Check if we need to rebuild
    current_count = get_db_draw_count()
    if _MATRIX_B is None or current_count != _LAST_DRAW_COUNT:
        print(f"Updates detected (DB={current_count}, Cache={_LAST_DRAW_COUNT}). Rebuilding...")
        build_matrices()
        
    return _MATRIX_B

def get_latest_draw_numbers():
    draws = get_all_draws_sorted()
    if draws:
        return draws[-1].balls_list
    return []

def calculate_matrix_prediction():
    """
    The "Decoder" Function.
    
    1. Get Latest Draw (T_now).
    2. Score Time: For each candidate c (1-25), sum P(c|x) for all x in T_now using Matrix A.
    3. Score Space: Average affinity with top predicted candidates? 
       Wait, the prompt says: "Average affinity with the top predicted candidates".
       This implies a two-step process or iterative?
       
       Interpretation: 
       Maybe "Average affinity with the other balls in the potential prediction"? 
       Or "Average affinity with the numbers in T_now"? No, that would be "Space" relative to history?
       
       Let's re-read carefully:
       "Score_Space = Average affinity with the top predicted candidates (using Matrix B)."
       
       This likely means we first calculate a preliminary score (maybe just Time?), pick top candidates, 
       and then refine or score based on how well they fit together?
       
       OR, simpler interpretation:
       Score_Space for candidate 'c' is how well 'c' fits with the *other* high-scoring candidates.
       
       Let's try a robust approach:
       1. Calculate Score_Time for all 1-25.
       2. Rank them.
       3. Take top N (e.g. 10).
       4. Calculate Score_Space for each candidate 'c' as the average affinity (Matrix B) with the *other* top N candidates.
       5. Combine.
       
    Weights: 0.7 Time + 0.3 Space.
    """
    mat_a = get_matrix_a()
    mat_b = get_matrix_b()
    latest_balls = get_latest_draw_numbers()
    
    if not latest_balls:
        return {"numbers": [], "details": []}
        
    final_scores = {}
    
    # 1. Score Time
    # Sum of transition probabilities from Draw T_now
    time_scores = np.zeros(25)
    for x in latest_balls:
        if 1 <= x <= 25:
             # Add row x's contribution to all cols
             time_scores += mat_a[x-1]
             
    # Normalize Time Scores for sanity (0-1 range roughly)?
    # Or just use raw vals. Matrix A is probabilities. Sum might be > 1.
    # Let's normalize to 0-1 range for mixing.
    if time_scores.max() > 0:
        time_scores = time_scores / time_scores.max()
        
    # 2. Score Space (Affinity with Top Candidates)
    # We need a preliminary "Top" set to measure affinity against.
    # Let's use Top 15 from Time Score to define the "Cluster" we are forming.
    top_indices_time = time_scores.argsort()[::-1][:15] # Top 15 indices (0-24)
    
    space_scores = np.zeros(25)
    
    # For each candidate 'c' (0-24), calculate average B value with the top_indices_time (excluding self)
    for c in range(25):
        affinities = []
        for other in top_indices_time:
            if c == other:
                continue
            # Matrix B is counts. We might want to normalize B ideally, but raw counts work if scaled.
            # Let's use raw counts for now, then normalize the final vector.
            affinities.append(mat_b[c][other])
        
        if affinities:
            space_scores[c] = np.mean(affinities)
            
    # Normalize Space Scores
    if space_scores.max() > 0:
        space_scores = space_scores / space_scores.max()
        
    # 3. Final Score
    # 0.7 * Time + 0.3 * Space
    total_scores = (0.7 * time_scores) + (0.3 * space_scores)
    
    # Pack results
    results = []
    for c in range(25):
        results.append({
            "number": c + 1,
            "score": float(total_scores[c]),
            "score_time": float(time_scores[c]),
            "score_space": float(space_scores[c])
        })
        
    # Sort by Score Desc
    results.sort(key=lambda x: x["score"], reverse=True)
    
    top_10 = [r["number"] for r in results[:10]]
    
    return {
        "numbers": top_10,
        "details": results[:10], # Send top 10 details
        "matrix_a_summary": "Active", # Placeholder to confirm usage
        "matrix_b_summary": "Active"
    }
    
def get_matrix_visual_data():
    """
    Returns data formatted for the Frontend Heatmap.
    Arrays need to be nested lists.
    """
    return {
        "matrix_a": get_matrix_a().tolist(),
        "matrix_b": get_matrix_b().tolist(),
        "prediction": calculate_matrix_prediction()
    }
