import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Components
import Navbar from './components/Navbar'; // New Navbar
import Home from './components/Home';
import Login from './components/Login';
import RegistrationForm from './components/RegistrationForm';
import UserDashboard from './components/UserDashboard';
import AdminDashboard from './components/AdminDashboard';

// Route Protection
const ProtectedRoute = ({ children, role }: { children: JSX.Element, role?: string }) => {
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('role');

  if (!token) return <Navigate to="/login" replace />;
  if (role && userRole !== role) return <Navigate to="/" replace />; 

  return children;
};

function App() {
  return (
    <Router>
      <div className="font-sans antialiased text-gray-100 min-h-screen bg-[#020617]">
        
        {/* Persistent Navigation Bar */}
        <Navbar />

        {/* Routes */}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<RegistrationForm onRegister={() => {}} />} />

          {/* User Dashboard */}
          <Route 
            path="/user-dashboard" 
            element={
              <ProtectedRoute role="user">
                <div className="pt-20"> {/* Padding for fixed Navbar */}
                  <UserDashboard />
                </div>
              </ProtectedRoute>
            } 
          />

          {/* Admin Dashboard */}
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute role="admin">
                <div className="pt-20">
                  <AdminDashboard />
                </div>
              </ProtectedRoute>
            } 
          />

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;