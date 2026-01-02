import pandas as pd
import math
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from models import SessionLocal, AlgorithmConfiguration, Draw, engine as db_engine
from engine import get_all_draws_as_dataframe, calculate_prediction

class ExpertMathAgent:
    def __init__(self):
        self.db_session = SessionLocal()

    def get_current_config(self) -> Dict[str, float]:
        config = self.db_session.query(AlgorithmConfiguration).filter_by(active=1).first()
        if config:
            return {
                "freq_weight": float(config.freq_weight),
                "gap_weight": float(config.gap_weight),
                "decay_rate": float(config.decay_rate)
            }
        return {"freq_weight": 0.4, "gap_weight": 0.5, "decay_rate": 0.15}

    def backtest(self, params: Dict[str, float], history: pd.DataFrame, window_size: int = 20) -> float:
        """
        Run a simulation: For the last N draws in `history`, 
        predict using `params` based on data AVAILABLE AT THAT TIME.
        Return accuracy score.
        """
        draws_to_test = history.tail(window_size)
        hits = 0
        total_predictions = 0

        # Iterate through the test window
        # We need at least 20 draws prior to the test draw to calculate stats effectively
        min_required_history = 20
        
        # We need indices to slice the dataframe
        test_indices = list(range(len(history) - window_size, len(history)))
        
        for idx in test_indices:
            if idx < min_required_history:
                continue
                
            # Data available before this draw
            past_data = history.iloc[:idx]
            actual_draw = history.iloc[idx]
            
            # Predict
            prediction = calculate_prediction(df_override=past_data, config_override=params)
            predicted_numbers = set(prediction['numbers'][:5]) # Verify Top 5
            actual_numbers = set(actual_draw['balls'])
            
            # Count common numbers (simple hit rate)
            # Or use full gain logic? Let's stick to "numbers found" for optimization
            common = predicted_numbers.intersection(actual_numbers)
            hits += len(common)
            total_predictions += 5 # We predict 5 numbers
            
        if total_predictions == 0:
            return 0.0
            
        return hits / total_predictions

    def analyze_current_performance(self) -> Dict[str, Any]:
        """
        Analyze how the current active formula is performing.
        """
        df = get_all_draws_as_dataframe(self.db_session)
        if df.empty:
            return {"status": "No data"}
            
        current_params = self.get_current_config()
        score = self.backtest(current_params, df, window_size=50) # Analyze last 50 draws
        
        return {
            "current_params": current_params,
            "accuracy_last_50": score,
            "message": f"Accuracy on last 50 draws: {score:.2%}"
        }

    def evolve_formula(self) -> Dict[str, Any]:
        """
        Search for parameters that improve the score.
        """
        df = get_all_draws_as_dataframe(self.db_session)
        if len(df) < 50:
            return {"status": "Not enough data to evolve"}

        current_accuracy = self.analyze_current_performance()["accuracy_last_50"]
        best_accuracy = current_accuracy
        best_params = self.get_current_config()
        
        # Grid Search ranges
        # Freq: 0.1 -> 0.9, step 0.2
        # Gap: 0.1 -> 0.9, step 0.2
        # Decay: 0.05 -> 0.3, step 0.05
        
        # Simplified Search Space for speed
        freq_grid = [0.2, 0.4, 0.6, 0.8]
        gap_grid = [0.2, 0.5, 0.8]
        decay_grid = [0.1, 0.15, 0.2]
        
        proposals = []
        
        for f in freq_grid:
            for g in gap_grid:
                for d in decay_grid:
                    params = {"freq_weight": f, "gap_weight": g, "decay_rate": d}
                    score = self.backtest(params, df, window_size=50)
                    
                    if score > best_accuracy:
                        best_accuracy = score
                        best_params = params
                        proposals.append({
                            "params": params,
                            "accuracy": score
                        })
        
        if best_accuracy > current_accuracy:
             improvement = (best_accuracy - current_accuracy) / current_accuracy if current_accuracy > 0 else 0
             return {
                 "found_better": True,
                 "current_accuracy": current_accuracy,
                 "best_accuracy": best_accuracy,
                 "improvement": f"{improvement:.1%}",
                 "proposed_params": best_params,
                 "message": f"Found improved parameters! Accuracy increased from {current_accuracy:.2%} to {best_accuracy:.2%}."
             }
        else:
             return {
                 "found_better": False,
                 "message": "Current parameters are optimal within the search space."
             }

    def apply_new_parameters(self, params: Dict[str, float], notes="Applied by Expert Agent"):
        # Deactivate old
        self.db_session.query(AlgorithmConfiguration).update({AlgorithmConfiguration.active: 0})
        
        # Insert new
        new_config = AlgorithmConfiguration(
            active=1,
            freq_weight=str(params["freq_weight"]),
            gap_weight=str(params["gap_weight"]),
            decay_rate=str(params["decay_rate"]),
            notes=notes,
            updated_at=pd.Timestamp.now().date()
        )
        self.db_session.add(new_config)
        self.db_session.commit()
        return {"status": "updated", "config": params}

if __name__ == "__main__":
    agent = ExpertMathAgent()
    print("Current Performance:", agent.analyze_current_performance())
    print("Evolution:", agent.evolve_formula())
