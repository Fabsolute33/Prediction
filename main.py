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
    # letter: str # Removed as per user request
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
def calculate_gain(draw_balls: List[int], pred_balls: List[int]) -> float:
    if not pred_balls:
        return 0.0
        
    # Count matches
    matches = len(set(draw_balls) & set(pred_balls))
    
    gain = 0.0
    
    if matches == 10:
        # Jackpot
        gain = 100000.0 
    elif matches == 9:
        gain = 500.0
    elif matches == 8:
        gain = 50.0
    elif matches == 7:
        gain = 7.0
    elif matches == 6:
        gain = 1.0
    else:
        gain = 0.0
        
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

@app.get("/stats")
def get_stats():
    """
    Returns comprehensive statistics for the dashboard.
    """
    try:
        from engine import get_comprehensive_stats
        stats = get_comprehensive_stats()
        return stats
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
        gain = calculate_gain(d.balls_list, pred_numbers)
        
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


# --- Expert Agent Models ---
class AgentAnalysisResponse(BaseModel):
    current_params: dict
    accuracy_last_50: float
    message: str

class EvolutionResponse(BaseModel):
    found_better: bool
    current_accuracy: Optional[float] = None
    best_accuracy: Optional[float] = None
    improvement: Optional[str] = None
    proposed_params: Optional[dict] = None
    message: str

class ConfigRequest(BaseModel):
    freq_weight: float
    gap_weight: float
    decay_rate: float

@app.get("/expert/analysis", response_model=AgentAnalysisResponse)
def get_expert_analysis():
    """
    Get the Expert Agent's analysis of the current configuration.
    """
    from expert_agent import ExpertMathAgent
    agent = ExpertMathAgent()
    return agent.analyze_current_performance()

@app.post("/expert/optimize", response_model=EvolutionResponse)
def run_optimization():
    """
    Ask the Expert Agent to study successive draws and propose an evolution of the formula.
    """
    from expert_agent import ExpertMathAgent
    agent = ExpertMathAgent()
    return agent.evolve_formula()

@app.post("/expert/apply")
def apply_config(config: ConfigRequest):
    """
    Apply a new configuration proposed by the Agent.
    """
    from expert_agent import ExpertMathAgent
    agent = ExpertMathAgent()
    result = agent.apply_new_parameters(config.dict())
    return result

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
