#!/usr/bin/env python3
"""
Sample Prediction Model — Test Version
Minimal demo that reads /data/input.json and outputs predicted innings scores.

Contract:
  Input:  /data/input.json  (mounted read-only)
  Output: JSON to stdout → { "predictedRunsInning1": int, "predictedRunsInning2": int }
"""

import json
import random

def predict():
    # Read the input data
    with open('/data/input.json', 'r') as f:
        match_data = json.load(f)

    # Extract features (teams can use these for ML)
    team1 = match_data.get('team1', 'Unknown')
    team2 = match_data.get('team2', 'Unknown')
    stadium = match_data.get('stadium', 'Unknown')
    toss_winner = match_data.get('tossWinner', '')
    toss_decision = match_data.get('tossDecision', '')

    # ── Your ML model logic goes here ──
    # This sample uses a simple random baseline for total innings score
    predicted_inning1 = random.randint(140, 200)
    predicted_inning2 = random.randint(140, 200)

    # Output prediction as JSON to stdout
    result = {
        "predictedRunsInning1": predicted_inning1,
        "predictedRunsInning2": predicted_inning2
    }
    print(json.dumps(result))

if __name__ == '__main__':
    predict()
