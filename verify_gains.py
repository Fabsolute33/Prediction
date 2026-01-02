import requests

def verify():
    try:
        response = requests.get("http://localhost:8001/history?limit=5")
        if response.status_code != 200:
            print(f"Failed to fetch history: {response.status_code}")
            return
            
        data = response.json()
        print(f"Fetched {len(data)} draws.")
        
        for draw in data:
            pred = draw.get('prediction', {})
            gain = draw.get('gain', 0)
            matches = draw.get('matches_count', 0)
            
            print(f"Draw #{draw['draw_id']}: Matches={matches}, Gain={gain}, Pred={pred.get('numbers')}")
            
            if pred and 'numbers' in pred:
                # Basic sanity check
                if matches > 5 and gain == 0:
                     print("WARNING: Matches > 5 but Gain is 0 (Check Letter logic)")
                if gain > 0:
                    print("SUCCESS: Gain calculated correctly.")
                    
    except Exception as e:
        print(f"Verification failed: {e}")

if __name__ == "__main__":
    verify()
