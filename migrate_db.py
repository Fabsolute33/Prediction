import sqlite3

DB_PATH = "crescendo.db"

def migrate():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Check if column exists
    cursor.execute("PRAGMA table_info(draws)")
    columns = [info[1] for info in cursor.fetchall()]
    
    if "prediction_json" not in columns:
        print("Migrating: Adding prediction_json column...")
        try:
            cursor.execute("ALTER TABLE draws ADD COLUMN prediction_json JSON")
            conn.commit()
            print("Migration successful.")
        except Exception as e:
            print(f"Migration failed: {e}")
    else:
        print("Column prediction_json already exists.")
        
    conn.close()

if __name__ == "__main__":
    migrate()
