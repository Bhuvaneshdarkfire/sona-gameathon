import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../App';
import { logoutUser } from '../services/auth';

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, role } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    await logoutUser();
    setMenuOpen(false);
    navigate('/');
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  const isActive = (path: string) => location.pathname === path;

  const navLink = (to: string, label: string) => (
    <Link
      to={to}
      className={`relative px-3 py-2 text-sm font-medium transition-colors duration-micro ease-micro ${isActive(to)
          ? 'text-royal'
          : 'text-gray-600 hover:text-royal'
        }`}
    >
      {label}
      {isActive(to) && (
        <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-saffron rounded-full" />
      )}
    </Link>
  );

  return (
    <>
      {/* Sticky Navigation */}
      <nav className="sticky top-0 z-50 bg-white border-b border-light-border shadow-sm">
        <div className="max-w-container mx-auto px-4 lg:px-8 flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 bg-royal rounded-lg flex items-center justify-center">
              <span className="text-white text-lg">🏏</span>
            </div>
            <div className="flex flex-col">
              <span className="font-heading font-bold text-slate text-sm tracking-wide leading-tight">SONA POWER PREDICT</span>
              <span className="text-[10px] text-gray-400 leading-tight hidden sm:block">IPL PowerPlay Score Prediction Hackathon</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navLink('/', 'Home')}
            {navLink('/about', 'About')}
            {navLink('/resources', 'Rules')}
            {navLink('/faq', 'FAQ')}
            <span className="w-px h-5 bg-gray-200 mx-2" />
            {!user ? (
              <>
                <Link to="/login" className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-royal transition-colors duration-micro">
                  Login
                </Link>
                <Link to="/register" className="btn-primary text-sm !py-2 !px-5">
                  Register Now
                </Link>
              </>
            ) : (
              <>
                {navLink(role === 'admin' ? '/admin' : '/user-dashboard', 'Dashboard')}
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-red-600 transition-colors duration-micro"
                >
                  Logout
                </button>
              </>
            )}
          </div>

          {/* Mobile Hamburger */}
          <div ref={menuRef} className="md:hidden relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className={`flex flex-col items-center justify-center gap-[5px] w-10 h-10 rounded-lg hover:bg-gray-50 transition ${menuOpen ? 'hamburger-open' : ''}`}
            >
              <span className="hamburger-line" />
              <span className="hamburger-line" />
              <span className="hamburger-line" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-12 w-56 bg-white border border-light-border rounded-card shadow-card-hover z-50 overflow-hidden">
                {[
                  { to: '/', label: 'Home' },
                  { to: '/about', label: 'About' },
                  { to: '/resources', label: 'Rules' },
                  { to: '/faq', label: 'FAQ' },
                ].map(({ to, label }) => (
                  <Link
                    key={to}
                    to={to}
                    className={`block px-4 py-3 text-sm border-b border-gray-50 transition-colors ${isActive(to) ? 'text-royal font-semibold bg-sky/30' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                  >
                    {label}
                  </Link>
                ))}
                <div className="border-t border-gray-100">
                  {!user ? (
                    <>
                      <Link to="/register" className="block px-4 py-3 text-sm font-semibold text-saffron-dark hover:bg-cream">Register Now</Link>
                      <Link to="/login" className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50">Login</Link>
                    </>
                  ) : (
                    <>
                      <Link to={role === 'admin' ? '/admin' : '/user-dashboard'} className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50">Dashboard</Link>
                      <button onClick={handleLogout} className="block w-full text-left px-4 py-3 text-sm text-red-500 hover:bg-red-50">Logout</button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Royal Blue Banner */}
      <div className="bg-royal text-white text-center py-2.5 text-xs font-medium tracking-wider uppercase">
        🏏 National Level IPL PowerPlay Score Prediction Hackathon — Sona Gameathon 2026
      </div>
    </>
  );
};

export default Navbar;