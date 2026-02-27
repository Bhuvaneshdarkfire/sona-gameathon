#!/usr/bin/env python3
"""
Runner Script — Sona Gameathon Evaluation
==========================================
This script is the entrypoint for the shared Docker container.
It imports the team's MyModel class, trains it on historical IPL data,
runs predictions on the test file, and writes results to submission.csv.

Mount points:
  /var/mymodelfile.py  — Team's model code (MyModel class)
  /var/test_file.csv   — Match data to predict on
  /var/submission.csv  — Output predictions (id, predicted_run)
  /var/logs.txt        — Error logs for debugging

Pre-loaded training data:
  /app/training_data/deliveries_updated_ipl_upto_2025.csv
    Columns: matchId, inning, over_ball, over, ball, batting_team, bowling_team,
             batsman, non_striker, bowler, batsman_runs, extras, isWide, isNoBall,
             Byes, LegByes, Penalty, dismissal_kind, player_dismissed, date
"""

import sys
import os
import traceback
import importlib.util
import pandas as pd

# Paths
MODEL_PATH = "/var/mymodelfile.py"
TEST_FILE = "/var/test_file.csv"
SUBMISSION_FILE = "/var/submission.csv"
LOGS_FILE = "/var/logs.txt"
TRAINING_DATA = "/app/training_data/deliveries_updated_ipl_upto_2025.csv"


def load_training_data():
    """Load pre-installed IPL deliveries dataset as a DataFrame."""
    if os.path.exists(TRAINING_DATA):
        return pd.read_csv(TRAINING_DATA)
    return None


def load_model():
    """Dynamically import team's MyModel class."""
    spec = importlib.util.spec_from_file_location("mymodelfile", MODEL_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)

    if not hasattr(module, "MyModel"):
        raise AttributeError(
            "mymodelfile.py must define a class named 'MyModel' "
            "with __init__(), fit(), and predict() methods."
        )
    return module.MyModel()


def main():
    logs = []
    try:
        # 1. Validate files exist
        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError(f"Model file not found: {MODEL_PATH}")
        if not os.path.exists(TEST_FILE):
            raise FileNotFoundError(f"Test file not found: {TEST_FILE}")

        # 2. Load training data
        deliveries_df = load_training_data()
        if deliveries_df is not None:
            logs.append(f"✅ Training data loaded: {len(deliveries_df)} deliveries.")
        else:
            logs.append("⚠️ No training data found. Proceeding without it.")

        # 3. Load team's model
        model = load_model()
        logs.append("✅ MyModel class loaded successfully.")

        # 4. Train the model
        model.fit(deliveries_df)
        logs.append("✅ Model training (fit) completed.")

        # 5. Load test data
        test_data = pd.read_csv(TEST_FILE)
        logs.append(f"✅ Test file loaded: {len(test_data)} rows.")

        # 6. Get predictions
        predictions = model.predict(test_data)
        logs.append("✅ Predictions generated.")

        # 7. Validate predictions format
        if isinstance(predictions, pd.DataFrame):
            if "id" not in predictions.columns or "predicted_run" not in predictions.columns:
                raise ValueError(
                    "predict() must return a DataFrame with columns: 'id', 'predicted_run'. "
                    f"Got columns: {list(predictions.columns)}"
                )
            submission = predictions[["id", "predicted_run"]].copy()
        elif isinstance(predictions, dict):
            submission = pd.DataFrame(predictions)
            if "id" not in submission.columns or "predicted_run" not in submission.columns:
                raise ValueError(
                    "predict() dict must have keys: 'id', 'predicted_run'. "
                    f"Got keys: {list(predictions.keys())}"
                )
        elif isinstance(predictions, list):
            submission = pd.DataFrame(predictions)
            if "id" not in submission.columns or "predicted_run" not in submission.columns:
                raise ValueError(
                    "predict() list items must have keys: 'id', 'predicted_run'. "
                    f"Got keys: {list(submission.columns)}"
                )
        else:
            raise TypeError(
                f"predict() must return a DataFrame, dict, or list of dicts. Got: {type(predictions).__name__}"
            )

        # Truncate floats to int
        submission["predicted_run"] = submission["predicted_run"].astype(int)

        # 8. Write submission
        submission.to_csv(SUBMISSION_FILE, index=False)
        logs.append(f"✅ Submission written: {len(submission)} predictions.")
        logs.append("🏏 Evaluation complete — SUCCESS")

    except Exception as e:
        error_msg = f"❌ ERROR: {str(e)}\n{traceback.format_exc()}"
        logs.append(error_msg)
        print(error_msg, file=sys.stderr)

        # Write empty submission on error
        try:
            pd.DataFrame(columns=["id", "predicted_run"]).to_csv(SUBMISSION_FILE, index=False)
        except:
            pass

    finally:
        # Write logs
        try:
            with open(LOGS_FILE, "w") as f:
                f.write("\n".join(logs))
        except:
            pass


if __name__ == "__main__":
    main()
