from models import SessionLocal, Draw
import sys

def inspect_db():
    db = SessionLocal()
    try:
        # Get count
        count = db.query(Draw).count()
        print(f"Total draws in DB: {count}")
        
        # Get latest 5
        latest = db.query(Draw).order_by(Draw.date.desc(), Draw.time.desc()).limit(10).all()
        print("Latest 10 draws:")
        for d in latest:
            has_pred = str(d.prediction_json is not None)
            pred_len = len(d.prediction_json.get('numbers', [])) if d.prediction_json else 0
            print(f"ID {d.draw_id} ({d.date} {d.time}): Pred={has_pred}, Len={pred_len}")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    inspect_db()
