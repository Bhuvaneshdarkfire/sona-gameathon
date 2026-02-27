import React from 'react';

const Resources: React.FC = () => {
    return (
        <div className="bg-white">
            {/* Header */}
            <section className="bg-gradient-to-br from-cream to-sky py-14">
                <div className="max-w-container mx-auto px-4 lg:px-8 text-center">
                    <h1 className="font-heading font-bold text-3xl lg:text-4xl text-slate mb-3">Contest Details & Rules</h1>
                    <p className="text-gray-500 max-w-xl mx-auto">
                        Everything you need to know about submitting your model, evaluation criteria, and the scoring system.
                    </p>
                </div>
            </section>

            <div className="max-w-4xl mx-auto px-4 lg:px-8 py-14 space-y-12">

                {/* Problem Statement */}
                <section>
                    <h2 className="section-heading text-2xl mb-5">Problem Statement</h2>
                    <div className="card-static p-6">
                        <p className="text-gray-600 text-sm leading-relaxed">
                            Given certain input parameters regarding the innings of an IPL T20 cricket match, <strong>predict the total runs</strong> scored by the batting team in each innings.
                            Your model will receive a <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-royal">test_file.csv</code> with match details for two innings, and must output predictions in a <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-royal">submission.csv</code> file.
                        </p>
                    </div>
                </section>

                {/* Evaluation Criteria */}
                <section>
                    <h2 className="section-heading text-2xl mb-5">Evaluation Criteria</h2>
                    <div className="card-static overflow-hidden">
                        <table className="plain-table">
                            <thead>
                                <tr>
                                    <th>Metric</th>
                                    <th>Description</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="font-medium text-slate">Mean Absolute Error (MAE)</td>
                                    <td className="text-gray-500 text-sm">
                                        Error = |predicted_run - actual_run| for each innings.<br />
                                        Total error per match = error_inning1 + error_inning2.<br />
                                        <strong>Lower cumulative error = higher rank.</strong>
                                    </td>
                                </tr>
                                <tr>
                                    <td className="font-medium text-slate">Failure Penalty</td>
                                    <td className="text-gray-500 text-sm">
                                        If your model fails, times out, or produces invalid output: <strong>999 penalty per innings</strong> (1998 total).
                                    </td>
                                </tr>
                                <tr>
                                    <td className="font-medium text-slate">Score Truncation</td>
                                    <td className="text-gray-500 text-sm">
                                        Predictions are truncated to integers. e.g., 165.7 → 165.
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* Competition Rules */}
                <section>
                    <h2 className="section-heading text-2xl mb-5">Competition Rules</h2>
                    <div className="card-static p-6">
                        <ol className="space-y-3">
                            {[
                                <>Each team can have up to <strong>6 members</strong> with one designated captain.</>,
                                <>Submissions must be a <strong>.zip file</strong> containing exactly one file: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-royal">mymodelfile.py</code>.</>,
                                <>Your code must define a <strong>MyModel class</strong> with <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-royal">__init__()</code>, <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-royal">fit()</code>, and <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-royal">predict()</code> methods.</>,
                                <>Your model has <strong>20 seconds to execute</strong>. Timeout = 999 penalty per innings.</>,
                                <>You may submit updated models at any time. Only the <strong>latest submission</strong> is used for evaluation.</>,
                                <>The leaderboard ranks teams by <strong>lowest cumulative error</strong> across all evaluated matches.</>,
                                <><strong>No network access</strong> inside the container. All logic must be self-contained.</>,
                                <>Maximum <strong>zip file size: 5 MB</strong>. Only Python 3.12 is supported.</>,
                            ].map((rule, i) => (
                                <li key={i} className="flex gap-3 text-sm text-gray-600 leading-relaxed">
                                    <span className="w-6 h-6 rounded-full bg-sky text-royal flex items-center justify-center flex-shrink-0 text-xs font-heading font-bold mt-0.5">
                                        {i + 1}
                                    </span>
                                    <span>{rule}</span>
                                </li>
                            ))}
                        </ol>
                    </div>
                </section>

                {/* Training Data */}
                <section>
                    <h2 className="section-heading text-2xl mb-5">Training Data</h2>
                    <div className="card p-6">
                        <p className="text-gray-600 text-sm mb-4 leading-relaxed">
                            The Docker container comes pre-loaded with historical IPL ball-by-ball data for training:
                        </p>
                        <ul className="space-y-2 mb-5 text-sm text-gray-600">
                            <li className="flex gap-2"><span className="text-royal font-bold">•</span> <strong>deliveries_updated_ipl_upto_2025.csv</strong> — 278K+ ball-by-ball records (2008–2025)</li>
                            <li className="flex gap-2"><span className="text-royal font-bold">•</span> Columns: matchId, inning, over, ball, batting_team, bowling_team, batsman, bowler, batsman_runs, extras, dismissal_kind, date</li>
                        </ul>
                        <div className="flex flex-wrap gap-3">
                            <a href="https://www.kaggle.com/datasets" target="_blank" rel="noopener noreferrer" className="btn-primary text-sm !py-2.5 !px-5">
                                📊 Training Data on Kaggle
                            </a>
                            <a href="/sample-model.zip" download className="btn-outline text-sm !py-2.5 !px-5">
                                📦 Download Sample Model
                            </a>
                        </div>
                        <p className="text-gray-400 text-xs mt-3">
                            You may use any publicly available cricket data to supplement.
                        </p>
                    </div>
                </section>

                {/* Model Format */}
                <section>
                    <h2 className="section-heading text-2xl mb-5">Model Format & Constraints</h2>
                    <div className="card-static p-6">
                        <ol className="space-y-3">
                            {[
                                <><strong>Language:</strong> Python 3.12 only.</>,
                                <><strong>Max zip size:</strong> 5 MB.</>,
                                <><strong>Max execution time:</strong> 20 seconds.</>,
                                <><strong>Resources:</strong> Single-threaded processor, 512 MB RAM, no network access.</>,
                                <>Your model runs in a Docker container with pre-installed packages: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-royal">pandas, numpy, scikit-learn, scipy, xgboost, lightgbm, statsmodels, matplotlib, seaborn</code>.</>,
                                <>Do NOT rename <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-royal">mymodelfile.py</code> to anything else.</>,
                                <>The zip must contain <strong>only one file</strong> named <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-royal">mymodelfile.py</code>.</>,
                            ].map((rule, i) => (
                                <li key={i} className="flex gap-3 text-sm text-gray-600 leading-relaxed">
                                    <span className="w-6 h-6 rounded-full bg-cream text-saffron-dark flex items-center justify-center flex-shrink-0 text-xs font-heading font-bold mt-0.5">
                                        {i + 1}
                                    </span>
                                    <span>{rule}</span>
                                </li>
                            ))}
                        </ol>
                    </div>
                </section>

                {/* Code Examples */}
                <section>
                    <h2 className="section-heading text-2xl mb-5">Example Submission</h2>

                    <div className="space-y-5">
                        <div>
                            <h3 className="font-heading font-semibold text-slate mb-2">mymodelfile.py</h3>
                            <pre className="card-static p-5 text-sm font-mono text-gray-700 overflow-x-auto bg-gray-50/50">
                                {`import pandas as pd
import numpy as np

class MyModel:
    def __init__(self):
        self.avg_score = 160

    def fit(self, deliveries_df):
        # Train on historical ball-by-ball data
        if deliveries_df is not None:
            deliveries_df["total_runs"] = deliveries_df["batsman_runs"] + deliveries_df["extras"]
            innings_totals = deliveries_df.groupby(["matchId", "inning"])["total_runs"].sum()
            self.avg_score = int(innings_totals.mean())
        return self

    def predict(self, test_df):
        predictions = []
        for _, row in test_df.iterrows():
            predictions.append({
                "id": row["id"],
                "predicted_run": self.avg_score
            })
        return pd.DataFrame(predictions)`}
                            </pre>
                        </div>

                        <div>
                            <h3 className="font-heading font-semibold text-slate mb-2">Input (<code className="text-sm font-mono text-royal">test_file.csv</code>)</h3>
                            <pre className="card-static p-5 text-sm font-mono text-gray-700 overflow-x-auto bg-gray-50/50">
                                {`id,venue,innings,batting_team,bowling_team,toss_winner,toss_decision
1,"MA Chidambaram Stadium",1,"Mumbai Indians","Kolkata Knight Riders","Mumbai Indians","bat"
2,"MA Chidambaram Stadium",2,"Kolkata Knight Riders","Mumbai Indians","Mumbai Indians","bat"`}
                            </pre>
                        </div>

                        <div>
                            <h3 className="font-heading font-semibold text-slate mb-2">Expected Output (<code className="text-sm font-mono text-royal">submission.csv</code>)</h3>
                            <pre className="card-static p-5 text-sm font-mono text-gray-700 overflow-x-auto bg-gray-50/50">
                                {`id,predicted_run
1,165
2,158`}
                            </pre>
                            <p className="text-gray-400 text-xs mt-2">
                                Scoring: MAE = |predicted - actual| per innings. Total error = error_inning1 + error_inning2. Lower is better.
                            </p>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default Resources;
