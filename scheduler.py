from apscheduler.schedulers.background import BackgroundScheduler
from scraper import fetch_and_store_latest
import time
import atexit

def start_scheduler():
    scheduler = BackgroundScheduler()
    # Run scraper every 1 minute
    scheduler.add_job(lambda: fetch_and_store_latest(), 'interval', minutes=1)
    scheduler.start()
    
    # Shut down the scheduler when exiting the app
    atexit.register(lambda: scheduler.shutdown())
    print("Scheduler started. Scraper will run every 1 minute.")

if __name__ == "__main__":
    # Test run
    start_scheduler()
    try:
        # Keep alive to test
        while True:
            time.sleep(2)
    except (KeyboardInterrupt, SystemExit):
        pass
