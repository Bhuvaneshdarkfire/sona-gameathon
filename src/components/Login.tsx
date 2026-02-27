import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loginUser } from '../services/auth';
import { getTeamByEmail } from '../services/firestore';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await loginUser(email, password);
      const team: any = await getTeamByEmail(email);
      const role = team?.role ?? 'user';
      if (role === 'admin') navigate('/admin');
      else navigate('/user-dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid credentials or pending approval.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] bg-gradient-to-br from-cream via-white to-sky flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="card-static p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 mx-auto mb-4 bg-royal rounded-xl flex items-center justify-center">
              <span className="text-2xl text-white">🏏</span>
            </div>
            <h2 className="font-heading font-bold text-2xl text-slate">Welcome Back</h2>
            <p className="text-gray-400 text-sm mt-1">Sign in to your team account</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">Email</label>
              <input
                type="email"
                required
                placeholder="captain@email.com"
                className="input-field"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">Password</label>
              <input
                type="password"
                required
                placeholder="Enter your password"
                className="input-field"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary !py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Login'}
            </button>
          </form>

          {/* Footer */}
          <div className="text-center mt-6 pt-5 border-t border-light-border">
            <p className="text-sm text-gray-500">
              Don't have an account?{' '}
              <Link to="/register" className="text-royal font-medium hover:underline">Register here</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;