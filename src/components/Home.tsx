import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getPublicData } from '../services/firestore';
import { listMatches } from '../services/api';

/* ─── Cricket Pitch SVG (geometric minimal) ─── */
const CricketPitchSVG = () => (
  <svg viewBox="0 0 300 280" className="w-full max-w-xs mx-auto opacity-80" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Outer oval */}
    <ellipse cx="150" cy="140" rx="150" ry="140" stroke="#1E40AF" strokeWidth="2" strokeDasharray="6 4" opacity="0.3" />
    {/* Inner circle */}
    <circle cx="150" cy="140" r="95" stroke="#1E40AF" strokeWidth="1.5" opacity="0.25" />
    {/* Pitch rectangle */}
    <rect x="135" y="80" width="30" height="120" rx="2" stroke="#F59E0B" strokeWidth="2" fill="#F59E0B" fillOpacity="0.08" />
    {/* Crease lines */}
    <line x1="120" y1="95" x2="180" y2="95" stroke="#1E40AF" strokeWidth="1.5" opacity="0.4" />
    <line x1="120" y1="185" x2="180" y2="185" stroke="#1E40AF" strokeWidth="1.5" opacity="0.4" />
    {/* Stumps */}
    <rect x="145" y="88" width="2" height="10" fill="#F59E0B" opacity="0.7" />
    <rect x="149" y="88" width="2" height="10" fill="#F59E0B" opacity="0.7" />
    <rect x="153" y="88" width="2" height="10" fill="#F59E0B" opacity="0.7" />
    <rect x="145" y="182" width="2" height="10" fill="#F59E0B" opacity="0.7" />
    <rect x="149" y="182" width="2" height="10" fill="#F59E0B" opacity="0.7" />
    <rect x="153" y="182" width="2" height="10" fill="#F59E0B" opacity="0.7" />
    {/* Fielding positions dots */}
    <circle cx="80" cy="100" r="4" fill="#1E40AF" opacity="0.2" />
    <circle cx="220" cy="100" r="4" fill="#1E40AF" opacity="0.2" />
    <circle cx="60" cy="160" r="4" fill="#1E40AF" opacity="0.2" />
    <circle cx="240" cy="160" r="4" fill="#1E40AF" opacity="0.2" />
    <circle cx="100" cy="200" r="4" fill="#1E40AF" opacity="0.2" />
    <circle cx="200" cy="200" r="4" fill="#1E40AF" opacity="0.2" />
    <circle cx="280" cy="90" r="4" fill="#1E40AF" opacity="0.2" />
    <circle cx="30" cy="200" r="4" fill="#1E40AF" opacity="0.2" />
    {/* Score box */}
    <rect x="90" y="251" width="120" height="28" rx="6" fill="#1E40AF" fillOpacity="0.06" stroke="#1E40AF" strokeWidth="1" opacity="0.4" />
    <text x="150" y="270" textAnchor="middle" fill="#1E40AF" fontSize="11" fontFamily="Poppins" fontWeight="600" opacity="0.5">POWERPLAY</text>
  </svg>
);



/* ─── Medal Component ─── */
const RankBadge: React.FC<{ rank: number }> = ({ rank }) => {
  if (rank === 1) return <span className="medal-badge medal-gold">1</span>;
  if (rank === 2) return <span className="medal-badge medal-silver">2</span>;
  if (rank === 3) return <span className="medal-badge medal-bronze">3</span>;
  return <span className="text-gray-400 font-semibold text-sm">{rank}</span>;
};

