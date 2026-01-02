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

class AlgorithmConfiguration(Base):
    __tablename__ = 'algo_config'

    id = Column(Integer, primary_key=True, autoincrement=True)
    active = Column(Integer, default=1) # 1 if this is the currently used config
    
    # Formula Parameters
    freq_weight = Column(String) # Stored as float but String for precision if needed? No, Float is fine. Let's use Float or just generic JSON to be flexible? 
    # Let's be explicit for now as the formula is specific.
    # Actually, to allow "evolution of the formula" (structure), JSON might be better. 
    # But for now, let's stick to tuning the weights of the *existing* formula as step 1.
    freq_weight = Column(String, default="0.4") 
    gap_weight = Column(String, default="0.5")
    decay_rate = Column(String, default="0.15") 
    window_size = Column(Integer, default=20)
    
    updated_at = Column(Date)
    notes = Column(String) # "Proposed by Expert Agent"

# Database URL
DATABASE_URL = "sqlite:///./crescendo.db"

# Create Engine
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

# Session Local
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    Base.metadata.create_all(bind=engine)
