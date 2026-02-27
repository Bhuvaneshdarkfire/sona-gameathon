"""
Sample Model — Sona Gameathon PowerPredict
===========================================
Submit this file inside a .zip to the dashboard.

REQUIRED: A class named 'MyModel' with 3 methods:
  - __init__()          : Initialize your model
  - fit(deliveries_df)  : Train on IPL ball-by-ball data (278K+ rows)
  - predict(test_df)    : Predict total runs → return DataFrame(id, predicted_run)
"""

import pandas as pd
import numpy as np


class MyModel:
    def __init__(self):
        self.overall_avg = 160
        self.team_batting_avg = {}
        self.team_vs_team_avg = {}

    def fit(self, deliveries_df):
        """Train on historical IPL ball-by-ball data."""
        if deliveries_df is None or deliveries_df.empty:
            return self

        df = deliveries_df.copy()
        df["total_runs"] = df["batsman_runs"] + df["extras"]

        # Total runs per innings
        innings_totals = (
            df.groupby(["matchId", "inning", "batting_team", "bowling_team"])["total_runs"]
            .sum()
            .reset_index()
        )

        self.overall_avg = int(innings_totals["total_runs"].mean())

        # Average by batting team
        self.team_batting_avg = (
            innings_totals.groupby("batting_team")["total_runs"].mean().to_dict()
        )

        # Head-to-head averages
        self.team_vs_team_avg = (
            innings_totals.groupby(["batting_team", "bowling_team"])["total_runs"]
            .mean()
            .to_dict()
        )

        # Use recent seasons (2022+) with 70% weight
        df["date"] = pd.to_datetime(df["date"], errors="coerce")
        recent = df[df["date"].dt.year >= 2022]
        if len(recent) > 1000:
            recent_totals = (
                recent.groupby(["matchId", "inning", "batting_team"])["total_runs"]
                .sum().reset_index()
            )
            recent_avg = recent_totals.groupby("batting_team")["total_runs"].mean()
            for team in recent_avg.index:
                if team in self.team_batting_avg:
                    self.team_batting_avg[team] = (
                        0.7 * recent_avg[team] + 0.3 * self.team_batting_avg[team]
                    )

        return self

    def predict(self, test_df):
        """Predict total runs for each innings."""
        predictions = []
        for _, row in test_df.iterrows():
            bat = str(row.get("batting_team", "")).strip()
            bowl = str(row.get("bowling_team", "")).strip()
            inn = int(row.get("innings", 1))

            # Head-to-head → team avg → overall avg
            if (bat, bowl) in self.team_vs_team_avg:
                score = self.team_vs_team_avg[(bat, bowl)]
            elif bat in self.team_batting_avg:
                score = self.team_batting_avg[bat]
            else:
                score = self.overall_avg

            # 2nd innings tends slightly lower
            if inn == 2:
                score -= 3

            predictions.append({
                "id": row["id"],
                "predicted_run": int(max(80, min(280, score))),
            })

        return pd.DataFrame(predictions)
