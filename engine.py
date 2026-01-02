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


def calculate_prediction(df_override: pd.DataFrame = None) -> Dict[str, Any]:
    db = SessionLocal()
    try:
        if df_override is not None:
             df = df_override
        else:
            df = get_all_draws_as_dataframe(db)
        
        if df.empty:
            return {"numbers": [], "letter": "A", "confidence": 0}

        # 1. Number Stats
        numbers_stats = calculate_stats(df)
        
        # 2. Formula: Score = (0.4 * Freq_20) + (0.5 * (1 - exp(-0.15 * Gap)))
        scores = []
        for n, s in numbers_stats.items():
            freq_term = 0.4 * s["freq_20"]
            gap_term = 0.5 * (1 - math.exp(-0.15 * s["gap"]))
            total_score = freq_term + gap_term
            scores.append({"number": n, "score": total_score, "gap": s["gap"], "freq": s["freq_20"]})
            
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
