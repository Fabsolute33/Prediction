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
        db = SessionLocal()
        
        # Find all elements that might be the time
        # We saw they are simple text elements often.
        # Let's look for the main container first if possible?
        # The browser agent found '.bg-primary' for balls. Let's find those first?
        # Actually, let's look for the sets of balls.
        
        # Alternative: The "time" is a strong anchor.
        # <h3 ...> 13h </h3> or <span> 13h </span>
        # We will search for all text matching \d{1,2}h
        
        all_tags = soup.find_all(string=re.compile(r"^\d{1,2}h$"))
        
        seen_times = set()

        for time_tag in all_tags:
            time_str = time_tag.strip()
            if time_str in seen_times:
                continue
            seen_times.add(time_str)
            
            # Parent of the time text should be the anchor
            time_el = time_tag.parent
            
            # Find the balls container related to this time.
            # Usually it's in the same "card" or block.
            # We can walk up to a common container or look for next siblings.
            # Let's try to assume they are in a common parent div.
            
            # Go up 2-3 levels to find a container
            container = time_el.find_parent("div")
            if not container:
                continue
                
            # Search for balls in this container
            # Balls have class 'bg-primary' (numbers) and 'bg-secondary' (bonus)
            # Note: The agent found 'bg-primary rounded-full'.
            
            # We might need to go higher if the container is tight
            # Let's try a wider search from the time element
            
            # A safer heuristics: Look for the next list of balls in the HTML stream
            # but that risks mixing draws.
            
            # Let's try to find the balls within the close vicinity
            # The structure is likely:
            # <div>
            #    <div class="time">13h</div>
            #    <div class="results">
            #       <span class="bg-primary ...">1</span>
            #       ...
            #    </div>
            # </div>
            
            # So, finding specific classes in the parent seems correct.
            # Let's iterate up to 3 parents
            card = container
            balls = []
            bonus = None
            
            for _ in range(4):
                if not card: break
                
                found_balls = card.select(".bg-primary")
                if found_balls:
                    # Validate they look like numbers
                    current_balls = [b.get_text(strip=True) for b in found_balls if b.get_text(strip=True).isdigit()]
                    if len(current_balls) >= 5: # Expect 10 usually for Crescendo? Or 5? 
                        # Crescendo is 2 grids? No, it's 10 numbers?
                        # Agent said: "1, 3, 5, 12, 17, 19, 20, 22, 24, 25" -> 10 numbers.
                        balls = [int(x) for x in current_balls]
                        
                        # Find bonus
                        found_bonus = card.select(".bg-secondary")
                        if found_bonus:
                            bonus_text = found_bonus[0].get_text(strip=True)
                            if len(bonus_text) == 1 and bonus_text.isalpha():
                                bonus = bonus_text
                        
                        break # Found them
                
                card = card.parent
            
            if balls and bonus:
                # Parse time
                try:
                    hour = int(time_str.replace("h", ""))
                    draw_time = datetime.strptime(f"{hour}:00", "%H:%M").time()
                    
                    # Store in DB
                    exists = db.query(Draw).filter_by(date=scraped_date, time=draw_time).first()
                    if not exists:
                         # Calculate prediction for this draw (based on history UP TO this draw)
                         # Note: `calculate_prediction` uses the current DB state.
                         # Since we haven't inserted this draw yet, the DB contains draws 0..N-1.
                         # This is exactly what we want: prediction for draw N based on 0..N-1.
                         from engine import calculate_prediction
                         prediction = calculate_prediction() # No arguments = uses full DB history

                         # Generate ID: YYYYMMDDHH
                         # e.g. 2025122713
                         id_str = f"{scraped_date.strftime('%Y%m%d')}{hour:02d}"
                         
                         new_draw = Draw(
                             draw_id=int(id_str), 
                             date=scraped_date,
                             time=draw_time,
                             balls_list=balls,
                             bonus_letter=bonus,
                             prediction_json=prediction,
                             source='scrape'
                         )
                         db.add(new_draw)
                         latest_added = True
                         print(f"New draw added: {scraped_date} {draw_time} with prediction")
                    
                    elif exists.source == 'ai_pending':
                         # It was a pending prediction! Now we have the result.
                         # We UPDATE it.
                         exists.balls_list = balls
                         exists.bonus_letter = bonus
                         exists.source = 'scrape'
                         # We KEEP the original prediction_json to see if AI was right!
                         
                         latest_added = True
                         print(f"Updated pending draw: {scraped_date} {draw_time}")
                    
                except Exception as e:
                    print(f"Error processing draw {time_str}: {e}")
                    continue

        if latest_added:
            db.commit()
        db.close()
        
        return latest_added

    except Exception as e:
        print(f"Scraper Error: {e}")
        return False

if __name__ == "__main__":
    fetch_and_store_latest()
