from pydantic import BaseModel
from typing import List, Optional, Any
from datetime import date, time, datetime

# Remove SQLAlchemy dependencies
# from sqlalchemy import create_engine, Column, Integer, String, Date, Time, JSON
# from sqlalchemy.ext.declarative import declarative_base
# from sqlalchemy.orm import sessionmaker

# Base = declarative_base()

class Draw(BaseModel):
    id: Optional[str] = None # Firestore ID is string
    draw_id: Optional[int] = None
    date: Optional[Any] = None # Allow date or string
    time: Optional[Any] = None # Allow time or string
    balls_list: List[int] = []
    bonus_letter: Optional[str] = None
    prediction_json: Optional[Any] = None
    source: Optional[str] = None

    class Config:
        orm_mode = True

class AlgorithmConfiguration(BaseModel):
    id: Optional[str] = None
    active: int = 1
    freq_weight: str = "0.4"
    gap_weight: str = "0.5"
    decay_rate: str = "0.15"
    window_size: int = 20
    updated_at: Optional[Any] = None
    notes: Optional[str] = None

# Mock SessionLoca/init_db for compatibility during transition (functions that do nothing)
def init_db():
    print("DB Init skipped (Firestore mode)")

SessionLocal = None # Should not be used anymore
