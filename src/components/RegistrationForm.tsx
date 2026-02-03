import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Mail, School, Users, Trophy } from 'lucide-react';
import Modal from './Modal'; // Ensure you have the Modal component created earlier

const RegistrationForm: React.FC<{ onRegister: any }> = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ teamName: '', institute: '', captainName: '', captainEmail: '' });
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState({ isOpen: false, title: '', message: '', type: 'info' as 'success' | 'error' | 'info' });

  // 1. SMART REDIRECT: If logged in, send to dashboard
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      navigate(localStorage.getItem('role') === 'admin' ? '/admin' : '/user-dashboard');
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      
      if (res.ok) {
        setModal({ 
          isOpen: true, 
          title: 'Registration Successful!', 
          message: 'Your team is registered. Please wait for Admin approval to receive your login credentials via email.', 
          type: 'success' 
        });
      } else {
        setModal({ isOpen: true, title: 'Registration Failed', message: data.error || 'Unknown error', type: 'error' });
      }
    } catch (err) {
      setModal({ isOpen: true, title: 'Network Error', message: 'Could not connect to server.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    setModal({ ...modal, isOpen: false });
    if (modal.type === 'success') navigate('/');
  };

  return (
    <div className="min-h-screen pt-24 flex items-center justify-center px-4 relative overflow-hidden">
      <Modal isOpen={modal.isOpen} onClose={handleCloseModal} title={modal.title} message={modal.message} type={modal.type} />
      
      {/* Background Ambience */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[100px] -z-10"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg"
      >
        <div className="glass-panel p-8 md:p-10 rounded-3xl border-t border-white/10 relative">
          
          {/* Decorative Icon */}
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/30 transform rotate-3">
            <Trophy className="text-white" size={32} />
          </div>

          <div className="text-center mt-8 mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">Team Registration</h2>
            <p className="text-blue-200/60 text-sm">Season 2026 • Official Entry</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {[
              { label: 'Team Name', icon: Users, value: formData.teamName, key: 'teamName', type: 'text' },
              { label: 'Institute Name', icon: School, value: formData.institute, key: 'institute', type: 'text' },
              { label: 'Captain Name', icon: User, value: formData.captainName, key: 'captainName', type: 'text' },
              { label: 'Captain Email', icon: Mail, value: formData.captainEmail, key: 'captainEmail', type: 'email' },
            ].map((field, i) => (
              <div key={i} className="relative group">
                <field.icon className="absolute left-4 top-4 text-gray-500 group-focus-within:text-blue-400 transition" size={20} />
                <input 
                  type={field.type} required 
                  className="w-full bg-[#020617]/50 border border-white/10 text-white rounded-xl py-3.5 pl-12 pr-4 focus:border-blue-500 focus:bg-[#020617]/80 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder-gray-600 font-medium"
                  placeholder={field.label}
                  value={field.value}
                  // @ts-ignore
                  onChange={(e) => setFormData({...formData, [field.key]: e.target.value})}
                />
              </div>
            ))}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full mt-4 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Processing..." : "Submit Registration"}
            </button>
          </form>

          <div className="text-center mt-8 pt-6 border-t border-white/5">
            <p className="text-sm text-gray-500">
              Already have an account? <span onClick={() => navigate('/login')} className="text-blue-400 cursor-pointer hover:text-white font-medium transition">Login here</span>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default RegistrationForm;