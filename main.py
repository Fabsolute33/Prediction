from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from models import SessionLocal, Draw, init_db
from scheduler import start_scheduler
from engine import calculate_prediction
from typing import List, Optional
from pydantic import BaseModel
import uvicorn
import datetime

# --- Pydantic Schemas ---
class DrawResponse(BaseModel):
    id: int
    draw_id: int
    date: datetime.date
    time: datetime.time
    balls_list: List[int]
    bonus_letter: str
    source: str
    prediction: Optional[dict] = None
    gain: Optional[float] = 0.0
    matches_count: Optional[int] = 0

    class Config:
        orm_mode = True

class PredictionResponse(BaseModel):
    numbers: List[int]
    letter: str
    confidence: float
    details: List[dict]

class StatusResponse(BaseModel):
    status: str
    timestamp: datetime.datetime

# --- Dependencies ---
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Helpers ---
def calculate_gain(draw_balls: List[int], draw_letter: str, pred_balls: List[int], pred_letter: str) -> float:
    if not pred_balls:
        return 0.0
        
    # Count matches
    matches = len(set(draw_balls) & set(pred_balls))
    letter_match = (draw_letter == pred_letter)
    
    gain = 0.0
    
    if matches == 10:
        # Jackpot - technically shared, but let's put min value or just a huge number
        gain = 100000.0 
    elif matches == 9:
        gain = 500.0
    elif matches == 8:
        gain = 50.0
    elif matches == 7:
        gain = 7.0
    elif matches == 6:
        gain = 1.0
    elif matches <= 5 and letter_match:
        gain = 1.0 # Refund
    else:
        gain = 0.0
        
    if letter_match and matches >= 6 and matches < 10:
        gain *= 2
        
    return gain

# --- App ---
app = FastAPI(title="Crescendo Prophet", version="1.0.0")

# CORS (Allow Frontend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In prod, specify React app URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    init_db() # Ensure DB exists
    start_scheduler() # Start the generic scraper loop

@app.get("/status", response_model=StatusResponse)
def get_status():
    return {
        "status": "online",
        "timestamp": datetime.datetime.now()
    }

@app.get("/predict", response_model=PredictionResponse)
def get_prediction():
    """
    Returns the latest prediction based on current DB state.
    """
    try:
        # Prediction logic is stateless/dynamic based on DB
        prediction = calculate_prediction()
        return prediction
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/history", response_model=List[DrawResponse])
def get_history(limit: int = 50, db: Session = Depends(get_db)):
    """
    Returns the latest historical draws with gains.
    """
    draws = db.query(Draw).order_by(Draw.date.desc(), Draw.time.desc()).limit(limit).all()
    
    response_data = []
    for d in draws:
        pred = d.prediction_json or {}
        pred_numbers = pred.get("numbers", [])
        pred_letter = pred.get("letter", "")
        
        matches_count = len(set(d.balls_list) & set(pred_numbers)) if pred_numbers else 0
        gain = calculate_gain(d.balls_list, d.bonus_letter, pred_numbers, pred_letter)
        
        # We start constructing the response dict manually or assume Pydantic handles the property mapping 
        # but since 'gain' and 'prediction' are not columns on the model (prediction_json is), 
        # we might need to map them explicitly if we rely on orm_mode for the base fields.
        # However, since we added 'prediction' (mapped to prediction_json maybe?) and 'gain' to Schema,
        # we can just return a list of dicts or objects that satisfy the schema.
        
        # Simplest way: Convert to dict and update
        d_dict = d.__dict__.copy()
        d_dict['prediction'] = pred
        d_dict['gain'] = gain
        d_dict['matches_count'] = matches_count
        response_data.append(d_dict)
        
    return response_data

class RefreshResponse(BaseModel):
    status: str
    message: str
    updated: bool

@app.post("/refresh", response_model=RefreshResponse)
def refresh_data(db: Session = Depends(get_db)):
    """
    Manually triggers a scraper run.
    Returns the update status and a message for the user.
    """
    from scraper import fetch_and_store_latest
    
    try:
        updated = fetch_and_store_latest()
        
        # Calculate message
        # Drawings are hourly from 13h to 19h (approx)
        now = datetime.datetime.now()
        
        # Logic to determine "next draw" time for the message
        # If updated=True, we have a new prediction for the NEXT draw.
        # If updated=False, we already have the latest.
        
        # Simple heuristic for "next draw":
        # If now is < 13:00, next is 13:00
        # If now is >= 19:00, next is tomorrow 13:00? (Or just say "Demain")
        # Else next is next hour.
        
        # Note: server time might be different from user time (UTC vs Paris), 
        # but user prompt says "13h à 19h". Let's assume server is roughly local or we just use relative logic.
        
        msg = ""
        if updated:
             msg = "Nouvelle prédiction générée avec succès !"
        else:
            # Determine next draw hour
            current_hour = now.hour
            next_hour = current_hour + 1
            
            if current_hour < 13:
                next_draw_time_str = "13h00"
            elif current_hour >= 19:
                 next_draw_time_str = "demain 13h00"
            else:
                 next_draw_time_str = f"{next_hour}h00"
            
            msg = f"Il s'agit de la bonne prédiction pour le prochain tirage de {next_draw_time_str}."

        return {
            "status": "updated" if updated else "current",
            "message": msg,
            "updated": updated
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Refresh failed: {str(e)}")


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
