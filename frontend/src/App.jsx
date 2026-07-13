import React, { useState, useEffect } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ChangePassword from './pages/ChangePassword';
import { apiFetch } from './utils/api';
import { RefreshCw } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthSession();
  }, []);

  const checkAuthSession = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const data = await apiFetch('/me');
      setUser(data);
    } catch (err) {
      console.error('Session validation failed:', err);
      // Clean invalid session data
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      localStorage.removeItem('username');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = (userData) => {
    setUser({
      username: userData.username,
      role: userData.role,
      mustChangePassword: userData.mustChangePassword,
    });
  };

  const handlePasswordChangeSuccess = () => {
    setUser(prev => ({
      ...prev,
      mustChangePassword: false
    }));
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('username');
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-dark-950 dots-pattern">
        {/* Glow decoration */}
        <div className="absolute w-72 h-72 bg-primary-600/10 rounded-full blur-[96px] pointer-events-none"></div>
        <RefreshCw className="animate-spin w-8 h-8 text-primary-500 mb-3 relative z-10" />
        <span className="text-sm text-slate-400 font-medium relative z-10">Validating security credentials...</span>
      </div>
    );
  }

  if (user) {
    if (user.mustChangePassword) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-dark-950 dots-pattern px-4">
          <div className="w-full max-w-md">
            <div className="p-4 mb-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs text-center font-medium">
              For security reasons, you must change your password before you can access the dashboard.
            </div>
            <ChangePassword onPasswordChangeSuccess={handlePasswordChangeSuccess} />
          </div>
        </div>
      );
    }
    return <Dashboard user={user} onLogout={handleLogout} />;
  }

  return <Login onLoginSuccess={handleLoginSuccess} />;
}
