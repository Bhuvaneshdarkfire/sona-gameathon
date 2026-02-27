import { useState, useEffect, createContext, useContext, type ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { type User } from 'firebase/auth';
import { onAuthChange } from './services/auth';
import { getTeamByUid } from './services/firestore';
import './App.css';

// Components
import Navbar from './components/Navbar';
import Home from './components/Home';
import Login from './components/Login';
import RegistrationForm from './components/RegistrationForm';
import UserDashboard from './components/UserDashboard';
import AdminDashboard from './components/AdminDashboard';
import AdminSetup from './components/AdminSetup';
import About from './components/About';
import FAQ from './components/FAQ';
import Resources from './components/Resources';

// Auth Context
interface AuthCtx {
  user: User | null;
  role: string | null;
  loading: boolean;
}

export const AuthContext = createContext<AuthCtx>({ user: null, role: null, loading: true });
export const useAuth = () => useContext(AuthContext);

// Route Protection
const ProtectedRoute = ({ children, requiredRole }: { children: ReactNode; requiredRole?: string }) => {
  const { user, role, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <div className="w-10 h-10 border-3 border-royal border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-400 text-sm">Loading...</p>
      </div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (requiredRole && role !== requiredRole) return <Navigate to="/" replace />;

  return children;
};

// Footer
const Footer = () => (
  <footer className="site-footer">
    <div className="max-w-container mx-auto px-4 lg:px-8">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
        {/* Brand */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">🏏</span>
            <span className="font-heading font-bold text-white text-sm">SONA POWERPREDICT</span>
          </div>
          <p className="text-sm leading-relaxed">
            National Level IPL PowerPlay Score Prediction Hackathon by Dept. of CSE, Sona College of Technology.
          </p>
        </div>

        {/* Links */}
        <div>
          <h4 className="font-heading font-semibold text-white text-sm mb-3">Quick Links</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/about">About</Link></li>
            <li><Link to="/resources">Rules</Link></li>
            <li><Link to="/faq">FAQ</Link></li>
          </ul>
        </div>

        {/* Resources */}
        <div>
          <h4 className="font-heading font-semibold text-white text-sm mb-3">Resources</h4>
          <ul className="space-y-2 text-sm">
            <li><a href="https://www.kaggle.com/datasets" target="_blank" rel="noopener noreferrer">Training Data</a></li>
            <li><a href="/sample-model.zip" download>Sample Model</a></li>
            <li><Link to="/register">Register</Link></li>
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h4 className="font-heading font-semibold text-white text-sm mb-3">Contact</h4>
          <ul className="space-y-2 text-sm">
            <li>Sona College of Technology</li>
            <li>Salem, Tamil Nadu</li>
            <li><a href="mailto:csd@sonatech.ac.in">csd@sonatech.ac.in</a></li>
          </ul>
        </div>
      </div>

      {/* Bottom */}
      <div className="border-t border-gray-700 pt-5 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-xs">© 2026 Sona PowerPredict. All rights reserved.</p>
        <div className="flex gap-4 text-xs">
          <Link to="/about">About</Link>
          <Link to="/resources">Rules</Link>
          <Link to="/faq">FAQ</Link>
        </div>
      </div>
    </div>
  </footer>
);

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthChange(async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const team: any = await getTeamByUid(firebaseUser.uid);
          setRole(team?.role ?? 'user');
        } catch {
          setRole('user');
        }
      } else {
        setRole(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, loading }}>
      <Router>
        <div className="font-body antialiased text-slate min-h-screen bg-white flex flex-col">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/resources" element={<Resources />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<RegistrationForm onRegister={() => { }} />} />
              <Route
                path="/user-dashboard"
                element={
                  <ProtectedRoute requiredRole="user">
                    <UserDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route path="/admin-setup" element={<AdminSetup />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </AuthContext.Provider>
  );
}

export default App;