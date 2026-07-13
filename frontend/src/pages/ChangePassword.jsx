import React, { useState } from 'react';
import { apiFetch } from '../utils/api';
import { KeyRound, Eye, EyeOff, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

export default function ChangePassword({ onPasswordChangeSuccess }) {
  const [oldPassword, setOldPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPass, setShowOldPass] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!oldPassword) {
      setError('Current password is required');
      return;
    }

    if (!password) {
      setError('Password cannot be empty');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      await apiFetch('/me/change-password', {
        method: 'POST',
        body: JSON.stringify({ oldPassword, password }),
      });

      setSuccess('Your password has been changed successfully!');
      setOldPassword('');
      setPassword('');
      setConfirmPassword('');
      
      if (onPasswordChangeSuccess) {
        setTimeout(() => {
          onPasswordChangeSuccess();
        }, 1500);
      }
    } catch (err) {
      setError(err.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 rounded-2xl glass animate-fade-in">
      <div className="flex items-center gap-3 mb-6 pb-3 border-b border-slate-800/40">
        <div className="p-2.5 bg-primary-600/10 border border-primary-500/20 text-primary-500 rounded-xl">
          <KeyRound className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Change Password</h2>
          <p className="text-xs text-slate-400 mt-0.5">Update your account security password</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3.5 mb-5 rounded-xl bg-accent-rose/10 border border-accent-rose/25 text-accent-rose text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-3.5 mb-5 rounded-xl bg-emerald-600/10 border border-emerald-500/25 text-emerald-400 text-sm">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Current Password */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5 ml-1">Current Password</label>
          <div className="relative">
            <input
              type={showOldPass ? 'text' : 'password'}
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="Enter current password"
              disabled={loading}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950/45 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all font-mono"
            />
            <button
              type="button"
              onClick={() => setShowOldPass(!showOldPass)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-white"
            >
              {showOldPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5 ml-1">New Password</label>
          <div className="relative">
            <input
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 6 characters"
              disabled={loading}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950/45 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all font-mono"
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-white"
            >
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Confirm Password */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5 ml-1">Confirm New Password</label>
          <div className="relative">
            <input
              type={showConfirmPass ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat password"
              disabled={loading}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950/45 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all font-mono"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPass(!showConfirmPass)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-white"
            >
              {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-primary-600/10 disabled:opacity-50"
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Updating...
            </>
          ) : (
            'Update Password'
          )}
        </button>
      </form>
    </div>
  );
}
