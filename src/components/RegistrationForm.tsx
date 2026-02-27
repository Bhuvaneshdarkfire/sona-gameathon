import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from './Modal';
import { registerTeam } from '../services/firestore';
import { useAuth } from '../App';

const RegistrationForm: React.FC<{ onRegister: any }> = () => {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const [formData, setFormData] = useState({ teamName: '', institute: '', captainName: '', captainEmail: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [modal, setModal] = useState({ isOpen: false, title: '', message: '', type: 'info' as 'success' | 'error' | 'info' });

  useEffect(() => {
    if (user) navigate(role === 'admin' ? '/admin' : '/user-dashboard');
  }, [user, role, navigate]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!formData.teamName.trim()) errs.teamName = 'Team name is required';
    if (!formData.institute.trim()) errs.institute = 'College name is required';
    if (!formData.captainEmail.trim()) errs.captainEmail = 'Email is required';
    if (formData.password.length < 6) errs.password = 'Must be at least 6 characters';
    if (formData.password !== formData.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const { confirmPassword, ...regData } = formData;
      await registerTeam(regData);
      setModal({
        isOpen: true,
        title: 'Registration Successful!',
        message: 'Your team is registered! Please wait for Admin approval — you can then login with your email and password.',
        type: 'success'
      });
    } catch (err: any) {
      setModal({ isOpen: true, title: 'Registration Failed', message: err.message || 'Unknown error', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    setModal({ ...modal, isOpen: false });
    if (modal.type === 'success') navigate('/');
  };

  const fields = [
    { label: 'Team Name', key: 'teamName', type: 'text', placeholder: 'e.g. Data Dynamos' },
    { label: 'College / Institute', key: 'institute', type: 'text', placeholder: 'e.g. Sona College of Technology' },
    { label: 'Captain Name', key: 'captainName', type: 'text', placeholder: 'Full name' },
    { label: 'Captain Email', key: 'captainEmail', type: 'email', placeholder: 'captain@email.com' },
    { label: 'Password', key: 'password', type: 'password', placeholder: 'Min. 6 characters' },
    { label: 'Confirm Password', key: 'confirmPassword', type: 'password', placeholder: 'Re-enter password' },
  ];

  return (
    <div className="min-h-[80vh] bg-gradient-to-br from-cream via-white to-sky">
      <Modal isOpen={modal.isOpen} onClose={handleCloseModal} title={modal.title} message={modal.message} type={modal.type} />

      <div className="max-w-container mx-auto px-4 lg:px-8 py-12 lg:py-20">
        <div className="grid lg:grid-cols-5 gap-12 items-start">

          {/* Left: Event Benefits */}
          <div className="lg:col-span-2">
            <h2 className="font-heading font-bold text-3xl text-slate mb-3">Join the Hackathon</h2>
            <p className="text-gray-500 mb-8">Register your team and compete in the state-wide IPL PowerPlay prediction challenge.</p>

            <div className="space-y-5">
              {[
                { icon: '🏆', title: 'Cash Prizes', desc: 'Win from a prize pool for top-performing prediction models.' },
                { icon: '📊', title: 'Real Cricket Data', desc: 'Access live match data and historical IPL datasets for training.' },
                { icon: '🐳', title: 'Docker-Based Evaluation', desc: 'Submit containerized models — automated, fair, and transparent.' },
                { icon: '📈', title: 'Live Leaderboard', desc: 'Track your team ranking in real-time after each match evaluation.' },
              ].map((b) => (
                <div key={b.title} className="flex gap-4 items-start">
                  <div className="w-10 h-10 flex-shrink-0 rounded-lg bg-sky flex items-center justify-center text-lg">{b.icon}</div>
                  <div>
                    <h4 className="font-heading font-semibold text-slate text-sm">{b.title}</h4>
                    <p className="text-gray-500 text-sm leading-relaxed">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Registration Form Card */}
          <div className="lg:col-span-3">
            <div className="card-static p-8">
              <h3 className="font-heading font-bold text-xl text-slate mb-1 text-center">Create Account</h3>
              <p className="text-gray-400 text-sm text-center mb-6">Season 2026 · Official Entry</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                {fields.map((field) => (
                  <div key={field.key}>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">{field.label}</label>
                    <input
                      type={field.type}
                      required
                      placeholder={field.placeholder}
                      className={`input-field ${errors[field.key] ? 'error' : ''}`}
                      value={(formData as any)[field.key]}
                      onChange={(e) => {
                        setFormData({ ...formData, [field.key]: e.target.value });
                        if (errors[field.key]) setErrors({ ...errors, [field.key]: '' });
                      }}
                    />
                    {errors[field.key] && (
                      <p className="text-red-500 text-xs mt-1">{errors[field.key]}</p>
                    )}
                  </div>
                ))}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-primary !py-3 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Processing...' : 'Create Account'}
                </button>
              </form>

              <div className="text-center mt-5 pt-4 border-t border-light-border">
                <p className="text-sm text-gray-500">
                  Already have an account?{' '}
                  <span onClick={() => navigate('/login')} className="text-royal font-medium cursor-pointer hover:underline">Login here</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegistrationForm;