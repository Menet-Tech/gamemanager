import React, { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';
import { 
  ArrowLeft, 
  Save, 
  RefreshCw, 
  FileText, 
  Settings, 
  Zap, 
  ShieldAlert, 
  Heart, 
  Cpu, 
  Search,
  Eye,
  EyeOff,
  AlertTriangle,
  Info
} from 'lucide-react';

export default function ConfigEditor({ profile, onBack }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Config data
  const [isParsed, setIsParsed] = useState(false);
  const [rawConfig, setRawConfig] = useState('');
  const [settings, setSettings] = useState({}); // Flat map of key -> value string
  const [metadata, setMetadata] = useState({}); // Flat map of key -> ConfigValue metadata
  
  // Search & Navigation
  const [searchTerm, setSearchTerm] = useState('');
  const [activeEditorTab, setActiveEditorTab] = useState('form'); // 'form' or 'raw'
  const [activeCategoryTab, setActiveCategoryTab] = useState('General');

  // Password visibility maps
  const [visiblePasswords, setVisiblePasswords] = useState({});

  useEffect(() => {
    fetchConfig();
  }, [profile.id]);

  const fetchConfig = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch(`/profiles/${profile.id}/config`);
      setRawConfig(data.raw || '');
      setIsParsed(data.isParsed || false);
      
      if (data.isParsed && data.settings) {
        const flatSettings = {};
        const meta = {};
        Object.entries(data.settings).forEach(([key, confVal]) => {
          flatSettings[key] = confVal.value;
          meta[key] = confVal;
        });
        setSettings(flatSettings);
        setMetadata(meta);
        setActiveEditorTab('form');
      } else {
        setActiveEditorTab('raw');
      }
    } catch (err) {
      setError(err.message || 'Failed to retrieve configuration file from host.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const useForm = activeEditorTab === 'form' && isParsed;
      
      const payload = {
        raw: rawConfig,
        isParsed: useForm,
        settings: useForm ? settings : {},
      };

      await apiFetch(`/profiles/${profile.id}/config`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setSuccess('Configuration saved successfully and updated on server!');
      setTimeout(() => setSuccess(''), 4000);
      
      // Reload config to get latest clean raw/parsed content
      await fetchConfig();
    } catch (err) {
      setError(err.message || 'Failed to save configuration to host.');
    } finally {
      setSaving(false);
    }
  };

  // Heuristic categorization
  const getCategory = (key) => {
    const k = key.toLowerCase();
    
    if (k.includes('rate') || k.includes('speed') || k.includes('multiplier') || k.includes('span') || k.includes('time') || k.includes('cooldown') || k.includes('interval') || k.includes('hours') || k.includes('days')) {
      return 'Rates & Multipliers';
    }
    if (k.includes('damage') || k.includes('defense') || k.includes('attack') || k.includes('friendlyfire') || k.includes('pvp') || k.includes('enhancestat') || k.includes('invader')) {
      return 'Combat & Damage';
    }
    if (k.includes('stomach') || k.includes('stamina') || k.includes('hpregene') || k.includes('deathpenalty') || k.includes('dropitem') || k.includes('egg') || k.includes('maxnum') || k.includes('limit')) {
      return 'Survival & Limits';
    }
    if (k.includes('build') || k.includes('camp') || k.includes('guild') || k.includes('backup') || k.includes('log') || k.includes('crossplay') || k.includes('multiplay') || k.includes('fasttravel') || k.includes('startlocation') || k.includes('logout')) {
      return 'Building & System';
    }
    
    return 'General';
  };

  const categories = [
    { name: 'General', icon: Settings },
    { name: 'Rates & Multipliers', icon: Zap },
    { name: 'Combat & Damage', icon: ShieldAlert },
    { name: 'Survival & Limits', icon: Heart },
    { name: 'Building & System', icon: Cpu },
  ];

  // Update a setting value in form editor
  const updateSetting = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const togglePasswordVisibility = (key) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Filter and group keys
  const keys = Object.keys(settings);
  const filteredKeys = keys.filter(key => {
    const matchesSearch = key.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = getCategory(key) === activeCategoryTab;
    return matchesSearch && (searchTerm ? true : matchesCategory);
  }).sort();

  // Helper to detect if a key looks like a password
  const isPasswordField = (key) => {
    return key.toLowerCase().includes('password');
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-500">
        <RefreshCw className="animate-spin w-8 h-8 text-primary-500 mb-3" />
        <span className="text-sm">Connecting to server and reading config...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl animate-fade-in pb-12">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/60">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800/40 transition-all border border-slate-800"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white truncate max-w-[300px] sm:max-w-none">
              Editing: {profile.name}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">
              {profile.hostName} &bull; {profile.configPath}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Editor type tabs */}
          {isParsed && (
            <div className="inline-flex p-1 rounded-xl bg-slate-950/60 border border-slate-850">
              <button
                onClick={() => setActiveEditorTab('form')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  activeEditorTab === 'form' 
                    ? 'bg-primary-600 text-white shadow' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Form Editor</span>
              </button>
              <button
                onClick={() => setActiveEditorTab('raw')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  activeEditorTab === 'raw' 
                    ? 'bg-primary-600 text-white shadow' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Raw Text</span>
              </button>
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600 text-white font-semibold text-sm flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-600/20"
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </div>

      {/* Save Success/Error Banner */}
      {error && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-accent-rose/10 border border-accent-rose/25 text-accent-rose text-sm">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-emerald-600/10 border border-emerald-500/25 text-emerald-400 text-sm">
          <Info className="w-5 h-5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* FORM EDITOR STATE */}
      {activeEditorTab === 'form' && isParsed ? (
        <div className="space-y-6">
          {/* Search filter and quick stats */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-950/45 border border-slate-800/40">
            <div className="relative flex-1 max-w-md">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search server settings (e.g. ExpRate, ServerName)..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              />
            </div>
            
            <div className="text-xs text-slate-400 font-medium">
              Showing <span className="text-white font-semibold">{filteredKeys.length}</span> of <span className="text-white font-semibold">{keys.length}</span> total configurations
            </div>
          </div>

          {/* Form Tabs (Category filters) - Hidden when searching */}
          {!searchTerm && (
            <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-thin">
              {categories.map((cat) => {
                const CatIcon = cat.icon;
                const isCatActive = activeCategoryTab === cat.name;
                return (
                  <button
                    key={cat.name}
                    onClick={() => setActiveCategoryTab(cat.name)}
                    className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all ${
                      isCatActive 
                        ? 'bg-slate-900 border-primary-500/35 text-white shadow shadow-primary-500/10' 
                        : 'bg-slate-950/30 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-950/65'
                    }`}
                  >
                    <CatIcon className={`w-4 h-4 ${isCatActive ? 'text-primary-500' : 'text-slate-400'}`} />
                    <span>{cat.name}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Configuration Inputs Grid */}
          <div className="p-6 rounded-2xl glass grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            {filteredKeys.map((key) => {
              const meta = metadata[key];
              const value = settings[key];

              return (
                <div key={key} className="flex flex-col justify-between py-3 border-b border-slate-800/35 hover:border-slate-850 transition-colors">
                  <div className="mb-2">
                    <span className="font-mono text-sm font-semibold text-white truncate block" title={key}>
                      {key}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono capitalize tracking-wider mt-0.5 inline-block">
                      Type: {meta?.type || 'string'} {meta?.isQuoted ? '(Quoted)' : ''} {meta?.isParen ? '(List)' : ''}
                    </span>
                  </div>

                  {/* Dynamic inputs based on detected types */}
                  <div className="mt-1">
                    {/* BOOLEAN INPUT (TOGGLE) */}
                    {meta?.type === 'bool' && (
                      <button
                        type="button"
                        onClick={() => updateSetting(key, value.toLowerCase() === 'true' ? 'False' : 'True')}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-dark-900 ${
                          value.toLowerCase() === 'true' ? 'bg-primary-600' : 'bg-slate-800'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            value.toLowerCase() === 'true' ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    )}

                    {/* ENUM SELECT INPUT (DEATH PENALTY etc.) */}
                    {key === 'DeathPenalty' && (
                      <select
                        value={value}
                        onChange={(e) => updateSetting(key, e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                      >
                        <option value="None">None (Keep All Items)</option>
                        <option value="Item">Item (Drop Items)</option>
                        <option value="Equipment">Equipment (Drop Equipment)</option>
                        <option value="All">All (Drop Items & Equipment)</option>
                      </select>
                    )}

                    {/* NUMBER INPUT */}
                    {meta?.type === 'number' && key !== 'DeathPenalty' && (
                      <input
                        type="number"
                        value={value}
                        step={value.includes('.') ? "0.0001" : "1"}
                        onChange={(e) => updateSetting(key, e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                      />
                    )}

                    {/* PASSWORD INPUT */}
                    {meta?.type === 'string' && isPasswordField(key) && (
                      <div className="relative">
                        <input
                          type={visiblePasswords[key] ? 'text' : 'password'}
                          value={value}
                          onChange={(e) => updateSetting(key, e.target.value)}
                          placeholder="Empty (Not Set)"
                          className="w-full pl-3 pr-10 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility(key)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-white"
                        >
                          {visiblePasswords[key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    )}

                    {/* STANDARD TEXT/ARRAY INPUT */}
                    {meta?.type === 'string' && !isPasswordField(key) && key !== 'DeathPenalty' && (
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => updateSetting(key, e.target.value)}
                        placeholder="Empty (Not Set)"
                        className="w-full px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                      />
                    )}

                    {/* ARRAY INPUT */}
                    {meta?.type === 'array' && (
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => updateSetting(key, e.target.value)}
                        placeholder="e.g. Steam,Xbox"
                        className="w-full px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                      />
                    )}
                  </div>
                </div>
              );
            })}

            {filteredKeys.length === 0 && (
              <div className="col-span-full text-center py-10 text-slate-500">
                No matching configuration options found.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* RAW EDITOR STATE */
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs flex items-start gap-2.5">
            <Info className="w-5 h-5 shrink-0" />
            <div>
              <span className="font-bold">Raw Config Mode: </span>
              Be extremely careful when editing directly. Incorrect syntax, missing brackets, or bad characters can cause the game server settings to fail on startup. Always make backups.
            </div>
          </div>
          
          <div className="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden font-mono text-sm">
            <textarea
              value={rawConfig}
              onChange={(e) => setRawConfig(e.target.value)}
              rows="22"
              className="w-full p-6 bg-transparent text-slate-300 focus:outline-none resize-none font-mono leading-relaxed"
              placeholder="Paste raw configuration settings here..."
            />
          </div>
        </div>
      )}
    </div>
  );
}
