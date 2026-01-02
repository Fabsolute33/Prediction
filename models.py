from sqlalchemy import create_engine, Column, Integer, String, Date, Time, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

Base = declarative_base()

class Draw(Base):
    __tablename__ = 'draws'

    id = Column(Integer, primary_key=True, autoincrement=True)
    draw_id = Column(Integer, unique=True, index=True) # Official ID from FDJ/CSV
    date = Column(Date, index=True)
    time = Column(Time)
    balls_list = Column(JSON) # Stored as a list of integers
    bonus_letter = Column(String)
    prediction_json = Column(JSON, nullable=True) # Stored as {numbers: [], letter: X}
    source = Column(String) # 'csv' or 'scrape'

# Database URL
DATABASE_URL = "sqlite:///./crescendo.db"

# Create Engine
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

# Session Local
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    Base.metadata.create_all(bind=engine)
