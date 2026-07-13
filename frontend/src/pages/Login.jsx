import React, { useState } from 'react';
import { apiFetch } from '../utils/api';
import { KeyRound, User, AlertCircle, RefreshCw } from 'lucide-react';

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Username and password are required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await apiFetch('/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });

      localStorage.setItem('token', data.token);
      localStorage.setItem('role', data.role);
      localStorage.setItem('username', data.username);
      
      onLoginSuccess(data);
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-dark-950 dots-pattern px-4 overflow-hidden">
      {/* Background neon glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-600/20 rounded-full blur-[128px] pointer-events-none glow-glow"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-violet/10 rounded-full blur-[128px] pointer-events-none glow-glow" style={{ animationDelay: '1.5s' }}></div>

      <div className="w-full max-w-md p-8 rounded-2xl glass animate-fade-in relative z-10">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-xl bg-primary-600/10 border border-primary-500/20 text-primary-500 mb-3 shadow-inner">
            <KeyRound className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white font-sans">
            Menet Games Management
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Sign in to manage game configurations
          </p>
        </div>

        {/* Error alert */}
        {error && (
          <div className="flex items-center gap-2 mb-6 p-3 rounded-lg bg-accent-rose/10 border border-accent-rose/20 text-accent-rose text-sm animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Username */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 ml-1">
              Username
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950/50 border border-slate-800 text-white font-sans placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                disabled={loading}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 ml-1">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                <KeyRound className="w-4 h-4" />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950/50 border border-slate-800 text-white font-sans placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                disabled={loading}
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600 text-white font-semibold flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-dark-950 transition-all shadow-lg shadow-primary-600/25 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Signing In...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-800/40 text-center">
          <p className="text-xs text-slate-500">
            For access requests, please contact the administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
