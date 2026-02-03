import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Trophy, LogOut, LayoutDashboard, UserPlus, LogIn, UserCircle } from 'lucide-react';

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  const NavItem = ({ to, label, icon: Icon, active }: any) => (
    <Link 
      to={to} 
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 font-medium ${
        active 
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' 
          : 'text-gray-400 hover:text-white hover:bg-white/5'
      }`}
    >
      {Icon && <Icon size={18} />}
      {label}
    </Link>
  );

  return (
    <nav className="fixed top-0 w-full z-50 bg-[#020617]/90 backdrop-blur-md border-b border-white/5 shadow-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* UPGRADED LOGO */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-600 blur-lg opacity-40 group-hover:opacity-60 transition-opacity"></div>
              <div className="relative w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center text-white font-black italic text-xl shadow-inner border border-white/10 transform skew-x-[-10deg]">
                S
              </div>
            </div>
            <div className="flex flex-col">
              <h1 className="text-2xl font-black italic tracking-tighter text-white group-hover:text-blue-400 transition-colors uppercase">
                SONA <span className="text-blue-500">GAMEATHON</span>
              </h1>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-4">
            <NavItem to="/" label="Home" active={location.pathname === '/'} />
            
            <a href="/#leaderboard" className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-yellow-400 transition-colors font-medium">
              <Trophy size={18} /> Leaderboard
            </a>

            <div className="h-6 w-px bg-white/10 mx-2"></div>

            {!token ? (
              <>
                <NavItem to="/register" label="Register" icon={UserPlus} active={location.pathname === '/register'} />
                <Link to="/login" className="ml-2 flex items-center gap-2 px-6 py-2.5 bg-white text-blue-900 font-bold rounded-full hover:bg-blue-50 transition-all shadow-lg hover:shadow-white/10">
                  <LogIn size={18} /> Login
                </Link>
              </>
            ) : (
              <>
                <NavItem 
                  to={role === 'admin' ? '/admin' : '/user-dashboard'} 
                  label="Dashboard" 
                  icon={LayoutDashboard} 
                  active={location.pathname.includes('dashboard') || location.pathname.includes('admin')} 
                />
                <button 
                  onClick={handleLogout}
                  className="ml-2 flex items-center gap-2 px-5 py-2.5 border border-red-500/30 text-red-400 font-medium rounded-full hover:bg-red-500 hover:text-white transition-all"
                >
                  <LogOut size={18} /> Logout
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;