import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Trophy, 
  Users, 
  UserCircle, 
  Key, 
  Megaphone, 
  Bell, 
  QrCode, 
  Edit3, 
  Activity, 
  Star 
} from 'lucide-react';
import Modal from './Modal';

const UserDashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'updates' | 'profile'>('overview');
  
  // --- OLD FEATURES STATE (Squad Editing) ---
  const [showEditModal, setShowEditModal] = useState(false);
  const [tempMembers, setTempMembers] = useState<string[]>([]);

  // --- NEW FEATURES STATE (Password & Alerts) ---
  const [passData, setPassData] = useState({ old: '', new: '' });
  const [modal, setModal] = useState({ isOpen: false, title: '', message: '', type: 'info' as 'success'|'error'|'info' });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) navigate('/login');
    
    fetch('http://localhost:5000/api/user/dashboard', { 
      headers: { 'Authorization': `Bearer ${token}` } 
    })
    .then(res => res.json())
    .then(d => {
      setData(d);
      setTempMembers(d.team.members || []);
    })
    .catch(() => navigate('/login'));
  }, [navigate]);

  // --- FUNCTION 1: Save Team Members (Original Feature) ---
  const saveMembers = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('http://localhost:5000/api/user/update-members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, members: tempMembers })
      });
      const result = await res.json();
      if(result.success) {
        setModal({ isOpen: true, title: 'Squad Updated', message: `Saved! Edits remaining: ${result.editsLeft}`, type: 'success' });
        setShowEditModal(false);
        // Update local data without reload
        setData({ ...data, team: { ...data.team, members: tempMembers, editCount: data.team.editCount + 1 } });
      } else {
        setModal({ isOpen: true, title: 'Update Failed', message: result.error, type: 'error' });
      }
    } catch (e) {
      setModal({ isOpen: true, title: 'Error', message: 'Network error', type: 'error' });
    }
  };

  // --- FUNCTION 2: Handle Payment (New Feature) ---
  const handlePayment = async () => {
    const amount = data.payment.amount;
    
    // 1. Create Order
    const orderRes = await fetch('http://localhost:5000/api/payment/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
    });
    const orderData = await orderRes.json();

    // 2. Open Razorpay Options
    const options = {
        key: "YOUR_RAZORPAY_KEY_ID", // Replace with actual Test Key ID
        amount: orderData.amount,
        currency: "INR",
        name: "Sona Gameathon",
        description: "Team Registration Fee",
        order_id: orderData.id,
        handler: async function (response: any) {
            // 3. Verify Payment on Success
            const verifyRes = await fetch('http://localhost:5000/api/payment/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature,
                    teamId: data.team._id
                })
            });
            const verifyData = await verifyRes.json();
            
            if (verifyData.success) {
                setModal({ isOpen: true, title: 'Payment Successful!', message: 'Your payment is verified. Waiting for Admin final approval.', type: 'success' });
                // Refresh Data
                const token = localStorage.getItem('token');
                fetch('http://localhost:5000/api/user/dashboard', { headers: { 'Authorization': `Bearer ${token}` } })
                  .then(r => r.json()).then(setData);
            } else {
                setModal({ isOpen: true, title: 'Failed', message: 'Payment Verification Failed', type: 'error' });
            }
        },
        prefill: {
            name: data.team.captainName,
            email: data.team.captainEmail,
        },
        theme: {
            color: "#2563eb"
        }
    };

    // @ts-ignore
    const rzp1 = new window.Razorpay(options);
    rzp1.open();
  };

  // --- FUNCTION 3: Change Password (New Feature) ---
  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('http://localhost:5000/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, oldPassword: passData.old, newPassword: passData.new })
      });
      const result = await res.json();
      
      if (result.success) {
        setModal({ isOpen: true, title: 'Success', message: 'Password updated successfully!', type: 'success' });
        setPassData({ old: '', new: '' });
      } else {
        setModal({ isOpen: true, title: 'Error', message: result.error || 'Failed to update password', type: 'error' });
      }
    } catch (err) {
      setModal({ isOpen: true, title: 'Network Error', message: 'Could not connect to server', type: 'error' });
    }
  };

  if (!data) return <div className="min-h-screen pt-32 text-center text-white bg-[#020617]">Loading Analytics...</div>;

  return (
    <div className="min-h-screen pt-24 pb-12 px-6 bg-[#020617]">
      <Modal isOpen={modal.isOpen} onClose={() => setModal({...modal, isOpen: false})} title={modal.title} message={modal.message} type={modal.type} />
      
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-10 border-b border-white/10 pb-6">
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-600/20">
                {data.team.teamName.charAt(0)}
             </div>
             <div>
                <h1 className="text-4xl font-bold text-white">{data.team.teamName}</h1>
                <p className="text-blue-400 font-medium">{data.team.institute}</p>
             </div>
          </div>
          
          <div className="flex gap-4 mt-6 md:mt-0">
            {['overview', 'updates', 'profile'].map(tab => (
              <button 
                key={tab} 
                onClick={() => setActiveTab(tab as any)} 
                className={`capitalize px-6 py-2.5 rounded-lg font-bold transition-all ${activeTab === tab ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-gray-400 hover:text-white bg-white/5'}`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* --- TAB 1: OVERVIEW (Stats + Squad Edit + Payment) --- */}
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
             
             {/* Payment Alert Banner (New Feature) */}
             {data.payment?.enabled && data.team.status !== 'Paid' && data.team.status !== 'Approved' && (
               <div className="bg-gradient-to-r from-blue-900/40 to-indigo-900/40 border border-blue-500/30 p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl relative overflow-hidden">
                  <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl"></div>
                  <div className="flex items-center gap-5 z-10">
                    <div className="bg-blue-600 p-4 rounded-xl text-white shadow-lg shadow-blue-600/20">
                       <QrCode size={32}/>
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-xl">Complete Registration</h3>
                      <p className="text-blue-200 text-sm mt-1">
                        Registration Fee: <span className="text-white font-bold text-lg">₹{data.payment.amount}</span>
                      </p>
                      <p className="text-xs text-gray-400 mt-1">Secure payment via Razorpay</p>
                    </div>
                  </div>
                  <button 
                    onClick={handlePayment}
                    className="z-10 px-8 py-3 bg-white text-blue-900 font-bold rounded-xl hover:bg-gray-100 transition-all shadow-lg hover:scale-105 active:scale-95 flex items-center gap-2"
                  >
                     Pay Now
                  </button>
               </div>
             )}

             <div className="grid md:grid-cols-3 gap-6">
                {/* Rank Card */}
                <div className="glass-panel p-8 rounded-2xl relative overflow-hidden col-span-2 border border-white/10">
                   <div className="absolute top-0 right-0 p-8 opacity-5"><Trophy size={140} className="text-white" /></div>
                   <h3 className="text-gray-400 uppercase text-xs font-bold tracking-widest mb-1">Current Standing</h3>
                   <div className="text-7xl font-black text-white tracking-tighter">#{data.rank}</div>
                   <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-white/5 border border-white/10">
                     <span className="text-gray-400 text-xs">Total Score:</span>
                     <span className="text-xl text-yellow-400 font-mono font-bold">{data.team.score}</span>
                   </div>
                </div>

                {/* Yesterday's Earnings (Original Feature) */}
                <div className="glass-panel p-8 rounded-2xl border border-white/10 flex flex-col justify-center">
                   <h3 className="text-gray-400 uppercase text-xs font-bold tracking-widest mb-1">Yesterday's Earnings</h3>
                   <div className="text-5xl font-bold text-green-400 mt-2">+{data.team.yesterdayPoints || 0}</div>
                   <div className="flex items-center gap-2 mt-4 text-sm text-gray-500">
                     <Activity size={16} /> Points added from last match
                   </div>
                </div>
             </div>

             <div className="grid md:grid-cols-3 gap-6">
                {/* Squad Management Button (Original Feature) */}
                <div className="glass-panel p-8 rounded-2xl flex flex-col justify-center items-center text-center border border-white/10">
                   <div className="w-14 h-14 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-400 mb-4">
                     <Users size={28} />
                   </div>
                   <h3 className="text-white font-bold text-lg mb-1">Squad Management</h3>
                   <p className="text-gray-400 text-xs mb-4">Edits Remaining: {data.team.maxEdits - data.team.editCount}</p>
                   <button 
                     onClick={() => setShowEditModal(true)}
                     className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-full font-bold transition shadow-lg shadow-blue-600/20 text-sm flex items-center gap-2"
                   >
                     <Edit3 size={16} /> Manage Members
                   </button>
                </div>

                {/* Yesterday's Dream Team (Original Feature) */}
                <div className="glass-panel p-8 rounded-2xl border border-white/10 col-span-2">
                   <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                      <Star className="text-yellow-400 fill-yellow-400" size={20}/> Yesterday's Dream Team
                   </h3>
                   <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                     {data.dreamTeam && data.dreamTeam.map((player: string, i: number) => (
                       <div key={i} className="min-w-[140px] bg-white/5 p-4 rounded-xl text-center border border-white/5">
                         <div className="w-10 h-10 bg-gradient-to-br from-gray-700 to-gray-800 rounded-full mx-auto mb-3 border border-white/10"></div>
                         <div className="text-blue-200 font-bold text-sm truncate">{player}</div>
                         <div className="text-xs text-gray-500 mt-1">Player</div>
                       </div>
                     ))}
                   </div>
                </div>
             </div>
          </div>
        )}

        {/* --- TAB 2: UPDATES (New Feature - Announcements) --- */}
        {activeTab === 'updates' && (
          <div className="max-w-3xl mx-auto space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2"><Bell className="text-yellow-500"/> Latest Announcements</h2>
             {data.announcements && data.announcements.length > 0 ? data.announcements.map((msg: any, i: number) => (
               <div key={i} className="glass-panel p-6 rounded-2xl border border-white/10 flex gap-4">
                 <div className="bg-blue-600/20 p-3 rounded-full text-blue-400 h-fit"><Megaphone size={24}/></div>
                 <div>
                   <p className="text-white text-lg leading-relaxed">{msg.message}</p>
                   <p className="text-xs text-gray-500 mt-2">{new Date(msg.timestamp).toLocaleString()}</p>
                 </div>
               </div>
             )) : <div className="text-center text-gray-500 py-12 bg-white/5 rounded-2xl">No announcements yet.</div>}
          </div>
        )}

        {/* --- TAB 3: PROFILE (Details + Password) --- */}
        {activeTab === 'profile' && (
          <div className="grid md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Team Details */}
            <div className="glass-panel p-8 rounded-2xl border border-white/10">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <UserCircle className="text-blue-500"/> Team Profile
              </h3>
              <div className="space-y-4">
                <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                  <span className="text-xs text-gray-500 uppercase font-bold tracking-wider block mb-1">Captain Name</span> 
                  <span className="text-white font-bold text-lg">{data.team.captainName}</span>
                </div>
                <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                  <span className="text-xs text-gray-500 uppercase font-bold tracking-wider block mb-1">Registered Email</span> 
                  <span className="text-white font-bold text-lg">{data.team.captainEmail}</span>
                </div>
                <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                  <span className="text-xs text-gray-500 uppercase font-bold tracking-wider block mb-1">Institute</span> 
                  <span className="text-white font-bold text-lg">{data.team.institute}</span>
                </div>
              </div>
            </div>

            {/* Change Password (New Feature) */}
            <div className="glass-panel p-8 rounded-2xl border border-white/10">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Key className="text-yellow-500"/> Security Settings
              </h3>
              <form onSubmit={changePassword} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-2">Current Password</label>
                  <input 
                    type="password" required 
                    className="w-full bg-black/40 border border-white/10 text-white p-3.5 rounded-xl focus:border-blue-500 outline-none transition-all"
                    value={passData.old} onChange={e => setPassData({...passData, old: e.target.value})} 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-2">New Password</label>
                  <input 
                    type="password" required 
                    className="w-full bg-black/40 border border-white/10 text-white p-3.5 rounded-xl focus:border-blue-500 outline-none transition-all"
                    value={passData.new} onChange={e => setPassData({...passData, new: e.target.value})} 
                  />
                </div>
                <button className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-600/20 transition-all active:scale-95">
                  Update Password
                </button>
              </form>
            </div>
          </div>
        )}

        {/* --- EDIT SQUAD MODAL (Original Feature) --- */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] backdrop-blur-sm p-4">
            <div className="glass-panel border border-white/20 p-8 rounded-2xl w-full max-w-lg relative animate-in zoom-in-95 duration-200">
              <h2 className="text-2xl font-bold text-white mb-1">Update Squad</h2>
              <p className="text-red-400 text-xs mb-6 font-bold uppercase tracking-wide">
                 Edits Remaining: {data.team.maxEdits - data.team.editCount}
              </p>
              
              <div className="space-y-3 mb-8">
                {tempMembers.map((m, i) => (
                  <div key={i} className="relative">
                     <span className="absolute left-4 top-3.5 text-gray-500 text-xs font-bold">#{i+1}</span>
                     <input 
                       type="text" 
                       value={m} 
                       onChange={(e) => {
                         const copy = [...tempMembers];
                         copy[i] = e.target.value;
                         setTempMembers(copy);
                       }}
                       placeholder={`Member ${i+1} Name`}
                       className={`w-full bg-black/40 text-white p-3 pl-12 rounded-xl border ${i===0 ? 'border-blue-500/50 text-blue-300' : 'border-white/10'} focus:border-blue-500 outline-none`}
                       disabled={i === 0} // Lock captain
                     />
                  </div>
                ))}
              </div>
              
              <div className="flex gap-3">
                <button onClick={() => setShowEditModal(false)} className="flex-1 py-3 text-gray-400 hover:text-white font-bold bg-white/5 rounded-xl">Cancel</button>
                <button onClick={saveMembers} className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20">Save Changes</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default UserDashboard;