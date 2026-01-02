import pandas as pd
from sqlalchemy.orm import Session
from models import SessionLocal, Draw
from engine import calculate_prediction, get_all_draws_as_dataframe

def backfill():
    db = SessionLocal()
    try:
        # Get all draws sorted by date/time
        all_draws = db.query(Draw).order_by(Draw.date.asc(), Draw.time.asc()).all()
        
        # We need a way to slice the data for "what was known before this draw"
        # Since 'get_all_draws_as_dataframe' gets everything, we can just fetch everything once
        # and slice the dataframe based on index or date.
        
        df_full = get_all_draws_as_dataframe(db)
        
        updated_count = 0
        
        for i, draw in enumerate(all_draws):
            if draw.prediction_json:
                continue # Already has prediction
            
            print(f"Backfilling draw #{draw.draw_id} ({draw.date} {draw.time})...")
            
            # Filter DF to only include draws BEFORE this one
            # We can rely on the sort order match between 'all_draws' and 'df_full' rows 
            # if we constructed df_full carefully. 
            # engine.py: get_all_draws_as_dataframe sorts by date asc, time asc.
            # So row `i` in df_full corresponds to draw `i` in all_draws.
            # The 'prior history' is rows 0 to i-1.
            
            if i == 0:
                # No history for first draw
                prediction = {"numbers": [], "letter": "A", "confidence": 0}
            else:
                df_subset = df_full.iloc[:i]
                prediction = calculate_prediction(df_subset)
            
            draw.prediction_json = prediction
            updated_count += 1
            
            if updated_count % 10 == 0:
                db.commit()
                print(f"Committed {updated_count} updates...")
                
        db.commit()
        print(f"Backfill complete. Updated {updated_count} draws.")
        
    except Exception as e:
        print(f"Error during backfill: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    backfill()
