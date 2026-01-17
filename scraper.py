import requests
from bs4 import BeautifulSoup
from datetime import datetime
from models import SessionLocal, Draw
from sqlalchemy.exc import IntegrityError

# Placeholder URL - User might need to update selector/URL if FDJ changes layout.
# Using a generic structure common in scraping examples or the official visible URL.
URL = "https://www.fdj.fr/jeux-de-tirage/crescendo/resultats" 

# Fallback headers to mimic browser
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
}

def fetch_and_store_latest() -> bool:
    """
    Scrapes the results page.
    Returns True if a new draw was added, False otherwise.
    """
    print(f"Scraping {URL}...")
    try:
        response = requests.get(URL, headers=HEADERS, timeout=10)
        if response.status_code != 200:
            print(f"Failed to fetch page: {response.status_code}")
            return False
            
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # --- SELECTORS BASED ON INSPECTION ---
        # 1. Date: In an <h2> tag, e.g., "Tirages du samedi 27 décembre 2025"
        date_header = soup.find('h2', string=lambda t: t and "Tirages du" in t)
        if not date_header:
            print("Warning: Could not find date header (h2 with 'Tirages du').")
            return False
            
        date_text = date_header.get_text(strip=True).replace("Tirages du ", "")
        # Parse date: "samedi 27 décembre 2025" -> yyyy-mm-dd
        # French locale parsing might be tricky without locale installed, so we map manually
        months = {
            "janvier": 1, "février": 2, "mars": 3, "avril": 4, "mai": 5, "juin": 6,
            "juillet": 7, "août": 8, "septembre": 9, "octobre": 10, "novembre": 11, "décembre": 12
        }
        
        try:
            parts = date_text.lower().split()
            # expected: [day_name, day_num, month_name, year]
            # e.g. ["samedi", "27", "décembre", "2025"]
            if len(parts) >= 4:
                day = int(parts[1])
                month = months.get(parts[2], 1)
                year = int(parts[3])
                scraped_date = datetime(year, month, day).date()
            else:
                 print(f"Date parsing failed for: {date_text}")
                 return False
        except Exception as e:
            print(f"Date parsing error: {e}")
            return False

        # 2. Find Draws
        # The structure groups results. We look for time indicators (e.g. "13h", "19h")
        # and then clean up the numbers nearby.
        
        # We start by finding all elements that look like a time "XXh"
        # and associate them with their result balls.
        
        # In the DOM, results seem to be in blocks. 
        # Strategy: Find the container. Usually "result-group" or similar.
        # But based on inspection, we can iterate over potential time elements.
        
        import re
        
        latest_added = False
        
        # Find all elements that might be the time
        all_tags = soup.find_all(string=re.compile(r"^\d{1,2}h$"))
        seen_times = set()

        from firestore_service import get_draw_by_date_time, add_draw, update_draw

        for time_tag in all_tags:
            time_str = time_tag.strip()
            if time_str in seen_times:
                continue
            seen_times.add(time_str)
            
            time_el = time_tag.parent
            container = time_el.find_parent("div")
            if not container:
                continue
            
            card = container
            balls = []
            bonus = None
            
            for _ in range(4):
                if not card: break
                found_balls = card.select(".bg-primary")
                if found_balls:
                    current_balls = [b.get_text(strip=True) for b in found_balls if b.get_text(strip=True).isdigit()]
                    if len(current_balls) >= 5: 
                        balls = [int(x) for x in current_balls]
                        found_bonus = card.select(".bg-secondary")
                        if found_bonus:
                            bonus_text = found_bonus[0].get_text(strip=True)
                            if len(bonus_text) == 1 and bonus_text.isalpha():
                                bonus = bonus_text
                        break 
                card = card.parent
            
            if balls and bonus:
                try:
                    hour = int(time_str.replace("h", ""))
                    # Create datetime objects (native Python objects work with Firestore)
                    draw_time = datetime.strptime(f"{hour}:00", "%H:%M").time()
                    
                    # Store variables for query. 
                    # Note: Firestore saves time as String or Timestamp? 
                    # We will save as native objects.
                    # HOWEVER, when querying, we must match the type.
                    # Since we are saving native, we query native.
                    
                    # We need datetime.datetime for date usually in Firestore or it becomes Timestamp.
                    # Let's convert date to datetime (midnight) if needed. 
                    # But Python 'date' object is supported by google-cloud-firestore (stored as string or timestamp map?).
                    # Actually, better to store as ISO string for maximum compatibility if not sure.
                    # But let's try native first as it is cleaner.
                    
                    # Check existence
                    exists = get_draw_by_date_time(str(scraped_date), str(draw_time)) # Using string for safe query/storage?
                    # Wait, if I save native 'date', querying with 'string' will fail.
                    # To be super safe and easy: Store ISO strings for date/time.
                    
                    s_date = scraped_date.isoformat()
                    s_time = draw_time.strftime("%H:%M:%S")
                    
                    exists = get_draw_by_date_time(s_date, s_time)
                    
                    if not exists:
                         from engine import calculate_prediction as calc_stat
                         from matrix_engine import calculate_matrix_prediction as calc_algo
                         
                         prediction = {
                             "statistical": calc_stat(),
                             "algorithmic": calc_algo()
                         }

                         id_str = f"{scraped_date.strftime('%Y%m%d')}{hour:02d}"
                         
                         new_draw_data = {
                             "draw_id": int(id_str), 
                             "date": s_date, # Storing as String
                             "time": s_time, # Storing as String
                             "balls_list": balls,
                             "bonus_letter": bonus,
                             "prediction_json": prediction,
                             "source": 'scrape'
                         }
                         
                         add_draw(new_draw_data)
                         latest_added = True
                         print(f"New draw added: {s_date} {s_time} with prediction")
                    
                    elif exists.source == 'ai_pending':
                         # Update pending
                         update_data = {
                             "balls_list": balls,
                             "bonus_letter": bonus,
                             "source": 'scrape'
                         }
                         update_draw(exists.id, update_data) # exists.id is the document ID
                         
                         latest_added = True
                         print(f"Updated pending draw: {s_date} {s_time}")
                    
                except Exception as e:
                    print(f"Error processing draw {time_str}: {e}")
                    continue

        if latest_added:
            from matrix_engine import build_matrices
            print("Triggering Matrix Engine Recalculation...")
            build_matrices()
        
        return latest_added

    except Exception as e:
        print(f"Scraper Error: {e}")
        return False

if __name__ == "__main__":
    fetch_and_store_latest()
