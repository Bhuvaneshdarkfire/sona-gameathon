import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Users, Mail, X, CheckCircle, Trash2, Shield, LogOut, Megaphone, DollarSign, Send } from 'lucide-react';
import Modal from './Modal';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<{ teams: any[], announcements: any[] }>({ teams: [], announcements: [] });
  const [activeTab, setActiveTab] = useState<'teams' | 'announce' | 'mail'>('teams');
  
  // Settings State
  const [paymentMode, setPaymentMode] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('0');
  
  // Announcement State
  const [newMessage, setNewMessage] = useState('');

  // Modal State
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [editScore, setEditScore] = useState('');
  const [modal, setModal] = useState({ isOpen: false, title: '', message: '', type: 'info' as 'success' | 'error' | 'info' });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/admin/data');
      const d = await res.json();
      setData(d);
      
      // Load Settings
      const pMode = d.settings.find((s: any) => s.key === 'payment_mode');
      const pAmt = d.settings.find((s: any) => s.key === 'payment_amount');
      setPaymentMode(pMode ? pMode.value : false);
      setPaymentAmount(pAmt ? pAmt.value : '0');
    } catch (e) { console.error("Fetch error", e); }
  };

  const saveSettings = async (key: string, value: any) => {
    await fetch('http://localhost:5000/api/admin/settings', {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ key, value })
    });
    fetchData();
    if(key === 'payment_amount') setModal({ isOpen: true, title: 'Saved', message: 'Payment amount updated.', type: 'success' });
  };

  const postAnnouncement = async () => {
    if(!newMessage.trim()) return;
    await fetch('http://localhost:5000/api/admin/announce', {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ message: newMessage })
    });
    setNewMessage('');
    fetchData();
    setModal({ isOpen: true, title: 'Sent', message: 'Announcement broadcasted to all users.', type: 'success' });
  };

  const handleAction = async (action: string) => {
    if (!selectedTeam) return;
    try {
      if (action === 'kick') {
        if(!confirm(`Delete ${selectedTeam.teamName}?`)) return;
        await fetch('http://localhost:5000/api/admin/action', {
          method: 'POST', headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ action: 'kick', teamId: selectedTeam._id })
        });
        setModal({ isOpen: true, title: 'Team Deleted', message: 'The team has been removed.', type: 'info' });
      } else if (action === 'score') {
        await fetch('http://localhost:5000/api/admin/action', {
          method: 'POST', headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ action: 'score', teamId: selectedTeam._id, value: editScore })
        });
        setModal({ isOpen: true, title: 'Score Updated', message: `New score set to ${editScore}`, type: 'success' });
      } else if (action === 'approve') {
        await fetch('http://localhost:5000/api/admin/approve', {
          method: 'POST', headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ teamId: selectedTeam._id })
        });
        setModal({ isOpen: true, title: 'Email Sent!', message: `Credentials sent to ${selectedTeam.captainEmail}`, type: 'success' });
      }
      setSelectedTeam(null);
      fetchData();
    } catch (err) {
      setModal({ isOpen: true, title: 'Error', message: 'Action failed.', type: 'error' });
    }
  };

  return (
    <div className="min-h-screen p-6 pt-24 bg-[#020617]">
      <Modal isOpen={modal.isOpen} onClose={() => setModal({...modal, isOpen: false})} title={modal.title} message={modal.message} type={modal.type} />
      
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-6">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3"><Shield className="text-blue-500" size={32} /> Admin Command</h1>
          <button onClick={() => {localStorage.clear(); navigate('/')}} className="bg-red-500/10 text-red-400 border border-red-500/20 px-5 py-2.5 rounded-lg font-bold hover:bg-red-500 hover:text-white transition"><LogOut size={18} /> Logout</button>
        </div>

        {/* TABS */}
        <div className="flex gap-6 mb-8">
          {[
            {id: 'teams', icon: Users, label: 'Teams'}, 
            {id: 'announce', icon: Megaphone, label: 'Announcements'}, 
            {id: 'mail', icon: Settings, label: 'Settings'}
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`pb-2 px-4 font-bold flex items-center gap-2 transition border-b-2 ${activeTab === tab.id ? 'text-blue-400 border-blue-400' : 'text-gray-500 border-transparent hover:text-white'}`}>
              <tab.icon size={20}/> {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: TEAMS */}
        {activeTab === 'teams' && (
          <div className="glass-panel rounded-2xl overflow-hidden border border-white/10">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="bg-[#0f172a] text-gray-400 uppercase font-bold text-xs">
                <tr><th className="p-6">Team</th><th className="p-6">Status</th><th className="p-6">Score</th><th className="p-6 text-right">Action</th></tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.teams.map(team => (
                  <tr key={team._id} className="hover:bg-white/5 transition">
                    <td className="p-6">
                        <div className="font-bold text-white text-lg">{team.teamName}</div> 
                        <div className="text-xs text-gray-500 font-normal">{team.captainEmail}</div>
                    </td>
                    
                    {/* CORRECTED STATUS COLUMN */}
                    <td className="p-6">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                         team.status === 'Approved' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 
                         team.status === 'Paid' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400 animate-pulse' : 
                         'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
                      }`}>
                        {team.status === 'Paid' ? 'Payment Verified' : team.status}
                      </span>
                    </td>

                    <td className="p-6 font-mono text-xl">{team.score}</td>
                    <td className="p-6 text-right">
                        <button onClick={() => { setSelectedTeam(team); setEditScore(team.score); }} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-xs font-bold">Manage</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: ANNOUNCEMENTS */}
        {activeTab === 'announce' && (
          <div className="grid md:grid-cols-3 gap-8">
            <div className="glass-panel p-6 rounded-2xl border border-white/10 col-span-1">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2"><Send size={18}/> New Broadcast</h3>
              <textarea className="w-full bg-black/40 border border-white/10 text-white rounded-xl p-4 mb-4 h-40 focus:border-blue-500 outline-none" placeholder="Type message here..." value={newMessage} onChange={e => setNewMessage(e.target.value)}></textarea>
              <button onClick={postAnnouncement} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-600/20">Send Message</button>
            </div>
            <div className="col-span-2 space-y-4">
              <h3 className="text-gray-400 font-bold text-sm uppercase">History</h3>
              {data.announcements.map((msg, i) => (
                <div key={i} className="glass-panel p-5 rounded-xl border border-white/5 flex gap-4">
                  <div className="bg-blue-500/10 p-3 rounded-full text-blue-400 h-fit"><Megaphone size={20}/></div>
                  <div>
                    <p className="text-white mb-2">{msg.message}</p>
                    <p className="text-xs text-gray-500">{new Date(msg.timestamp).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: SETTINGS */}
        {activeTab === 'mail' && (
          <div className="glass-panel p-8 rounded-2xl max-w-2xl border border-white/10 space-y-8">
            <h2 className="text-2xl font-bold text-white">Payment & Gateway</h2>
            
            {/* Toggle Mode */}
            <div className="flex items-center justify-between p-6 bg-white/5 rounded-xl border border-white/5">
              <div><h3 className="text-lg font-bold text-white">Enable Payment Mode</h3><p className="text-gray-400 text-sm">Teams will see payment instructions.</p></div>
              <button onClick={() => saveSettings('payment_mode', !paymentMode)} className={`relative h-6 w-11 rounded-full transition ${paymentMode ? 'bg-green-500' : 'bg-gray-600'}`}><span className={`block h-4 w-4 bg-white rounded-full transform transition mt-1 ml-1 ${paymentMode ? 'translate-x-5' : ''}`} /></button>
            </div>

            {/* Set Amount */}
            <div className="p-6 bg-white/5 rounded-xl border border-white/5">
              <label className="text-white font-bold mb-2 block flex items-center gap-2"><DollarSign size={16}/> Registration Fee (₹)</label>
              <div className="flex gap-4">
                <input type="number" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} className="bg-black/40 border border-white/10 text-white rounded-lg p-3 w-full"/>
                <button onClick={() => saveSettings('payment_amount', paymentAmount)} className="bg-blue-600 px-6 rounded-lg text-white font-bold">Save</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MANAGE MODAL */}
      {selectedTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl border border-white/20 relative">
            <button onClick={() => setSelectedTeam(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X size={20}/></button>
            <h2 className="text-xl font-bold text-white mb-6">{selectedTeam.teamName}</h2>
            <div className="space-y-4">
              <div className="bg-white/5 p-4 rounded-xl">
                  <label className="text-xs font-bold text-gray-400 uppercase">Score</label>
                  <div className="flex gap-2 mt-2">
                      <input type="number" value={editScore} onChange={e => setEditScore(e.target.value)} className="bg-black/40 border border-white/10 text-white rounded p-2 w-full"/>
                      <button onClick={() => handleAction('score')} className="bg-blue-600 px-4 rounded text-white text-sm font-bold">Save</button>
                  </div>
              </div>

              {selectedTeam.status !== 'Approved' && (
                  <button onClick={() => handleAction('approve')} className="w-full py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold flex items-center justify-center gap-2">
                      <CheckCircle size={18}/> Approve & Email
                  </button>
              )}
              
              <button onClick={() => handleAction('kick')} className="w-full py-3 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500 hover:text-white rounded-xl font-bold flex items-center justify-center gap-2">
                  <Trash2 size={18}/> Delete Team
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;