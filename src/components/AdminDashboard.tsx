import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings, Users, X, CheckCircle, Trash2, Shield, LogOut,
  Megaphone, DollarSign, Send, Plus, Play, Trophy,
  Loader2, AlertCircle
} from 'lucide-react';
import Modal from './Modal';
import { getAdminData, saveSetting, postAnnouncement, adminAction, approveTeam } from '../services/firestore';
import { logoutUser } from '../services/auth';
import { listMatches, createMatch, updateMatch, evaluateMatch, getPredictions, uploadMatchCSV } from '../services/api';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<{ teams: any[], announcements: any[], settings: any[] }>({ teams: [], announcements: [], settings: [] });
  const [activeTab, setActiveTab] = useState<'teams' | 'matches' | 'announce' | 'mail'>('teams');

  // Settings State
  const [paymentMode, setPaymentMode] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('0');

  // Announcement State
  const [newMessage, setNewMessage] = useState('');

  // Modal State
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [editScore, setEditScore] = useState('');
  const [modal, setModal] = useState({ isOpen: false, title: '', message: '', type: 'info' as 'success' | 'error' | 'info' });

  // Match State
  const [matches, setMatches] = useState<any[]>([]);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [showCreateMatch, setShowCreateMatch] = useState(false);
  const [newMatch, setNewMatch] = useState({
    matchNumber: '', team1: '', team2: '', stadium: '', tossWinner: '', tossDecision: 'bat'
  });
  const [showScoreModal, setShowScoreModal] = useState<any>(null);
  const [scoreInput, setScoreInput] = useState({ actualRunsInning1: '', actualRunsInning2: '' });
  const [evaluating, setEvaluating] = useState<string | null>(null);
  const [showPredictions, setShowPredictions] = useState<any>(null);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [uploadingCSV, setUploadingCSV] = useState<string | null>(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const d = await getAdminData();
      setData(d);
      const pMode = d.settings.find((s: any) => s.key === 'payment_mode');
      const pAmt = d.settings.find((s: any) => s.key === 'payment_amount');
      setPaymentMode(pMode ? (pMode as any).value : false);
      setPaymentAmount(pAmt ? (pAmt as any).value : '0');
    } catch (e) { console.error("Fetch error", e); }
    fetchMatches();
  };

  const fetchMatches = async () => {
    try {
      setMatchError(null);
      const result = await listMatches();
      setMatches(result.matches || []);
    } catch (e: any) {
      console.error("Matches fetch error", e);
      setMatchError(e.message || 'Cannot connect to backend server. Please start the backend (cd backend && node server.js).');
    }
  };

  const saveSettings = async (key: string, value: any) => {
    await saveSetting(key, value);
    fetchData();
    if (key === 'payment_amount') setModal({ isOpen: true, title: 'Saved', message: 'Payment amount updated.', type: 'success' });
  };

  const handlePostAnnouncement = async () => {
    if (!newMessage.trim()) return;
    await postAnnouncement(newMessage);
    setNewMessage('');
    fetchData();
    setModal({ isOpen: true, title: 'Sent', message: 'Announcement broadcasted to all users.', type: 'success' });
  };

  const handleAction = async (action: string) => {
    if (!selectedTeam) return;
    try {
      if (action === 'kick') {
        if (!confirm(`Delete ${selectedTeam.teamName}?`)) return;
        await adminAction('kick', selectedTeam._id);
        setModal({ isOpen: true, title: 'Team Deleted', message: 'The team has been removed.', type: 'info' });
      } else if (action === 'score') {
        await adminAction('score', selectedTeam._id, editScore);
        setModal({ isOpen: true, title: 'Score Updated', message: `New score set to ${editScore}`, type: 'success' });
      } else if (action === 'approve') {
        const uid = selectedTeam.uid;
        if (!uid) {
          setModal({ isOpen: true, title: 'Error', message: 'This team does not have a linked account. They may need to re-register.', type: 'error' });
          setSelectedTeam(null);
          return;
        }
        await approveTeam(selectedTeam._id, uid);
        setModal({ isOpen: true, title: 'Team Approved!', message: `${selectedTeam.teamName} has been approved.`, type: 'success' });
      }
      setSelectedTeam(null);
      fetchData();
    } catch (err) {
      setModal({ isOpen: true, title: 'Error', message: 'Action failed.', type: 'error' });
    }
  };

  const handleCreateMatch = async () => {
    if (!newMatch.matchNumber || !newMatch.team1 || !newMatch.team2 || !newMatch.stadium) {
      setModal({ isOpen: true, title: 'Missing Fields', message: 'Fill in match number, both teams, and stadium.', type: 'error' });
      return;
    }
    try {
      await createMatch({
        matchNumber: Number(newMatch.matchNumber),
        team1: newMatch.team1,
        team2: newMatch.team2,
        stadium: newMatch.stadium,
        tossWinner: newMatch.tossWinner,
        tossDecision: newMatch.tossDecision,
      });
      setModal({ isOpen: true, title: 'Match Created', message: `Match #${newMatch.matchNumber} created.`, type: 'success' });
      setShowCreateMatch(false);
      setNewMatch({ matchNumber: '', team1: '', team2: '', stadium: '', tossWinner: '', tossDecision: 'bat' });
      fetchMatches();
    } catch (err: any) {
      setModal({ isOpen: true, title: 'Error', message: err.message, type: 'error' });
    }
  };

  const handleUpdateScores = async () => {
    if (!showScoreModal) return;
    try {
      await updateMatch(showScoreModal.id, {
        actualRunsInning1: Number(scoreInput.actualRunsInning1),
        actualRunsInning2: Number(scoreInput.actualRunsInning2),
      });
      setModal({ isOpen: true, title: 'Scores Updated', message: 'Actual scores saved. Match marked as completed.', type: 'success' });
      setShowScoreModal(null);
      setScoreInput({ actualRunsInning1: '', actualRunsInning2: '' });
      fetchMatches();
    } catch (err: any) {
      setModal({ isOpen: true, title: 'Error', message: err.message, type: 'error' });
    }
  };

  const handleEvaluate = async (matchId: string) => {
    setEvaluating(matchId);
    try {
      const result = await evaluateMatch(matchId);
      setModal({ isOpen: true, title: '🏏 Evaluation Started!', message: result.message || 'Containers are running. Check predictions for results.', type: 'success' });
      fetchMatches();
    } catch (err: any) {
      setModal({ isOpen: true, title: 'Evaluation Failed', message: err.message, type: 'error' });
    } finally {
      setEvaluating(null);
    }
  };

  const handleViewPredictions = async (matchId: string) => {
    try {
      const result = await getPredictions(matchId);
      setPredictions(result.predictions || []);
      setShowPredictions(matchId);
    } catch (err: any) {
      setModal({ isOpen: true, title: 'Error', message: err.message, type: 'error' });
    }
  };

  const handleCSVUpload = async (matchId: string, file: File) => {
    setUploadingCSV(matchId);
    try {
      const result = await uploadMatchCSV(matchId, file);
      setModal({
        isOpen: true,
        title: '📄 CSV Uploaded!',
        message: `${result.message}\n\nInnings 1: ${result.summary?.innings1?.battingTeam} vs ${result.summary?.innings1?.bowlingTeam}\nInnings 2: ${result.summary?.innings2?.battingTeam} vs ${result.summary?.innings2?.bowlingTeam}`,
        type: 'success',
      });
      fetchMatches();
    } catch (err: any) {
      setModal({ isOpen: true, title: 'CSV Upload Failed', message: err.message, type: 'error' });
    } finally {
      setUploadingCSV(null);
    }
  };

  /* ──── input class helper ──── */
  const inputCls = "w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl p-3 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition placeholder-gray-400 text-sm";

  return (
    <div className="min-h-screen p-6 pt-24 bg-gray-50">
      <Modal isOpen={modal.isOpen} onClose={() => setModal({ ...modal, isOpen: false })} title={modal.title} message={modal.message} type={modal.type} />

      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8 border-b border-gray-200 pb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3"><Shield className="text-[#1e3a8a]" size={28} /> Admin Command</h1>
          <button onClick={async () => { await logoutUser(); navigate('/'); }} className="bg-red-50 text-red-600 border border-red-200 px-5 py-2 rounded-lg text-sm font-bold hover:bg-red-600 hover:text-white transition flex items-center gap-1.5"><LogOut size={16} /> Logout</button>
        </div>

        {/* TABS */}
        <div className="flex gap-1 mb-8 bg-white rounded-xl p-1 border border-gray-200 shadow-sm w-fit">
          {[
            { id: 'teams', icon: Users, label: 'Teams' },
            { id: 'matches', icon: Trophy, label: 'Matches' },
            { id: 'announce', icon: Megaphone, label: 'Announcements' },
            { id: 'mail', icon: Settings, label: 'Settings' }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`px-5 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition ${activeTab === tab.id ? 'bg-[#1e3a8a] text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}>
              <tab.icon size={16} /> {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: TEAMS */}
        {activeTab === 'teams' && (
          <div className="bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase font-bold text-xs border-b border-gray-100">
                <tr><th className="p-5">Team</th><th className="p-5">Status</th><th className="p-5">Error Score</th><th className="p-5 text-right">Action</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.teams.map(team => (
                  <tr key={team._id} className="hover:bg-blue-50/40 transition">
                    <td className="p-5">
                      <div className="font-bold text-gray-900">{team.teamName}</div>
                      <div className="text-xs text-gray-400">{team.captainEmail}</div>
                    </td>
                    <td className="p-5">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${team.status === 'Approved' ? 'bg-green-50 border-green-200 text-green-600' :
                        team.status === 'Paid' ? 'bg-blue-50 border-blue-200 text-blue-600' :
                          'bg-yellow-50 border-yellow-200 text-yellow-600'
                        }`}>
                        {team.status === 'Paid' ? 'Payment Verified' : team.status}
                      </span>
                    </td>
                    <td className="p-5 font-mono text-lg text-gray-900">{team.cumulativeError ?? team.score ?? 0}</td>
                    <td className="p-5 text-right">
                      <button onClick={() => { setSelectedTeam(team); setEditScore(team.score); }} className="bg-[#1e3a8a] hover:bg-blue-800 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition">Manage</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: MATCHES */}
        {activeTab === 'matches' && (
          <div className="space-y-5">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">Match Management</h2>
              <button
                onClick={() => setShowCreateMatch(true)}
                className="bg-[#1e3a8a] hover:bg-blue-800 text-white px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 shadow-md transition"
              >
                <Plus size={16} /> Create Match
              </button>
            </div>

            <div className="bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
              {matches.length > 0 ? (
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-500 uppercase font-bold text-xs border-b border-gray-100">
                    <tr>
                      <th className="p-4">#</th>
                      <th className="p-4">Match</th>
                      <th className="p-4">Stadium</th>
                      <th className="p-4">Toss</th>
                      <th className="p-4">Actual Scores</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {matches.map(match => (
                      <tr key={match.id} className="hover:bg-blue-50/40 transition">
                        <td className="p-4 font-mono text-gray-400 text-xs">{match.matchNumber}</td>
                        <td className="p-4">
                          <span className="text-gray-900 font-bold">{match.team1}</span>
                          <span className="text-gray-400 mx-1.5 text-xs">vs</span>
                          <span className="text-gray-900 font-bold">{match.team2}</span>
                        </td>
                        <td className="p-4 text-gray-500 text-xs">{match.stadium}</td>
                        <td className="p-4 text-gray-400 text-xs">
                          {match.tossWinner ? `${match.tossWinner} (${match.tossDecision})` : '—'}
                        </td>
                        <td className="p-4">
                          {(match.actualRunsInning1 !== null && match.actualRunsInning1 !== undefined) ? (
                            <span className="font-mono text-green-600 text-xs font-bold">
                              I1: {match.actualRunsInning1} | I2: {match.actualRunsInning2}
                            </span>
                          ) : (
                            <span className="text-gray-300 text-xs">Not set</span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${match.status === 'completed'
                            ? 'bg-green-50 border-green-200 text-green-600'
                            : match.status === 'live'
                              ? 'bg-yellow-50 border-yellow-200 text-yellow-600 animate-pulse'
                              : 'bg-gray-50 border-gray-200 text-gray-500'
                            }`}>
                            {match.status}
                          </span>
                        </td>
                        <td className="p-4 text-right space-x-1.5">
                          {/* Scores */}
                          <button
                            onClick={() => {
                              setShowScoreModal(match);
                              setScoreInput({
                                actualRunsInning1: match.actualRunsInning1?.toString() || '',
                                actualRunsInning2: match.actualRunsInning2?.toString() || '',
                              });
                            }}
                            className="bg-yellow-50 text-yellow-600 border border-yellow-200 px-2.5 py-1 rounded-lg text-[10px] font-bold hover:bg-yellow-500 hover:text-white transition"
                          >
                            Scores
                          </button>

                          {/* CSV Upload */}
                          <label className={`inline-flex items-center gap-1 cursor-pointer px-2.5 py-1 rounded-lg text-[10px] font-bold border transition ${match.csvUploaded
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-500 hover:text-white'
                            : 'bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-500 hover:text-white'
                            }`}>
                            <input
                              type="file"
                              accept=".csv"
                              className="hidden"
                              onChange={e => {
                                const f = e.target.files?.[0];
                                if (f) handleCSVUpload(match.id, f);
                                e.target.value = '';
                              }}
                            />
                            {uploadingCSV === match.id ? (
                              <span className="flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> Parsing…</span>
                            ) : match.csvUploaded ? (
                              <span className="flex items-center gap-1"><CheckCircle size={10} /> CSV ✓</span>
                            ) : (
                              <span className="flex items-center gap-1"><Plus size={10} /> CSV</span>
                            )}
                          </label>

                          {/* Evaluate */}
                          {match.status === 'completed' && (
                            <button
                              onClick={() => handleEvaluate(match.id)}
                              disabled={evaluating === match.id}
                              className="bg-green-50 text-green-600 border border-green-200 px-2.5 py-1 rounded-lg text-[10px] font-bold hover:bg-green-500 hover:text-white transition disabled:opacity-50"
                            >
                              {evaluating === match.id ? (
                                <span className="flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> Running…</span>
                              ) : (
                                <span className="flex items-center gap-1"><Play size={10} /> Evaluate</span>
                              )}
                            </button>
                          )}

                          {/* Results */}
                          {match.evaluatedAt && (
                            <button
                              onClick={() => handleViewPredictions(match.id)}
                              className="bg-blue-50 text-blue-600 border border-blue-200 px-2.5 py-1 rounded-lg text-[10px] font-bold hover:bg-blue-500 hover:text-white transition"
                            >
                              Results
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-14 text-center text-gray-400">
                  {matchError ? (
                    <>
                      <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-left max-w-lg mx-auto">
                        <p className="text-sm font-semibold text-amber-800 mb-1">⚠️ Backend Server Not Running</p>
                        <p className="text-xs text-amber-700 leading-relaxed">{matchError}</p>
                        <p className="text-xs text-amber-600 mt-2 font-mono">cd backend && node server.js</p>
                      </div>
                      <button onClick={fetchMatches} className="text-xs text-royal font-medium hover:underline">Retry</button>
                    </>
                  ) : (
                    <>
                      <Trophy className="mx-auto mb-3 text-gray-300" size={40} />
                      <p className="text-sm font-bold text-gray-500">No matches yet</p>
                      <p className="text-xs">Create your first match to get started.</p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: ANNOUNCEMENTS */}
        {activeTab === 'announce' && (
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm col-span-1">
              <h3 className="text-gray-900 font-bold mb-4 flex items-center gap-2 text-sm"><Send size={16} /> New Broadcast</h3>
              <textarea className={`${inputCls} h-36 mb-4 resize-none`} placeholder="Type message here..." value={newMessage} onChange={e => setNewMessage(e.target.value)}></textarea>
              <button onClick={handlePostAnnouncement} className="w-full bg-[#1e3a8a] hover:bg-blue-800 text-white py-2.5 rounded-xl text-sm font-bold shadow-md transition">Send Message</button>
            </div>
            <div className="col-span-2 space-y-3">
              <h3 className="text-gray-400 font-bold text-xs uppercase">History</h3>
              {data.announcements.map((msg: any, i) => (
                <div key={i} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex gap-3">
                  <div className="bg-blue-50 p-2 rounded-full text-blue-500 h-fit"><Megaphone size={16} /></div>
                  <div>
                    <p className="text-gray-900 text-sm mb-1">{msg.message}</p>
                    <p className="text-xs text-gray-400">{msg.timestamp?.toDate ? new Date(msg.timestamp.toDate()).toLocaleString() : new Date(msg.timestamp?.seconds ? msg.timestamp.seconds * 1000 : msg.timestamp).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: SETTINGS */}
        {activeTab === 'mail' && (
          <div className="bg-white p-8 rounded-2xl max-w-2xl border border-gray-200 shadow-sm space-y-6">
            <h2 className="text-xl font-bold text-gray-900">Payment & Gateway</h2>
            <div className="flex items-center justify-between p-5 bg-gray-50 rounded-xl border border-gray-100">
              <div><h3 className="text-sm font-bold text-gray-900">Enable Payment Mode</h3><p className="text-gray-500 text-xs">Teams will see payment instructions.</p></div>
              <button onClick={() => saveSettings('payment_mode', !paymentMode)} className={`relative h-6 w-11 rounded-full transition ${paymentMode ? 'bg-green-500' : 'bg-gray-300'}`}><span className={`block h-4 w-4 bg-white rounded-full transform transition mt-1 ml-1 shadow ${paymentMode ? 'translate-x-5' : ''}`} /></button>
            </div>
            <div className="p-5 bg-gray-50 rounded-xl border border-gray-100">
              <label className="text-gray-900 text-sm font-bold mb-2 block flex items-center gap-2"><DollarSign size={14} /> Registration Fee (₹)</label>
              <div className="flex gap-3">
                <input type="number" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} className={inputCls} />
                <button onClick={() => saveSettings('payment_amount', paymentAmount)} className="bg-[#1e3a8a] px-5 rounded-lg text-white text-sm font-bold hover:bg-blue-800 transition">Save</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ──── MANAGE TEAM MODAL ──── */}
      {selectedTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md p-6 rounded-2xl border border-gray-200 shadow-2xl relative">
            <button onClick={() => setSelectedTeam(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={18} /></button>
            <h2 className="text-lg font-bold text-gray-900 mb-5">{selectedTeam.teamName}</h2>
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <label className="text-xs font-bold text-gray-500 uppercase">Score</label>
                <div className="flex gap-2 mt-2">
                  <input type="number" value={editScore} onChange={e => setEditScore(e.target.value)} className={inputCls} />
                  <button onClick={() => handleAction('score')} className="bg-[#1e3a8a] px-4 rounded-lg text-white text-sm font-bold">Save</button>
                </div>
              </div>
              {selectedTeam.status !== 'Approved' && (
                <button onClick={() => handleAction('approve')} className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition">
                  <CheckCircle size={16} /> Approve Team
                </button>
              )}
              <button onClick={() => handleAction('kick')} className="w-full py-2.5 bg-red-50 text-red-600 border border-red-200 hover:bg-red-600 hover:text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition">
                <Trash2 size={16} /> Delete Team
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ──── CREATE MATCH MODAL ──── */}
      {showCreateMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-lg p-7 rounded-2xl border border-gray-200 shadow-2xl relative">
            <button onClick={() => setShowCreateMatch(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={18} /></button>
            <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2"><Plus size={18} /> Create Match</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Match #</label>
                  <input type="number" value={newMatch.matchNumber} onChange={e => setNewMatch({ ...newMatch, matchNumber: e.target.value })}
                    className={inputCls} placeholder="1" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Stadium</label>
                  <input value={newMatch.stadium} onChange={e => setNewMatch({ ...newMatch, stadium: e.target.value })}
                    className={inputCls} placeholder="Wankhede Stadium" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Team 1</label>
                  <input value={newMatch.team1} onChange={e => setNewMatch({ ...newMatch, team1: e.target.value })}
                    className={inputCls} placeholder="CSK" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Team 2</label>
                  <input value={newMatch.team2} onChange={e => setNewMatch({ ...newMatch, team2: e.target.value })}
                    className={inputCls} placeholder="MI" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Toss Winner</label>
                  <input value={newMatch.tossWinner} onChange={e => setNewMatch({ ...newMatch, tossWinner: e.target.value })}
                    className={inputCls} placeholder="CSK" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Toss Decision</label>
                  <select value={newMatch.tossDecision} onChange={e => setNewMatch({ ...newMatch, tossDecision: e.target.value })}
                    className={inputCls}>
                    <option value="bat">Bat</option>
                    <option value="field">Field</option>
                  </select>
                </div>
              </div>
              <button onClick={handleCreateMatch}
                className="w-full py-3 bg-[#1e3a8a] hover:bg-blue-800 text-white rounded-xl text-sm font-bold shadow-md transition mt-1">
                Create Match
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ──── UPDATE SCORES MODAL ──── */}
      {showScoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md p-7 rounded-2xl border border-gray-200 shadow-2xl relative">
            <button onClick={() => setShowScoreModal(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={18} /></button>
            <h2 className="text-lg font-bold text-gray-900 mb-1">
              Update Actual Scores
            </h2>
            <p className="text-gray-400 text-sm mb-5">
              Match #{showScoreModal.matchNumber}: {showScoreModal.team1} vs {showScoreModal.team2}
            </p>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Total Score — Innings 1</label>
                <input type="number" value={scoreInput.actualRunsInning1}
                  onChange={e => setScoreInput({ ...scoreInput, actualRunsInning1: e.target.value })}
                  className={inputCls}
                  placeholder="e.g. 185" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Total Score — Innings 2</label>
                <input type="number" value={scoreInput.actualRunsInning2}
                  onChange={e => setScoreInput({ ...scoreInput, actualRunsInning2: e.target.value })}
                  className={inputCls}
                  placeholder="e.g. 172" />
              </div>
              <button onClick={handleUpdateScores}
                className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold shadow-md transition">
                Save Scores & Mark Completed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ──── PREDICTIONS MODAL ──── */}
      {showPredictions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-3xl p-7 rounded-2xl border border-gray-200 shadow-2xl relative max-h-[80vh] overflow-y-auto">
            <button onClick={() => setShowPredictions(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={18} /></button>
            <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
              <Trophy className="text-yellow-500" size={18} /> Evaluation Results
            </h2>
            {predictions.length > 0 ? (
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold border-b border-gray-100">
                  <tr>
                    <th className="p-3">#</th>
                    <th className="p-3">Team</th>
                    <th className="p-3">Pred I1</th>
                    <th className="p-3">Pred I2</th>
                    <th className="p-3">Err I1</th>
                    <th className="p-3">Err I2</th>
                    <th className="p-3">Total</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {predictions.map((pred: any, i: number) => (
                    <tr key={pred.id} className="hover:bg-blue-50/40">
                      <td className="p-3 font-mono text-gray-400 text-xs">{i + 1}</td>
                      <td className="p-3 font-bold text-gray-900 text-xs">{pred.teamName || pred.teamId}</td>
                      <td className="p-3 font-mono text-blue-600 text-xs">{pred.predictedRunsInning1 ?? '—'}</td>
                      <td className="p-3 font-mono text-blue-600 text-xs">{pred.predictedRunsInning2 ?? '—'}</td>
                      <td className="p-3 font-mono text-yellow-600 text-xs">{pred.errorInning1}</td>
                      <td className="p-3 font-mono text-yellow-600 text-xs">{pred.errorInning2}</td>
                      <td className="p-3 font-mono font-bold text-red-500 text-xs">{pred.totalError}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${pred.status === 'success' ? 'bg-green-50 text-green-600 border-green-200' :
                          pred.status === 'timeout' ? 'bg-yellow-50 text-yellow-600 border-yellow-200' :
                            'bg-red-50 text-red-500 border-red-200'
                          }`}>
                          {pred.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center text-gray-400 py-8">
                <AlertCircle className="mx-auto mb-2 text-gray-300" size={28} />
                <p className="text-sm">No predictions found for this match.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;