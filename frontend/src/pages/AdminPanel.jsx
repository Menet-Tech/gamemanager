import React, { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';
import { 
  Users, 
  Server, 
  FileCode, 
  Link2, 
  Trash2, 
  Plus, 
  KeyRound, 
  AlertCircle,
  X,
  CheckCircle,
  Eye,
  EyeOff,
  Pencil
} from 'lucide-react';

export default function AdminPanel({ section }) {
  // Common states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Data lists
  const [users, setUsers] = useState([]);
  const [hosts, setHosts] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [links, setLinks] = useState([]);

  // Form states - Users
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('user');
  const [forceReset, setForceReset] = useState(false);
  const [changePasswordUserId, setChangePasswordUserId] = useState(null);
  const [updatedPassword, setUpdatedPassword] = useState('');

  // Form states - Hosts
  const [hostName, setHostName] = useState('');
  const [hostIP, setHostIP] = useState('');
  const [hostPort, setHostPort] = useState(22);
  const [hostUsername, setHostUsername] = useState('');
  const [hostPassword, setHostPassword] = useState('');
  const [hostRestartCommand, setHostRestartCommand] = useState('');
  const [hostVersionCommand, setHostVersionCommand] = useState('');
  const [hostUpdateCommand, setHostUpdateCommand] = useState('');
  const [hostLocalBuildCommand, setHostLocalBuildCommand] = useState('');

  // Form states - Profiles
  const [profileName, setProfileName] = useState('');
  const [gameType, setGameType] = useState('Palworld');
  const [profileHostId, setProfileHostId] = useState('0'); // '0' means local system
  const [configPath, setConfigPath] = useState('');

  // Edit states
  const [editingHost, setEditingHost] = useState(null);
  const [editingProfile, setEditingProfile] = useState(null);

  // Form states - Linking
  const [linkUserId, setLinkUserId] = useState('');
  const [linkProfileId, setLinkProfileId] = useState('');

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    fetchData();
  }, [section]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      if (section === 'users') {
        const data = await apiFetch('/admin/users');
        setUsers(data || []);
      } else if (section === 'hosts') {
        const data = await apiFetch('/admin/hosts');
        setHosts(data || []);
      } else if (section === 'profiles') {
        const pData = await apiFetch('/admin/profiles');
        setProfiles(pData || []);
        const hData = await apiFetch('/admin/hosts');
        setHosts(hData || []);
      } else if (section === 'linking') {
        const lData = await apiFetch('/admin/user-profiles');
        setLinks(lData || []);
        const uData = await apiFetch('/admin/users');
        setUsers(uData || []);
        const pData = await apiFetch('/admin/profiles');
        setProfiles(pData || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load panel data.');
    } finally {
      setLoading(false);
    }
  };

  const showSuccessMessage = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 4000);
  };

  // --- CRUD ACTIONS ---

  // Add User
  const handleAddUser = async (e) => {
    e.preventDefault();
    setError('');
    if (!newUsername || !newPassword) {
      setError('Username and password are required');
      return;
    }

    try {
      await apiFetch('/admin/users', {
        method: 'POST',
        body: JSON.stringify({ username: newUsername, password: newPassword, role: newRole, mustChangePassword: forceReset }),
      });
      setNewUsername('');
      setNewPassword('');
      setNewRole('user');
      setForceReset(false);
      showSuccessMessage('User added successfully!');
      fetchData();
    } catch (err) {
      setError(err.message || 'Failed to add user');
    }
  };

  // Change Password
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    if (!updatedPassword) {
      setError('Password cannot be empty');
      return;
    }

    try {
      await apiFetch(`/admin/users/${changePasswordUserId}/password`, {
        method: 'PUT',
        body: JSON.stringify({ password: updatedPassword }),
      });
      setChangePasswordUserId(null);
      setUpdatedPassword('');
      showSuccessMessage('Password changed successfully!');
    } catch (err) {
      setError(err.message || 'Failed to change password');
    }
  };

  // Delete User
  const handleDeleteUser = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    setError('');
    try {
      await apiFetch(`/admin/users/${id}`, { method: 'DELETE' });
      showSuccessMessage('User deleted.');
      fetchData();
    } catch (err) {
      setError(err.message || 'Failed to delete user');
    }
  };

  // Add Host Server
  const handleAddHost = async (e) => {
    e.preventDefault();
    setError('');
    if (!hostName) {
      setError('Host Name is required');
      return;
    }

    try {
      await apiFetch('/admin/hosts', {
        method: 'POST',
        body: JSON.stringify({
          name: hostName,
          ip: hostIP || 'localhost',
          port: parseInt(hostPort) || 22,
          username: hostUsername,
          password: hostPassword,
          restartCommand: hostRestartCommand,
          versionCommand: hostVersionCommand,
          updateCommand: hostUpdateCommand,
          localBuildCommand: hostLocalBuildCommand
        }),
      });
      setHostName('');
      setHostIP('');
      setHostPort(22);
      setHostUsername('');
      setHostPassword('');
      setHostRestartCommand('');
      setHostVersionCommand('');
      setHostUpdateCommand('');
      setHostLocalBuildCommand('');
      showSuccessMessage('Host server added!');
      fetchData();
    } catch (err) {
      setError(err.message || 'Failed to add host');
    }
  };

  // Delete Host
  const handleDeleteHost = async (id) => {
    if (!window.confirm('Are you sure you want to delete this server? This will also delete any configuration profiles linked to it.')) return;
    setError('');
    try {
      await apiFetch(`/admin/hosts/${id}`, { method: 'DELETE' });
      showSuccessMessage('Host server deleted.');
      fetchData();
    } catch (err) {
      setError(err.message || 'Failed to delete host');
    }
  };

  // Add Profile
  const handleAddProfile = async (e) => {
    e.preventDefault();
    setError('');
    if (!profileName || !configPath) {
      setError('Profile Name and Config Path are required');
      return;
    }

    try {
      await apiFetch('/admin/profiles', {
        method: 'POST',
        body: JSON.stringify({
          name: profileName,
          gameType,
          hostId: parseInt(profileHostId),
          configPath
        }),
      });
      setProfileName('');
      setConfigPath('');
      showSuccessMessage('Game configuration profile added!');
      fetchData();
    } catch (err) {
      setError(err.message || 'Failed to add profile');
    }
  };

  // Delete Profile
  const handleDeleteProfile = async (id) => {
    if (!window.confirm('Are you sure you want to delete this profile? User assignments to this profile will also be removed.')) return;
    setError('');
    try {
      await apiFetch(`/admin/profiles/${id}`, { method: 'DELETE' });
      showSuccessMessage('Game profile deleted.');
      fetchData();
    } catch (err) {
      setError(err.message || 'Failed to delete profile');
    }
  };

  const startEditHost = (host) => {
    setEditingHost(host);
    setHostName(host.name || '');
    setHostIP(host.ip || '');
    setHostPort(host.port || 22);
    setHostUsername(host.username || '');
    setHostPassword('');
    setHostRestartCommand(host.restartCommand || '');
    setHostVersionCommand(host.versionCommand || '');
    setHostUpdateCommand(host.updateCommand || '');
    setHostLocalBuildCommand(host.localBuildCommand || '');
  };

  const handleEditHost = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await apiFetch(`/admin/hosts/${editingHost.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: hostName,
          ip: hostIP,
          port: parseInt(hostPort) || 22,
          username: hostUsername,
          password: hostPassword,
          restartCommand: hostRestartCommand,
          versionCommand: hostVersionCommand,
          updateCommand: hostUpdateCommand,
          localBuildCommand: hostLocalBuildCommand
        }),
      });
      setEditingHost(null);
      setHostName('');
      setHostIP('');
      setHostPort(22);
      setHostUsername('');
      setHostPassword('');
      setHostRestartCommand('');
      setHostVersionCommand('');
      setHostUpdateCommand('');
      setHostLocalBuildCommand('');
      showSuccessMessage('Host server updated successfully!');
      fetchData();
    } catch (err) {
      setError(err.message || 'Failed to update host');
    }
  };

  const startEditProfile = (profile) => {
    setEditingProfile(profile);
    setProfileName(profile.name || '');
    setGameType(profile.gameType || 'Palworld');
    setProfileHostId(profile.hostId ? profile.hostId.toString() : '0');
    setConfigPath(profile.configPath || '');
  };

  const handleEditProfile = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await apiFetch(`/admin/profiles/${editingProfile.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: profileName,
          gameType,
          hostId: parseInt(profileHostId),
          configPath
        }),
      });
      setEditingProfile(null);
      setProfileName('');
      setGameType('Palworld');
      setProfileHostId('0');
      setConfigPath('');
      showSuccessMessage('Game profile updated successfully!');
      fetchData();
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    }
  };

  // Link User to Profile
  const handleAddLink = async (e) => {
    e.preventDefault();
    setError('');
    if (!linkUserId || !linkProfileId) {
      setError('Please select both a user and a profile');
      return;
    }

    try {
      await apiFetch('/admin/user-profiles', {
        method: 'POST',
        body: JSON.stringify({
          userId: parseInt(linkUserId),
          profileId: parseInt(linkProfileId)
        }),
      });
      setLinkUserId('');
      setLinkProfileId('');
      showSuccessMessage('Profile linked to user successfully!');
      fetchData();
    } catch (err) {
      setError(err.message || 'Failed to link profile');
    }
  };

  // Unlink
  const handleUnlink = async (userId, profileId) => {
    if (!window.confirm('Are you sure you want to remove access for this user to this profile?')) return;
    setError('');
    try {
      await apiFetch(`/admin/user-profiles?userId=${userId}&profileId=${profileId}`, {
        method: 'DELETE',
      });
      showSuccessMessage('Profile access unlinked.');
      fetchData();
    } catch (err) {
      setError(err.message || 'Failed to unlink');
    }
  };

  return (
    <div className="space-y-6 max-w-6xl animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-primary-600/10 border border-primary-500/20 text-primary-500 rounded-xl">
          {section === 'users' && <Users className="w-6 h-6" />}
          {section === 'hosts' && <Server className="w-6 h-6" />}
          {section === 'profiles' && <FileCode className="w-6 h-6" />}
          {section === 'linking' && <Link2 className="w-6 h-6" />}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white capitalize">
            {section === 'linking' ? 'Link Game Profiles' : `Manage ${section}`}
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {section === 'users' && 'Add new operators or system admins, and reset passwords.'}
            {section === 'hosts' && 'Register Ubuntu hosting servers for remote configuration operations.'}
            {section === 'profiles' && 'Define paths for Palworld configuration files on target servers.'}
            {section === 'linking' && 'Authorize non-admin users to edit specific game configuration profiles.'}
          </p>
        </div>
      </div>

      {/* Alert Notices */}
      {error && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-accent-rose/10 border border-accent-rose/25 text-accent-rose text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-emerald-600/10 border border-emerald-500/25 text-emerald-400 text-sm">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Panel (1/3 width) */}
        <div className="p-6 rounded-2xl glass">
          <h3 className="text-lg font-bold text-white mb-4 pb-3 border-b border-slate-800/40 flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary-500" />
            <span>Add New</span>
          </h3>

          {/* ADD USER FORM */}
          {section === 'users' && (
            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 ml-1">Username</label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="e.g. gameoperator"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/40 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 ml-1">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950/40 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 ml-1">Role / Privilege</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/50 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                >
                  <option value="user">User (Config Editor Only)</option>
                  <option value="admin">Administrator (Full Access)</option>
                </select>
              </div>
              <div className="flex items-center gap-2 mt-2 px-1">
                <input
                  type="checkbox"
                  id="forceResetCheckbox"
                  checked={forceReset}
                  disabled={loading}
                  onChange={(e) => setForceReset(e.target.checked)}
                  className="rounded border-slate-800 bg-slate-950/50 text-primary-600 focus:ring-primary-550 w-4 h-4"
                />
                <label htmlFor="forceResetCheckbox" className="text-xs font-medium text-slate-400 cursor-pointer select-none">
                  Force password change on first login
                </label>
              </div>
              <button
                type="submit"
                className="w-full mt-2 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-semibold text-sm transition-all"
              >
                Create Account
              </button>
            </form>
          )}

          {/* ADD HOST SERVER FORM */}
          {section === 'hosts' && (
            <form onSubmit={handleAddHost} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 ml-1">Server Friendly Name</label>
                <input
                  type="text"
                  value={hostName}
                  onChange={(e) => setHostName(e.target.value)}
                  placeholder="e.g. Palworld VPS Singapore"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/40 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 ml-1">IP Address / Hostname</label>
                <input
                  type="text"
                  value={hostIP}
                  onChange={(e) => setHostIP(e.target.value)}
                  placeholder="e.g. 192.168.1.100 (blank for localhost)"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/40 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 ml-1">SSH Port</label>
                <input
                  type="number"
                  value={hostPort}
                  onChange={(e) => setHostPort(e.target.value)}
                  placeholder="22"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/40 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 ml-1">SSH Username</label>
                <input
                  type="text"
                  value={hostUsername}
                  onChange={(e) => setHostUsername(e.target.value)}
                  placeholder="e.g. root"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/40 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 ml-1">SSH Password</label>
                <input
                  type="password"
                  value={hostPassword}
                  onChange={(e) => setHostPassword(e.target.value)}
                  placeholder="Server root password"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/40 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 ml-1">Restart Command (optional)</label>
                <input
                  type="text"
                  value={hostRestartCommand}
                  onChange={(e) => setHostRestartCommand(e.target.value)}
                  placeholder="e.g. systemctl restart palworld"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/40 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 ml-1">Version Check Command (optional)</label>
                <input
                  type="text"
                  value={hostVersionCommand}
                  onChange={(e) => setHostVersionCommand(e.target.value)}
                  placeholder="e.g. systemctl status palserver | grep 'Game version is'"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/40 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 ml-1">Update Command (optional)</label>
                <input
                  type="text"
                  value={hostUpdateCommand}
                  onChange={(e) => setHostUpdateCommand(e.target.value)}
                  placeholder="e.g. steamcmd +login anonymous +app_update 2394010 validate +quit"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/40 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 ml-1">Local Build Check Command (optional)</label>
                <input
                  type="text"
                  value={hostLocalBuildCommand}
                  onChange={(e) => setHostLocalBuildCommand(e.target.value)}
                  placeholder="e.g. cat /home/steam/Steam/steamapps/appmanifest_2394010.acf | grep buildid"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/40 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                />
              </div>
              <button
                type="submit"
                className="w-full mt-2 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-semibold text-sm transition-all"
              >
                Register Host Server
              </button>
            </form>
          )}

          {/* ADD GAME PROFILE FORM */}
          {section === 'profiles' && (
            <form onSubmit={handleAddProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 ml-1">Profile Name</label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="e.g. Main Palworld Server"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/40 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 ml-1">Select Game</label>
                <select
                  value={gameType}
                  onChange={(e) => setGameType(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/50 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                >
                  <option value="Palworld">Palworld Settings (Parsed Form)</option>
                  <option value="Other">Other Game (Raw Text Area)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 ml-1">Host Server</label>
                <select
                  value={profileHostId}
                  onChange={(e) => setProfileHostId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/50 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                >
                  <option value="0">Local System (Reads filesystem directly)</option>
                  {hosts.map(h => (
                    <option key={h.id} value={h.id}>{h.name} ({h.ip})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 ml-1">Config File Path on Host</label>
                <input
                  type="text"
                  value={configPath}
                  onChange={(e) => setConfigPath(e.target.value)}
                  placeholder="e.g. /home/steam/Pal/Saved/Config/LinuxServer/PalWorldSettings.ini"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/40 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                />
              </div>
              <button
                type="submit"
                className="w-full mt-2 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-semibold text-sm transition-all"
              >
                Add Game Profile
              </button>
            </form>
          )}

          {/* ADD USER LINK FORM */}
          {section === 'linking' && (
            <form onSubmit={handleAddLink} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 ml-1">Select User</label>
                <select
                  value={linkUserId}
                  onChange={(e) => setLinkUserId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/50 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                >
                  <option value="">-- Choose User --</option>
                  {users.filter(u => u.role !== 'admin').map(u => (
                    <option key={u.id} value={u.id}>{u.username}</option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 mt-1 ml-1">Only non-admin users need configuration mapping.</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 ml-1">Select Game Profile</label>
                <select
                  value={linkProfileId}
                  onChange={(e) => setLinkProfileId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/50 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                >
                  <option value="">-- Choose Profile --</option>
                  {profiles.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.gameType})</option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="w-full mt-2 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-semibold text-sm transition-all"
              >
                Authorize Access
              </button>
            </form>
          )}
        </div>

        {/* List Tables (2/3 width) */}
        <div className="lg:col-span-2 p-6 rounded-2xl glass flex flex-col min-h-[400px]">
          <h3 className="text-lg font-bold text-white mb-4 pb-3 border-b border-slate-800/40">
            Current Registered Listings
          </h3>

          {loading ? (
            <div className="flex-1 flex items-center justify-center text-slate-500 py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary-500 border-r-2 mr-3"></div>
              <span>Fetching listings...</span>
            </div>
          ) : (
            <div className="flex-1 overflow-x-auto">
              {/* USERS LIST TABLE */}
              {section === 'users' && (
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500 font-semibold">
                      <th className="pb-3 pl-2">Username</th>
                      <th className="pb-3">Role</th>
                      <th className="pb-3 text-right pr-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/45">
                    {users.map((u) => (
                      <tr key={u.id} className="text-slate-300 hover:bg-slate-800/10">
                        <td className="py-3.5 pl-2 font-medium text-white">
                          <span>{u.username}</span>
                          {u.mustChangePassword && (
                            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                              Force Reset Pending
                            </span>
                          )}
                        </td>
                        <td className="py-3.5">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            u.role === 'admin' ? 'bg-primary-600/10 text-primary-500' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3.5 text-right pr-2">
                          <div className="inline-flex items-center gap-2">
                            <button
                              onClick={() => setChangePasswordUserId(u.id)}
                              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/50 transition-all"
                              title="Reset Password"
                            >
                              <KeyRound className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u.id)}
                              className="p-2 text-slate-500 hover:text-accent-rose rounded-lg hover:bg-accent-rose/10 transition-all"
                              title="Delete Account"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan="3" className="text-center py-10 text-slate-500">No users found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {/* HOST SERVERS LIST TABLE */}
              {section === 'hosts' && (
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500 font-semibold">
                      <th className="pb-3 pl-2">Server Label</th>
                      <th className="pb-3">Endpoint</th>
                      <th className="pb-3">User</th>
                      <th className="pb-3 text-right pr-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/45">
                    {hosts.map((h) => (
                      <tr key={h.id} className="text-slate-300 hover:bg-slate-800/10">
                        <td className="py-3.5 pl-2 font-medium text-white">{h.name}</td>
                        <td className="py-3.5 text-slate-400 font-mono text-xs">{h.ip}:{h.port}</td>
                        <td className="py-3.5 text-slate-400">{h.username || 'local'}</td>
                        <td className="py-3.5 text-right pr-2">
                          <div className="inline-flex items-center gap-2">
                            <button
                              onClick={() => startEditHost(h)}
                              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/50 transition-all"
                              title="Edit Server"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteHost(h.id)}
                              className="p-2 text-slate-500 hover:text-accent-rose rounded-lg hover:bg-accent-rose/10 transition-all"
                              title="Remove Server"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {hosts.length === 0 && (
                      <tr>
                        <td colSpan="4" className="text-center py-10 text-slate-500">No remote host servers registered. Defaulting to local filesystem.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {/* GAME PROFILES LIST TABLE */}
              {section === 'profiles' && (
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500 font-semibold">
                      <th className="pb-3 pl-2">Profile Name</th>
                      <th className="pb-3">Game Type</th>
                      <th className="pb-3">Host System</th>
                      <th className="pb-3">Path</th>
                      <th className="pb-3 text-right pr-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/45">
                    {profiles.map((p) => (
                      <tr key={p.id} className="text-slate-300 hover:bg-slate-800/10">
                        <td className="py-3.5 pl-2 font-medium text-white">{p.name}</td>
                        <td className="py-3.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-accent-violet/10 text-accent-violet border border-accent-violet/20">
                            {p.gameType}
                          </span>
                        </td>
                        <td className="py-3.5 text-slate-400 text-xs">{p.hostName}</td>
                        <td className="py-3.5 text-slate-400 font-mono text-xs max-w-[150px] truncate" title={p.configPath}>
                          {p.configPath}
                        </td>
                        <td className="py-3.5 text-right pr-2">
                          <div className="inline-flex items-center gap-2">
                            <button
                              onClick={() => startEditProfile(p)}
                              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/50 transition-all"
                              title="Edit Profile"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteProfile(p.id)}
                              className="p-2 text-slate-500 hover:text-accent-rose rounded-lg hover:bg-accent-rose/10 transition-all"
                              title="Delete Profile"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {profiles.length === 0 && (
                      <tr>
                        <td colSpan="5" className="text-center py-10 text-slate-500">No game profiles registered.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {/* USER PROFILE LINKING TABLE */}
              {section === 'linking' && (
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500 font-semibold">
                      <th className="pb-3 pl-2">Operator Username</th>
                      <th className="pb-3">Authorized Profile</th>
                      <th className="pb-3 text-right pr-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/45">
                    {links.map((link, i) => (
                      <tr key={i} className="text-slate-300 hover:bg-slate-800/10">
                        <td className="py-3.5 pl-2 font-medium text-white">{link.username}</td>
                        <td className="py-3.5 text-slate-400">{link.profileName}</td>
                        <td className="py-3.5 text-right pr-2">
                          <button
                            onClick={() => handleUnlink(link.userId, link.profileId)}
                            className="p-2 text-slate-500 hover:text-accent-rose rounded-lg hover:bg-accent-rose/10 transition-all"
                            title="Revoke Access"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {links.length === 0 && (
                      <tr>
                        <td colSpan="3" className="text-center py-10 text-slate-500">No profile links authorized. Standard users cannot edit configs.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>

      {/* PASSWORD RESET MODAL */}
      {changePasswordUserId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md p-6 rounded-2xl glass animate-fade-in">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-primary-500" />
                <span>Reset User Password</span>
              </h3>
              <button 
                onClick={() => {
                  setChangePasswordUserId(null);
                  setUpdatedPassword('');
                }}
                className="text-slate-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">New Password</label>
                <input
                  type="password"
                  value={updatedPassword}
                  onChange={(e) => setUpdatedPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/50 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setChangePasswordUserId(null);
                    setUpdatedPassword('');
                  }}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-semibold text-sm transition-all shadow-md shadow-primary-600/20"
                >
                  Save Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT HOST MODAL */}
      {editingHost !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-lg p-6 rounded-2xl glass animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Server className="w-5 h-5 text-primary-500" />
                <span>Edit Host Server</span>
              </h3>
              <button 
                onClick={() => {
                  setEditingHost(null);
                  setHostName('');
                  setHostIP('');
                  setHostPort(22);
                  setHostUsername('');
                  setHostPassword('');
                  setHostRestartCommand('');
                  setHostVersionCommand('');
                  setHostUpdateCommand('');
                }}
                className="text-slate-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEditHost} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Server Friendly Name</label>
                <input
                  type="text"
                  value={hostName}
                  onChange={(e) => setHostName(e.target.value)}
                  placeholder="e.g. Palworld VPS Singapore"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/50 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">IP Address / Hostname</label>
                <input
                  type="text"
                  value={hostIP}
                  onChange={(e) => setHostIP(e.target.value)}
                  placeholder="e.g. 192.168.1.100 (blank for localhost)"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/50 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">SSH Port</label>
                <input
                  type="number"
                  value={hostPort}
                  onChange={(e) => setHostPort(e.target.value)}
                  placeholder="22"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/50 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">SSH Username</label>
                <input
                  type="text"
                  value={hostUsername}
                  onChange={(e) => setHostUsername(e.target.value)}
                  placeholder="e.g. root"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/50 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">SSH Password</label>
                <input
                  type="password"
                  value={hostPassword}
                  onChange={(e) => setHostPassword(e.target.value)}
                  placeholder="Leave blank to keep existing password"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/50 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Restart Command (optional)</label>
                <input
                  type="text"
                  value={hostRestartCommand}
                  onChange={(e) => setHostRestartCommand(e.target.value)}
                  placeholder="e.g. systemctl restart palworld"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/50 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Version Check Command (optional)</label>
                <input
                  type="text"
                  value={hostVersionCommand}
                  onChange={(e) => setHostVersionCommand(e.target.value)}
                  placeholder="e.g. systemctl status palserver | grep 'Game version is'"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/50 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Update Command (optional)</label>
                <input
                  type="text"
                  value={hostUpdateCommand}
                  onChange={(e) => setHostUpdateCommand(e.target.value)}
                  placeholder="e.g. steamcmd +login anonymous +app_update 2394010 validate +quit"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/50 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Local Build Check Command (optional)</label>
                <input
                  type="text"
                  value={hostLocalBuildCommand}
                  onChange={(e) => setHostLocalBuildCommand(e.target.value)}
                  placeholder="e.g. cat /home/steam/Steam/steamapps/appmanifest_2394010.acf | grep buildid"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/50 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setEditingHost(null);
                    setHostName('');
                    setHostIP('');
                    setHostPort(22);
                    setHostUsername('');
                    setHostPassword('');
                    setHostRestartCommand('');
                    setHostVersionCommand('');
                    setHostUpdateCommand('');
                    setHostLocalBuildCommand('');
                  }}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-semibold text-sm transition-all shadow-md shadow-primary-600/20"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PROFILE MODAL */}
      {editingProfile !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-lg p-6 rounded-2xl glass animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FileCode className="w-5 h-5 text-primary-500" />
                <span>Edit Game Profile</span>
              </h3>
              <button 
                onClick={() => {
                  setEditingProfile(null);
                  setProfileName('');
                  setGameType('Palworld');
                  setProfileHostId('0');
                  setConfigPath('');
                }}
                className="text-slate-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEditProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Profile Name</label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="e.g. Main Palworld Server"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/50 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Select Game</label>
                <select
                  value={gameType}
                  onChange={(e) => setGameType(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/50 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                >
                  <option value="Palworld">Palworld Settings (Parsed Form)</option>
                  <option value="Other">Other Game (Raw Text Area)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Host Server</label>
                <select
                  value={profileHostId}
                  onChange={(e) => setProfileHostId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/50 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                >
                  <option value="0">Local System (Reads filesystem directly)</option>
                  {hosts.map(h => (
                    <option key={h.id} value={h.id}>{h.name} ({h.ip})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Config File Path on Host</label>
                <input
                  type="text"
                  value={configPath}
                  onChange={(e) => setConfigPath(e.target.value)}
                  placeholder="e.g. /home/steam/Pal/Saved/Config/LinuxServer/PalWorldSettings.ini"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/50 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                  required
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setEditingProfile(null);
                    setProfileName('');
                    setGameType('Palworld');
                    setProfileHostId('0');
                    setConfigPath('');
                  }}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-semibold text-sm transition-all shadow-md shadow-primary-600/20"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
