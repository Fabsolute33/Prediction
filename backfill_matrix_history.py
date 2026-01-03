from models import SessionLocal, Draw
import matrix_engine
from engine import calculate_prediction
import json

def backfill_history():
    db = SessionLocal()
    try:
        # Get all draws sorted by date
        all_draws = db.query(Draw).order_by(Draw.date.asc(), Draw.time.asc()).all()
        
        print(f"Found {len(all_draws)} draws to process.")
        
        # We need to simulate the state of the matrix for EACH draw.
        # So for Draw N, we use draws 0..N-1 to build the matrix, 
        # then calculate prediction, then save it to Draw N.
        
        updated_count = 0
        
        for i, current_draw in enumerate(all_draws):
            # History is everything BEFORE this draw
            history = all_draws[:i]
            
            # Rebuild Matrix State from history
            # We must force the engine to use this specific subset
            matrix_engine.build_matrices(history)
            
            # Calculate prediction "as if" we were there
            algo_pred = matrix_engine.calculate_matrix_prediction()
           
            # Update the JSON
            # Current JSON might be None, or old Flat format, or new Unified format (if we ran this partial)
            current_json = current_draw.prediction_json or {}
            
            # Check structure
            new_json = {}
            
            if "statistical" in current_json:
                # Already unified? Or partially?
                new_json = current_json
                # Just update algorithmic part
                new_json["algorithmic"] = algo_pred
            else:
                # It's likely the old Flat format (Statistical only)
                # We move it to 'statistical'
                # But wait, if it's empty, we might want to regen statistical too?
                # Let's assume existing json is the statistical one.
                new_json["statistical"] = current_json
                new_json["algorithmic"] = algo_pred
                
            # Update DB
            current_draw.prediction_json = new_json
            updated_count += 1
            
            if i % 10 == 0:
                print(f"Processed {i}/{len(all_draws)}...")
                
        db.commit()
        print(f"Backfill Complete. Updated {updated_count} draws.")
        
        # Restore Matrix state to full
        matrix_engine.build_matrices()
        
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    backfill_history()
