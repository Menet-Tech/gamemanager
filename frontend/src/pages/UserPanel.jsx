import React, { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';
import { FileEdit, Server, AlertCircle, Gamepad2 } from 'lucide-react';

export default function UserPanel({ onEditConfig }) {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMyProfiles();
  }, []);

  const fetchMyProfiles = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/profiles');
      setProfiles(data || []);
    } catch (err) {
      setError(err.message || 'Failed to retrieve your game profiles.');
    } finally {
      setLoading(false);
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
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-accent-violet/10 text-accent-violet border border-accent-violet/20 uppercase tracking-wider">
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
                </div>
              </div>

              <button
                onClick={() => onEditConfig(p)}
                className="w-full py-2.5 rounded-xl bg-slate-950/60 hover:bg-primary-600 border border-slate-800 hover:border-transparent text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all group-hover:shadow-lg group-hover:shadow-primary-600/10"
              >
                <FileEdit className="w-4 h-4" />
                <span>Edit Configuration</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
