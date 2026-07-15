import React, { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';
import { FileEdit, Server, AlertCircle, Gamepad2, RefreshCw, ArrowUpCircle, X } from 'lucide-react';

export default function UserPanel({ onEditConfig }) {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [restartingId, setRestartingId] = useState(null);
  const [checkingUpdateId, setCheckingUpdateId] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [versions, setVersions] = useState({});
  const [versionLoading, setVersionLoading] = useState({});
  const [updateModal, setUpdateModal] = useState(null);
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    fetchMyProfiles();
  }, []);

  const fetchMyProfiles = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/profiles');
      setProfiles(data || []);
      if (data && data.length > 0) {
        data.forEach(p => fetchVersion(p.id));
      }
    } catch (err) {
      setError(err.message || 'Failed to retrieve your game profiles.');
    } finally {
      setLoading(false);
    }
  };

  const fetchVersion = async (profileID) => {
    setVersionLoading(prev => ({ ...prev, [profileID]: true }));
    try {
      const res = await apiFetch(`/profiles/${profileID}/version`);
      setVersions(prev => ({ ...prev, [profileID]: res.version }));
    } catch (err) {
      setVersions(prev => ({ ...prev, [profileID]: 'Unknown' }));
    } finally {
      setVersionLoading(prev => ({ ...prev, [profileID]: false }));
    }
  };

  const handleRestartServer = async (profile) => {
    if (!window.confirm(`Are you sure you want to restart the server for "${profile.name}"?`)) return;
    setRestartingId(profile.id);
    setActionSuccess('');
    setActionError('');
    try {
      const res = await apiFetch(`/profiles/${profile.id}/restart`, {
        method: 'POST',
      });
      setActionSuccess(res?.message || 'Server restarted successfully!');
      setTimeout(() => setActionSuccess(''), 5000);
    } catch (err) {
      setActionError(err.message || 'Failed to restart server.');
      setTimeout(() => setActionError(''), 6000);
    } finally {
      setRestartingId(null);
    }
  };

  const handleCheckUpdate = async (profile) => {
    setCheckingUpdateId(profile.id);
    setActionSuccess('');
    setActionError('');
    try {
      const res = await apiFetch(`/profiles/${profile.id}/check-update`);
      setUpdateModal({
        profile,
        localBuild: res.localBuild,
        latestBuild: res.latestBuild,
        localVersion: res.localVersion,
        latestVersion: res.latestVersion,
        updateAvailable: res.updateAvailable
      });
    } catch (err) {
      setActionError(err.message || 'Failed to check for updates.');
      setTimeout(() => setActionError(''), 6000);
    } finally {
      setCheckingUpdateId(null);
    }
  };

  const handleRunUpdate = async (profile) => {
    setUpdateModal(null);
    setUpdatingId(profile.id);
    setActionSuccess('');
    setActionError('');
    try {
      const res = await apiFetch(`/profiles/${profile.id}/update`, {
        method: 'POST',
      });
      setActionSuccess(res?.message || 'Server updated successfully!');
      setTimeout(() => setActionSuccess(''), 5000);
      fetchVersion(profile.id);
    } catch (err) {
      setActionError(err.message || 'Failed to update server.');
      setTimeout(() => setActionError(''), 6000);
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-500">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary-500 border-r-2 mr-3"></div>
        <span>Loading assigned profiles...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-4 rounded-xl bg-accent-rose/10 border border-accent-rose/25 text-accent-rose text-sm">
        <AlertCircle className="w-5 h-5 shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success/Error Toast Banners */}
      {actionError && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-accent-rose/10 border border-accent-rose/25 text-accent-rose text-sm animate-fade-in">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}
      {actionSuccess && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-emerald-600/10 border border-emerald-500/25 text-emerald-400 text-sm animate-fade-in">
          <RefreshCw className="w-5 h-5 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}
      {profiles.length === 0 ? (
        <div className="text-center py-16 glass rounded-2xl p-8">
          <Gamepad2 className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white">No Profiles Assigned</h3>
          <p className="text-slate-400 text-sm mt-1 max-w-md mx-auto">
            You do not have access to any game profiles yet. Please request permission from the system administrator.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
          {profiles.map((p) => (
            <div 
              key={p.id} 
              className="group p-6 rounded-2xl glass glass-hover relative overflow-hidden flex flex-col justify-between"
            >
              {/* Neon border decoration */}
              <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-primary-500 to-accent-violet opacity-80 group-hover:opacity-100 transition-opacity"></div>

              <div>
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-bold text-white group-hover:text-primary-400 transition-colors truncate max-w-[200px]" title={p.name}>
                    {p.name}
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-accent-violet/10 text-accent-violet border border-accent-violet/20 uppercase tracking-wider animate-pulse">
                    {p.gameType}
                  </span>
                </div>

                <div className="space-y-2.5 mb-6 text-xs text-slate-400 font-sans">
                  <div className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-slate-500 shrink-0" />
                    <span className="truncate" title={p.hostName}>Host: {p.hostName}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <FileEdit className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
                    <span className="font-mono text-slate-500 truncate" title={p.configPath}>
                      {p.configPath}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Gamepad2 className="w-4 h-4 text-slate-500 shrink-0" />
                    <span className="truncate">
                      Version: {versionLoading[p.id] ? (
                        <span className="text-slate-500 animate-pulse">Checking...</span>
                      ) : (
                        <span className="font-semibold text-slate-300">{versions[p.id] || 'Not checked'}</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              <div className={`grid ${p.steamAppId > 0 ? 'grid-cols-3' : 'grid-cols-2'} gap-2 mt-auto`}>
                <button
                  onClick={() => onEditConfig(p)}
                  className="py-2 px-2.5 rounded-xl bg-slate-950/60 hover:bg-primary-600 border border-slate-800 hover:border-transparent text-white font-semibold text-[11px] flex items-center justify-center gap-1 transition-all"
                  title="Edit Configuration"
                >
                  <FileEdit className="w-3 h-3" />
                  <span>Edit Config</span>
                </button>
                <button
                  onClick={() => handleRestartServer(p)}
                  disabled={restartingId === p.id}
                  className="py-2 px-2.5 rounded-xl bg-slate-950/60 hover:bg-amber-600 border border-slate-800 hover:border-transparent text-white font-semibold text-[11px] flex items-center justify-center gap-1 transition-all disabled:opacity-50"
                  title="Restart Game Server"
                >
                  <RefreshCw className={`w-3 h-3 ${restartingId === p.id ? 'animate-spin' : ''}`} />
                  <span>{restartingId === p.id ? 'Restarting' : 'Restart'}</span>
                </button>
                {p.steamAppId > 0 && (
                  <button
                    onClick={() => handleCheckUpdate(p)}
                    disabled={checkingUpdateId === p.id || updatingId === p.id}
                    className="py-2 px-2.5 rounded-xl bg-slate-950/60 hover:bg-emerald-600 border border-slate-800 hover:border-transparent text-white font-semibold text-[11px] flex items-center justify-center gap-1 transition-all disabled:opacity-50"
                    title="Check for Server Updates"
                  >
                    {updatingId === p.id ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>Updating...</span>
                      </>
                    ) : checkingUpdateId === p.id ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>Checking</span>
                      </>
                    ) : (
                      <>
                        <ArrowUpCircle className="w-3 h-3" />
                        <span>Cek Update</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* UPDATE CHECKER MODAL */}
      {updateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md p-6 rounded-2xl glass border border-slate-800 animate-fade-in">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <ArrowUpCircle className="w-5 h-5 text-emerald-500" />
                <span>Update Checker</span>
              </h3>
              <button 
                onClick={() => setUpdateModal(null)}
                className="text-slate-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <span className="text-xs text-slate-400 font-semibold block mb-0.5">Game Profile</span>
                <span className="text-sm text-white font-bold">{updateModal.profile.name}</span>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-slate-950/40 p-3.5 rounded-xl border border-slate-850">
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold block mb-0.5 uppercase tracking-wider">Versi Saat Ini</span>
                  <span className="text-sm text-slate-300 font-bold block truncate" title={updateModal.localVersion}>
                    {updateModal.localVersion !== 'Unknown' ? updateModal.localVersion.replace('Game version is ', '') : 'Unknown'}
                  </span>
                  <span className="text-[9px] text-slate-500 block font-mono">Build: {updateModal.localBuild}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold block mb-0.5 uppercase tracking-wider">Versi Terbaru</span>
                  <span className="text-sm text-emerald-400 font-bold block truncate" title={updateModal.latestVersion}>
                    {updateModal.latestVersion !== 'Unknown' ? updateModal.latestVersion : 'Unknown'}
                  </span>
                  <span className="text-[9px] text-slate-500 block font-mono">Build: {updateModal.latestBuild}</span>
                </div>
              </div>

              {updateModal.updateAvailable ? (
                <div className="p-3.5 rounded-xl bg-emerald-650/10 border border-emerald-500/20 text-emerald-400 text-sm">
                  Pembaluan tersedia! Versi terbaru terdeteksi di Steam.
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-slate-800/20 border border-slate-800 text-slate-400 text-sm">
                  Server Anda sudah menggunakan versi paling mutakhir.
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-800/60">
              <button
                onClick={() => setUpdateModal(null)}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all text-xs font-semibold"
              >
                {updateModal.updateAvailable ? 'Cancel' : 'Close'}
              </button>
              {updateModal.updateAvailable && (
                <button
                  onClick={() => handleRunUpdate(updateModal.profile)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all shadow-md shadow-emerald-600/10"
                >
                  Update Sekarang
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
