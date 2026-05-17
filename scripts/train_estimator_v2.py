import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import LeaveOneGroupOut
from sklearn.metrics import mean_absolute_error
import joblib
import os

def train():
    csv_path = "data/benchmarks_augmented_v2.csv"
    if not os.path.exists(csv_path):
        print(f"Error: {csv_path} not found")
        return

    df = pd.read_csv(csv_path)
    
    # Feature columns (Updated with is_apple)
    features = ['memory_bandwidth_gbps', 'vram_gb', 'model_size_gb', 'quant_bits', 'is_apple']
    target = 'tok_s'
    
    # Split into InVRAM and RAMSpill
    df_invram = df[df['is_ram_spill'] == 0].copy()
    df_spill = df[df['is_ram_spill'] == 1].copy()
    
    def train_and_evaluate(data, name):
        if len(data) < 3: # Lowered limit as community data is sparse for some clusters
            print(f"Not enough data for {name} regressor ({len(data)} rows). Skipping.")
            return None
        
        X = data[features]
        y = data[target]
        groups = data['gpu_model']
        
        # If we have very few groups, LOGO might fail or be unstable. 
        # But for community data, we usually have multiple GPUs.
        logo = LeaveOneGroupOut()
        maes = []
        
        print(f"Training {name} Regressor ({len(data)} samples, {len(groups.unique())} GPUs)...")
        
        # Check if we have at least 2 groups for cross-validation
        if len(groups.unique()) < 2:
            print(f"Only one GPU model type in {name} dataset. Training on all data without CV.")
            model = RandomForestRegressor(n_estimators=100, max_depth=5, random_state=42)
            model.fit(X, y)
            avg_mae = 0.0 # Unknown
        else:
            for train_idx, test_idx in logo.split(X, y, groups):
                X_train, X_test = X.iloc[train_idx], X.iloc[test_idx]
                y_train, y_test = y.iloc[train_idx], y.iloc[test_idx]
                
                model = RandomForestRegressor(n_estimators=100, max_depth=5, random_state=42)
                model.fit(X_train, y_train)
                preds = model.predict(X_test)
                maes.append(mean_absolute_error(y_test, preds))
            avg_mae = np.mean(maes)
        
        print(f"{name} Regressor Average MAE: {avg_mae:.2f} tok/s")
        
        # Final model
        final_model = RandomForestRegressor(n_estimators=200, max_depth=7, random_state=42)
        final_model.fit(X, y)
        
        model_path = f"data/estimator_{name.lower()}.joblib"
        joblib.dump(final_model, model_path)
        print(f"Final {name} model saved to {model_path}")
        return avg_mae

    mae_invram = train_and_evaluate(df_invram, "InVRAM")
    mae_spill = train_and_evaluate(df_spill, "RAMSpill")
    
    # Metadata
    metadata = {
        "features": features,
        "maes": {
            "invram": mae_invram,
            "spill": mae_spill
        },
        "training_rows": len(df)
    }
    joblib.dump(metadata, "data/estimator_metadata.joblib")
    print("Training complete. Metadata saved.")

if __name__ == "__main__":
    train()
