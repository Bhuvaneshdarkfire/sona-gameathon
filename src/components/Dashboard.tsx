import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const navigate = useNavigate();
  const [teamData, setTeamData] = useState<any>(null);
  const [members, setMembers] = useState<string[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  useEffect(() => {
    // 1. Check Login
    const token = localStorage.getItem('token');
    if (!token) { navigate('/'); return; }

    // 2. Load Local Data
    const storedMembers = JSON.parse(localStorage.getItem('members') || '[]');
    setMembers(storedMembers.length > 0 ? storedMembers : [localStorage.getItem('teamName') || 'Leader']);
    
    // 3. Fetch Leaderboard
    fetch('http://localhost:5000/api/teams')
      .then(res => res.json())
      .then(data => setLeaderboard(data));
  }, []);

  const handleMemberChange = (index: number, val: string) => {
    const newMembers = [...members];
    newMembers[index] = val;
    setMembers(newMembers);
  };

  const saveMembers = async () => {
    const token = localStorage.getItem('token');
    await fetch('http://localhost:5000/api/user/update-members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, members })
    });
    localStorage.setItem('members', JSON.stringify(members)); // Sync local
    alert("Team Details Updated!");
  };

  return (
    <div className="min-h-screen stadium-bg p-6">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-8">
        
        {/* LEFT: Team Management */}
        <div className="glass-card p-8 rounded-2xl">
          <h2 className="text-3xl font-bold text-white mb-6 neon-text">🏏 My Squad</h2>
          <div className="space-y-4">
            {/* Create 6 Inputs */}
            {[0,1,2,3,4,5].map(i => (
              <div key={i} className="flex items-center">
                <span className="w-8 text-gray-400 font-bold">#{i+1}</span>
                <input 
                  type="text" 
                  value={members[i] || ''}
                  placeholder={i === 0 ? "Captain (You)" : `Player ${i+1}`}
                  onChange={(e) => handleMemberChange(i, e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-600 text-white rounded p-3 focus:border-blue-500 outline-none"
                  disabled={i===0} // Lock captain name
                />
              </div>
            ))}
            <button onClick={saveMembers} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-lg font-bold mt-4 shadow-lg shadow-blue-500/30">
              💾 Save Team
            </button>
          </div>
        </div>

        {/* RIGHT: Live Leaderboard */}
        <div className="glass-card p-8 rounded-2xl">
          <h2 className="text-2xl font-bold text-white mb-6">🏆 Tournament Standings</h2>
          <div className="space-y-2">
            {leaderboard.map((team, idx) => (
              <div key={idx} className={`flex justify-between items-center p-4 rounded-lg ${idx < 3 ? 'bg-gradient-to-r from-yellow-500/20 to-transparent border border-yellow-500/30' : 'bg-slate-800/50'}`}>
                <div className="flex items-center gap-4">
                  <span className={`text-xl font-bold ${idx===0?'text-yellow-400': 'text-gray-400'}`}>#{idx+1}</span>
                  <div>
                    <h4 className="font-bold text-white">{team.teamName}</h4>
                    <p className="text-xs text-gray-400">{team.institute}</p>
                  </div>
                </div>
                <span className="text-2xl font-mono text-blue-400 font-bold">{team.score}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;