const Home: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [recentMatches, setRecentMatches] = useState<any[]>([]);

  useEffect(() => {
    getPublicData()
      .then(data => data.leaderboard && setLeaderboard(data.leaderboard))
      .catch(err => console.error(err));
    listMatches()
      .then(data => setRecentMatches((data.matches || []).slice(-3).reverse()))
      .catch(err => console.error('Matches fetch:', err));
  }, []);

  return (
    <div>
      {/* ═══ HERO SECTION ═══ */}
      <section className="bg-gradient-to-br from-cream via-white to-sky">
        <div className="max-w-container mx-auto px-4 lg:px-8 py-16 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Copy */}
            <div>
              <p className="text-royal font-heading font-medium text-sm tracking-wider uppercase mb-3">
                Department of Computer Science · Sona College of Technology
              </p>
              <h1 className="font-heading text-4xl lg:text-5xl font-bold text-slate leading-tight mb-5">
                National Level IPL PowerPlay Score Prediction <span className="text-royal">Hackathon</span>
              </h1>
              <p className="text-gray-600 text-lg mb-8 leading-relaxed max-w-lg">
                Submit your Python prediction model. Compete against teams across the country. Climb the live evaluation leaderboard.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to="/register" className="btn-primary">
                  Register Now
                </Link>
                <Link to="/resources" className="btn-outline">
                  View Rules
                </Link>
              </div>
            </div>
            {/* Right: Illustration */}
            <div className="hidden lg:flex justify-center">
              <CricketPitchSVG />
            </div>
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section className="py-16 bg-gray-50/50">
        <div className="max-w-container mx-auto px-4 lg:px-8">
          <h2 className="section-heading text-center text-2xl mb-10">How It Works</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { step: '01', title: 'Register', desc: 'Sign up your team (up to 6 members) through the registration form.' },
              { step: '02', title: 'Build', desc: 'Write a MyModel class in Python to predict innings scores using cricket data.' },
              { step: '03', title: 'Submit', desc: 'Upload your mymodelfile.py as a .zip file through your dashboard.' },
              { step: '04', title: 'Compete', desc: 'Your model predicts runs for live matches. Lowest cumulative error wins.' },
            ].map((item) => (
              <div key={item.step} className="card p-6 text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-sky flex items-center justify-center">
                  <span className="text-royal font-heading font-bold text-sm">{item.step}</span>
                </div>
                <h3 className="font-heading font-semibold text-slate text-lg mb-2">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ LEADERBOARD ═══ */}
      <section className="py-16 bg-white">
        <div className="max-w-container mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="section-heading text-2xl !mb-0">🏆 Live Evaluation Leaderboard</h2>
          </div>
          <div className="card-static overflow-hidden">
            <table className="plain-table">
              <thead>
                <tr>
                  <th className="w-16">Rank</th>
                  <th>Team</th>
                  <th className="hidden md:table-cell">College</th>
                  <th>Matches</th>
                  <th>Total Error</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.length > 0 ? leaderboard.map((team, idx) => (
                  <tr key={idx} className={idx < 3 ? 'bg-cream/40' : ''}>
                    <td className="text-center">
                      <RankBadge rank={idx + 1} />
                    </td>
                    <td className="font-semibold text-slate">{team.teamName}</td>
                    <td className="hidden md:table-cell text-gray-500">{team.institute}</td>
                    <td>{team.matchesEvaluated || 0}</td>
                    <td className="font-semibold text-royal">
                      {team.cumulativeError !== null && team.cumulativeError !== undefined
                        ? team.cumulativeError.toFixed(1)
                        : '—'}
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={5} className="text-center text-gray-400 py-10">Waiting for first match results… 🏟️</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ═══ RECENT MATCHES ═══ */}
      {recentMatches.length > 0 && (
        <section className="py-16 bg-gray-50/50">
          <div className="max-w-container mx-auto px-4 lg:px-8">
            <h2 className="section-heading text-2xl mb-8">⚡ Recent Matches</h2>
            <div className="card-static overflow-hidden">
              <table className="plain-table">
                <thead>
                  <tr>
                    <th>Match</th>
                    <th>Teams</th>
                    <th className="hidden md:table-cell">Stadium</th>
                    <th>Status</th>
                    <th>Scores</th>
                  </tr>
                </thead>
                <tbody>
                  {recentMatches.map((match, i) => (
                    <tr key={i}>
                      <td className="text-gray-500">#{match.matchNumber}</td>
                      <td className="font-medium">{match.team1} vs {match.team2}</td>
                      <td className="hidden md:table-cell text-gray-500 text-sm">{match.stadium}</td>
                      <td>
                        <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${match.status === 'live' ? 'text-green-600' :
                          match.status === 'completed' ? 'text-gray-500' : 'text-gray-400'
                          }`}>
                          {match.status === 'live' && <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />}
                          {match.status === 'live' ? 'Live' : match.status}
                        </span>
                      </td>
                      <td className="font-mono text-sm">
                        {match.actualRunsInning1 !== null && match.actualRunsInning1 !== undefined
                          ? `I1: ${match.actualRunsInning1} | I2: ${match.actualRunsInning2}`
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ═══ QUICK LINKS ═══ */}
      <section className="py-16 bg-white">
        <div className="max-w-container mx-auto px-4 lg:px-8">
          <h2 className="section-heading text-2xl text-center mb-10">Quick Links</h2>
          <div className="grid sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
            <a href="https://www.kaggle.com/datasets" target="_blank" rel="noopener noreferrer" className="card p-5 text-center group">
              <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-sky flex items-center justify-center text-xl">📊</div>
              <span className="font-heading font-semibold text-slate text-sm group-hover:text-royal transition-colors">Training Data</span>
            </a>
            <a href="/sample-model.zip" download className="card p-5 text-center group">
              <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-cream flex items-center justify-center text-xl">📦</div>
              <span className="font-heading font-semibold text-slate text-sm group-hover:text-royal transition-colors">Sample Model</span>
            </a>
            <Link to="/resources" className="card p-5 text-center group">
              <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-sky flex items-center justify-center text-xl">📋</div>
              <span className="font-heading font-semibold text-slate text-sm group-hover:text-royal transition-colors">Full Rules</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ SPONSOR STRIP ═══ */}
      <section className="py-10 bg-gray-50/50 border-t border-light-border">
        <div className="max-w-container mx-auto px-4 lg:px-8 text-center">
          <p className="text-gray-400 text-xs font-heading font-medium uppercase tracking-wider mb-6">Sponsored By</p>
          <div className="flex justify-center items-center gap-10 flex-wrap opacity-40">
            <div className="w-24 h-10 bg-gray-200 rounded-lg" />
            <div className="w-20 h-10 bg-gray-200 rounded-lg" />
            <div className="w-28 h-10 bg-gray-200 rounded-lg" />
            <div className="w-24 h-10 bg-gray-200 rounded-lg" />
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;