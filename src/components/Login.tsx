import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('http://localhost:5000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    
    if (res.ok) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('role', data.role);
      
      // Direct Routing based on Role
      if(data.role === 'admin') navigate('/admin');
      else navigate('/user-dashboard');
    } else {
      alert(data.error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass p-8 rounded-2xl w-full max-w-md border-t-4 border-blue-500">
        <h2 className="text-3xl font-bold text-white mb-6 text-center">Login</h2>
        <form onSubmit={handleLogin} className="space-y-4">
          <input type="email" placeholder="Email" required className="w-full bg-slate-900/50 border border-slate-600 text-white p-3 rounded" value={email} onChange={e => setEmail(e.target.value)} />
          <input type="password" placeholder="Password" required className="w-full bg-slate-900/50 border border-slate-600 text-white p-3 rounded" value={password} onChange={e => setPassword(e.target.value)} />
          <button className="w-full bg-blue-600 hover:bg-blue-500 text-white p-3 rounded font-bold neon-glow transition">Login</button>
        </form>
      </div>
    </div>
  );
};
export default Login;