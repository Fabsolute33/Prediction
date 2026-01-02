import math
import pandas as pd
from sqlalchemy.orm import Session
from models import SessionLocal, Draw
from typing import List, Dict, Any

def get_all_draws_as_dataframe(db: Session):
    draws = db.query(Draw).order_by(Draw.date.asc(), Draw.time.asc()).all()
    if not draws:
        return pd.DataFrame()
    
    data = []
    for d in draws:
        # Flatten balls list for easier analysis if needed, 
        # but for frequency we need to count individual numbers
        data.append({
            "id": d.id,
            "date": d.date,
            "balls": d.balls_list, # List of ints
            "bonus": d.bonus_letter
        })
    return pd.DataFrame(data)

def calculate_stats(df: pd.DataFrame, all_numbers=range(1, 26)):
    """
    Calculate Frequency (Last 20 draws) and Gap for each number.
    """
    stats = {n: {"freq_20": 0, "gap": 0} for n in all_numbers}
    
    # Last 20 draws for frequency
    last_20 = df.tail(20)
    for _, row in last_20.iterrows():
        for ball in row['balls']:
             if ball in stats:
                stats[ball]["freq_20"] += 1
                
    # Gap calculation (Draws since last appearance)
    # We iterate backwards from the most recent draw
    total_draws = len(df)
    for n in all_numbers:
        gap = 0
        found = False
        # Reverse iterate indices
        for idx in range(total_draws - 1, -1, -1):
            balls = df.iloc[idx]['balls']
            if n in balls:
                found = True
                break
            gap += 1
        
        if found:
            stats[n]["gap"] = gap
        else:
            stats[n]["gap"] = total_draws # Never appeared
            
    return stats

def calculate_letter_stats(df: pd.DataFrame, letters=['A', 'B', 'C', 'D', 'E']):
    """
    Simple frequency/gap for letters just to pick one.
    """
    stats = {l: {"count": 0, "gap": 0} for l in letters}
    total_draws = len(df)
    
    # Frequency (All time or last 20? Let's use last 50 for letters as they are fewer)
    last_50 = df.tail(50)
    for _, row in last_50.iterrows():
        l = row['bonus']
        if l in stats:
            stats[l]["count"] += 1
            
    # Gap
    for l in letters:
        gap = 0
        found = False
        for idx in range(total_draws - 1, -1, -1):
            if df.iloc[idx]['bonus'] == l:
                found = True
                break
            gap += 1
        stats[l]["gap"] = gap if found else total_draws
        
    return stats



def calculate_score_for_number(number, stats, freq_w=0.4, gap_w=0.5, decay=0.15):
    freq_term = freq_w * stats["freq_20"]
    gap_term = gap_w * (1 - math.exp(-decay * stats["gap"]))
    total_score = freq_term + gap_term
    return {"number": number, "score": total_score, "gap": stats["gap"], "freq": stats["freq_20"]}

def calculate_prediction(df_override: pd.DataFrame = None, config_override: Dict[str, float] = None) -> Dict[str, Any]:
    db = SessionLocal()
    try:
        # Load Config from DB or use defaults
        # We can implement DB loading here or pass it in. 
        # For now, let's define defaults and override if config_override is present.
        
        freq_w = 0.4
        gap_w = 0.5
        decay = 0.15
        
        if config_override:
            freq_w = config_override.get('freq_weight', freq_w)
            gap_w = config_override.get('gap_weight', gap_w)
            decay = config_override.get('decay_rate', decay)
        else:
            # Try to load from DB
            from models import AlgorithmConfiguration
            algo_config = db.query(AlgorithmConfiguration).filter_by(active=1).first()
            if algo_config:
                 freq_w = float(algo_config.freq_weight)
                 gap_w = float(algo_config.gap_weight)
                 decay = float(algo_config.decay_rate)
        
        if df_override is not None:
             df = df_override
        else:
            df = get_all_draws_as_dataframe(db)
        
        if df.empty:
            return {"numbers": [], "letter": "A", "confidence": 0}

        # 1. Number Stats
        numbers_stats = calculate_stats(df)
        
        # 2. Calculate Scores
        scores = []
        for n, s in numbers_stats.items():
             score_data = calculate_score_for_number(n, s, freq_w, gap_w, decay)
             scores.append(score_data)
            
        # Sort by score descending
        scores.sort(key=lambda x: x["score"], reverse=True)
        
        # Top 10 numbers
        top_10 = scores[:10]
        top_numbers = [x["number"] for x in top_10]
        avg_score = sum([x["score"] for x in top_10]) / 10
        
        # 3. Letter Stats (Simple: Most overdue/Gap weighted)
        letter_stats = calculate_letter_stats(df)
        # Score letter by Gap mostly? Or just pick most frequent? 
        # Let's use a similar gap logic: Higher gap = Higher probability often in gambler's fallacy logic 
        # but let's stick to a mix. Let's pick the one with highest Gap for variety or highest freq?
        # User didn't specify letter formula. I'll use Highest Gap.
        best_letter = max(letter_stats.items(), key=lambda x: x[1]["gap"])[0]

        return {
            "numbers": top_numbers,
            "letter": best_letter,
            "confidence": min(avg_score * 10, 100), # Normalize roughly
            "details": top_10
        }

    finally:
        db.close()

if __name__ == "__main__":
    # Test run
    pred = calculate_prediction()
    print("Prediction:", pred)
