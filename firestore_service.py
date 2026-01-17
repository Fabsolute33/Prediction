import os
import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime
from models import Draw
from typing import List, Optional

# Initialize Firestore
try:
    if not firebase_admin._apps:
        app = firebase_admin.initialize_app()
    db = firestore.client()
    print("Firestore initialized successfully.")
except Exception as e:
    print(f"Warning: Firestore init failed: {e}")
    db = None

COLLECTION_DRAWS = "draws"
COLLECTION_CONFIG = "config"

def get_db():
    return db

def get_active_config():
    """Returns the active algorithm configuration dict or default."""
    if not db: return {"freq_weight": 0.4, "gap_weight": 0.5, "decay_rate": 0.15}
    try:
        # Assuming single config document 'current' or filtering by active
        doc_ref = db.collection(COLLECTION_CONFIG).document('current')
        doc = doc_ref.get()
        if doc.exists:
             d = doc.to_dict()
             return {
                 "freq_weight": float(d.get("freq_weight", 0.4)),
                 "gap_weight": float(d.get("gap_weight", 0.5)),
                 "decay_rate": float(d.get("decay_rate", 0.15))
             }
        return {"freq_weight": 0.4, "gap_weight": 0.5, "decay_rate": 0.15}
    except Exception as e:
        print(f"Error fetching config: {e}")
        return {"freq_weight": 0.4, "gap_weight": 0.5, "decay_rate": 0.15}

def set_active_config(params: dict, notes: str = None):
    """Updates the active configuration."""
    if not db: return
    try:
        data = params.copy()
        data['updated_at'] = datetime.now().isoformat()
        if notes:
            data['notes'] = notes
        db.collection(COLLECTION_CONFIG).document('current').set(data, merge=True)
    except Exception as e:
        print(f"Error setting config: {e}")

def get_all_draws_sorted() -> List[Draw]:
    """Returns all draws sorted by date and time ascending."""
    if not db: return []
    try:
        docs = db.collection(COLLECTION_DRAWS).order_by("date").order_by("time").stream()
        draws = []
        for doc in docs:
            d = doc.to_dict()
            d['id'] = doc.id
            draws.append(Draw(**d))
        return draws
    except Exception as e:
        print(f"Error fetching draws: {e}")
        return []

def get_latest_draw() -> Optional[Draw]:
    """Returns the single latest draw as an Object."""
    if not db: return None
    try:
        query = db.collection(COLLECTION_DRAWS).order_by("date", direction=firestore.Query.DESCENDING).order_by("time", direction=firestore.Query.DESCENDING).limit(1)
        docs = list(query.stream())
        if docs:
            d = docs[0].to_dict()
            d['id'] = docs[0].id
            return Draw(**d)
        return None
    except Exception as e:
        print(f"Error fetching latest draw: {e}")
        return None

def get_draw_by_date_time(draw_date, draw_time) -> Optional[Draw]:
    """Returns a Draw object if found, else None."""
    if not db: return None
    try:
        query = db.collection(COLLECTION_DRAWS).where("date", "==", draw_date).where("time", "==", draw_time).limit(1)
        docs = list(query.stream())
        if docs:
            d = docs[0].to_dict()
            d['id'] = docs[0].id
            return Draw(**d)
        return None
    except Exception as e:
        print(f"Error fetching draw by date/time: {e}")
        return None

def add_draw(draw_data: dict):
    """Adds a new draw. Returns the DocumentReference."""
    if not db: return None
    try:
        doc_id = str(draw_data.get('draw_id')) if draw_data.get('draw_id') else None
        
        if doc_id:
            doc_ref = db.collection(COLLECTION_DRAWS).document(doc_id)
            doc_ref.set(draw_data)
        else:
            doc_ref = db.collection(COLLECTION_DRAWS).add(draw_data)[1]
        return doc_ref
    except Exception as e:
        print(f"Error adding draw: {e}")
        return None

def update_draw(draw_id, update_data: dict):
    if not db: return
    try:
        db.collection(COLLECTION_DRAWS).document(str(draw_id)).update(update_data)
    except Exception as e:
        print(f"Error updating draw {draw_id}: {e}")

def get_draw_count():
    if not db: return 0
    try:
        return len(list(db.collection(COLLECTION_DRAWS).stream()))
    except:
        return 0
