"""
Sona Model — Advanced IPL Score Predictor
==========================================
Uses XGBoost trained on the last 3 years of IPL data (2022-2025).
Features: team strength, head-to-head records, innings position,
          strength differential, recency-weighted averages.

Optimized to run within 20-second Docker timeout.
"""

import pandas as pd
import numpy as np
from xgboost import XGBRegressor


class MyModel:
    def __init__(self):
        self.model = XGBRegressor(
            n_estimators=200,
            max_depth=5,
            learning_rate=0.1,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=42,
            n_jobs=1,
        )
        self.team_batting_avg = {}
        self.team_bowling_avg = {}
        self.h2h_avg = {}
        self.overall_avg = 160
        self.is_fitted = False
        self.feature_cols = []

    def _compute_innings_totals(self, df):
        """Compute total runs per innings from ball-by-ball data."""
        df = df.copy()
        df["total_runs"] = df["batsman_runs"] + df["extras"]
        totals = (
            df.groupby(["matchId", "inning", "batting_team", "bowling_team"])
            .agg(innings_total=("total_runs", "sum"))
            .reset_index()
        )
        return totals

    def _build_features(self, bat_team, bowl_team, innings):
        """Build feature vector for a single innings prediction."""
        bat_str = self.team_batting_avg.get(bat_team, self.overall_avg)
        bowl_str = self.team_bowling_avg.get(bowl_team, self.overall_avg)
        h2h = self.h2h_avg.get((bat_team, bowl_team), self.overall_avg)

        return {
            "bat_team_strength": bat_str,
            "bowl_team_strength": bowl_str,
            "h2h_avg": h2h,
            "innings": innings,
            "is_second_innings": 1 if innings == 2 else 0,
            "bat_vs_league": bat_str - self.overall_avg,
            "bowl_vs_league": bowl_str - self.overall_avg,
            "strength_diff": bat_str - bowl_str,
            "h2h_vs_bat": h2h - bat_str,
            "combined_strength": (bat_str * 0.6) + ((2 * self.overall_avg - bowl_str) * 0.4),
        }

    def fit(self, deliveries_df):
        """Train XGBoost on last 3 years of IPL data."""
        if deliveries_df is None or deliveries_df.empty:
            return self

        df = deliveries_df.copy()
        df["date"] = pd.to_datetime(df["date"], errors="coerce")
        df["total_runs"] = df["batsman_runs"] + df["extras"]

        # ── Compute stats from ALL data ──
        all_totals = self._compute_innings_totals(df)
        self.overall_avg = float(all_totals["innings_total"].mean())

        self.team_batting_avg = (
            all_totals.groupby("batting_team")["innings_total"].mean().to_dict()
        )
        self.team_bowling_avg = (
            all_totals.groupby("bowling_team")["innings_total"].mean().to_dict()
        )
        self.h2h_avg = (
            all_totals.groupby(["batting_team", "bowling_team"])["innings_total"]
            .mean().to_dict()
        )

        # ── Filter to recent 3 years for training ──
        recent = df[df["date"].dt.year >= 2022]
        if len(recent) < 5000:
            recent = df[df["date"].dt.year >= 2020]

        recent_totals = self._compute_innings_totals(recent)

        if len(recent_totals) < 20:
            self.is_fitted = False
            return self

        # Blend recent team averages (60% recent, 40% all-time)
        recent_bat = recent_totals.groupby("batting_team")["innings_total"].mean()
        for team, avg in recent_bat.items():
            old = self.team_batting_avg.get(team, self.overall_avg)
            self.team_batting_avg[team] = 0.6 * avg + 0.4 * old

        recent_bowl = recent_totals.groupby("bowling_team")["innings_total"].mean()
        for team, avg in recent_bowl.items():
            old = self.team_bowling_avg.get(team, self.overall_avg)
            self.team_bowling_avg[team] = 0.6 * avg + 0.4 * old

        # ── Build training data ──
        X_rows = []
        y_values = []

        for _, row in recent_totals.iterrows():
            bat = str(row["batting_team"]).strip()
            bowl = str(row["bowling_team"]).strip()
            inn = int(row["inning"])
            features = self._build_features(bat, bowl, inn)
            X_rows.append(features)
            y_values.append(row["innings_total"])

        X = pd.DataFrame(X_rows)
        y = np.array(y_values, dtype=float)

        self.feature_cols = list(X.columns)
        self.model.fit(X, y)
        self.is_fitted = True

        return self

    def predict(self, test_df):
        """Predict total runs for each innings in test data."""
        predictions = []

        for _, row in test_df.iterrows():
            innings_id = row.get("id", 0)
            bat = str(row.get("batting_team", "")).strip()
            bowl = str(row.get("bowling_team", "")).strip()
            innings = int(row.get("innings", 1))

            if self.is_fitted:
                features = self._build_features(bat, bowl, innings)
                X_pred = pd.DataFrame([features])[self.feature_cols]
                pred = float(self.model.predict(X_pred)[0])
                score = int(max(80, min(280, round(pred))))
            else:
                # Fallback
                if (bat, bowl) in self.h2h_avg:
                    score = int(self.h2h_avg[(bat, bowl)])
                elif bat in self.team_batting_avg:
                    score = int(self.team_batting_avg[bat])
                else:
                    score = int(self.overall_avg)

            predictions.append({
                "id": innings_id,
                "predicted_run": score,
            })

        return pd.DataFrame(predictions)
