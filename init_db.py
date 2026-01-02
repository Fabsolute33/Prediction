import csv
import json
from datetime import datetime
from sqlalchemy.orm import Session
from models import SessionLocal, Draw, init_db

CSV_FILE = "crescendo_202511.csv"

def parse_date(date_str):
    try:
        return datetime.strptime(date_str, "%d/%m/%Y").date()
    except ValueError:
        return None

def parse_time(time_str):
    try:
        return datetime.strptime(time_str, "%H:%M:%S").time()
    except ValueError:
        return None

def seed_database():
    db: Session = SessionLocal()
    
    # Check if DB is already populated
    if db.query(Draw).first():
        print("Database already contains data. Skipping seed.")
        db.close()
        return

    print(f"Seeding database from {CSV_FILE}...")
    
    try:
        with open(CSV_FILE, mode='r', encoding='utf-8') as f:
            reader = csv.reader(f, delimiter=';')
            # Assuming no header or skipping based on inspection. 
            # If the output showed a header, I'd skip it. 
            # The output '25364;27/12/2025...' effectively looks like data.
            # I will check if the first row is a header in a real scenario, 
            # but here I'll try to parse and if it fails, assume it was a header.
            
            count = 0
            for row in reader:
                if not row:
                    continue
                
                try:
                    # Index mapping based on observation:
                    # 0: ID, 1: Date, 2: Time
                    # 4-13: Balls (10 items)
                    # 14: Bonus Letter
                    
                    draw_id = int(row[0])
                    date_obj = parse_date(row[1])
                    time_obj = parse_time(row[2])
                    
                    if not date_obj or not time_obj:
                        continue

                    balls = []
                    for i in range(4, 14):
                         balls.append(int(row[i]))
                    
                    bonus_letter = row[14]

                    draw = Draw(
                        draw_id=draw_id,
                        date=date_obj,
                        time=time_obj,
                        balls_list=balls, # SQLAlchemy JSON type handles list automatically
                        bonus_letter=bonus_letter,
                        source='csv'
                    )
                    db.add(draw)
                    count += 1
                    
                    if count % 1000 == 0:
                        print(f"Processed {count} rows...")

                except (ValueError, IndexError) as e:
                    # Likely a header row or malformed line
                    print(f"Skipping row due to error: {e} | Row: {row[:5]}...")
                    continue
            
            db.commit()
            print(f"Successfully seeded {count} draws.")

    except FileNotFoundError:
        print(f"Error: {CSV_FILE} not found.")
    except Exception as e:
        print(f"An error occurred: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    init_db() # Create tables
    seed_database() # Seed data
