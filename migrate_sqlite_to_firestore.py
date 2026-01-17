import sys
import os
from sqlalchemy import create_engine, Column, Integer, String, Date, Time, JSON
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
import firebase_admin
from firebase_admin import credentials, firestore

# Initialize Firebase Admin SDK explicitly for local execution
PROJECT_ID = "prophet-crescendo"

if not firebase_admin._apps:
    firebase_admin.initialize_app(options={'projectId': PROJECT_ID})

db = firestore.client()
COLLECTION_DRAWS = "draws"

def add_draw_direct(draw_data: dict):
    """Adds a draw directly to Firestore."""
    doc_id = str(draw_data.get('draw_id')) if draw_data.get('draw_id') else None
    if doc_id:
        db.collection(COLLECTION_DRAWS).document(doc_id).set(draw_data)
    else:
        db.collection(COLLECTION_DRAWS).add(draw_data)

# Old Model Definition for reading SQLite
Base = declarative_base()

class OldDraw(Base):
    __tablename__ = 'draws'
    id = Column(Integer, primary_key=True, index=True)
    draw_id = Column(Integer, unique=True, index=True)
    date = Column(Date)
    time = Column(Time)
    balls_list = Column(JSON)
    bonus_letter = Column(String)
    prediction_json = Column(JSON)
    source = Column(String)

# Connect to local SQLite
SQLALCHEMY_DATABASE_URL = "sqlite:///./crescendo.db"

def migrate():
    if not os.path.exists("./crescendo.db"):
        print("Error: crescendo.db not found in current directory.")
        return

    print("Connecting to SQLite...")
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    

    session = SessionLocal()
    try:
        draws = session.query(OldDraw).all()
        print(f"Found {len(draws)} draws in SQLite.")
        
        count = 0
        for d in draws:
            # Convert to Firestore format
            # Dates and Times to strings as decided for Firestore compatibility
            s_date = d.date.isoformat() if d.date else None
            s_time = d.time.strftime("%H:%M:%S") if d.time else None
            
            draw_data = {
                "draw_id": d.draw_id,
                "date": s_date, # String
                "time": s_time, # String
                "balls_list": d.balls_list,
                "bonus_letter": d.bonus_letter,
                "prediction_json": d.prediction_json,
                "source": d.source
            }
            
            # add_draw helper handles setting document ID to draw_id
            add_draw_direct(draw_data)
            count += 1
            if count % 20 == 0:
                print(f"Migrated {count} draws...")
                
        print(f"Migration complete! {count} draws transferred to Firestore.")
        
    except Exception as e:
        print(f"Migration failed: {e}")
    finally:
        session.close()

if __name__ == "__main__":
    migrate()
