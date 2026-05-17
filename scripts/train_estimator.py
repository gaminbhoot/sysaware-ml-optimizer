import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import LeaveOneGroupOut
from sklearn.metrics import mean_absolute_error
import joblib
import os

def train():
    csv_path = "data/benchmarks_augmented.csv"
    if not os.path.exists(csv_path):
        print(f"Error: {csv_path} not found")
        return

    df = pd.read_csv(csv_path)
    
    # Feature columns
    features = ['memory_bandwidth_gbps', 'vram_gb', 'model_size_gb', 'quant_bits']
    target = 'tok_s'
    
    # Path A: In-VRAM (is_ram_spill == 0)
    df_invram = df[df['is_ram_spill'] == 0].copy()
    
    def train_and_evaluate(data, name):
        if len(data) < 5:
            print(f"Not enough data for {name} regressor. Skipping.")
            return None
        
        X = data[features]
        y = data[target]
        groups = data['gpu_model']
        
        logo = LeaveOneGroupOut()
        maes = []
        
        print(f"Training {name} Regressor (RandomForest, Logo CV)...")
        for train_idx, test_idx in logo.split(X, y, groups):
            X_train, X_test = X.iloc[train_idx], X.iloc[test_idx]
            y_train, y_test = y.iloc[train_idx], y.iloc[test_idx]
            
            model = RandomForestRegressor(n_estimators=100, max_depth=5, random_state=42)
            model.fit(X_train, y_train)
            preds = model.predict(X_test)
            maes.append(mean_absolute_error(y_test, preds))
        
        avg_mae = np.mean(maes)
        print(f"{name} Regressor Average MAE: {avg_mae:.2f} tok/s")
        
        # Train final model on all data
        final_model = RandomForestRegressor(n_estimators=100, max_depth=5, random_state=42)
        final_model.fit(X, y)
        
        model_path = f"data/estimator_{name.lower()}.joblib"
        joblib.dump(final_model, model_path)
        print(f"Final {name} model saved to {model_path}")
        return avg_mae

    mae_invram = train_and_evaluate(df_invram, "InVRAM")
    
    # Metadata
    metadata = {
        "features": features,
        "maes": {
            "invram": mae_invram
        }
    }
    joblib.dump(metadata, "data/estimator_metadata.joblib")

if __name__ == "__main__":
    train()
