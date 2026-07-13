import React, { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';
import AdminPanel from './AdminPanel';
import UserPanel from './UserPanel';
import ConfigEditor from './ConfigEditor';
import ChangePassword from './ChangePassword';
import { 
  Users, 
  Server, 
  FileCode, 
  Link2, 
  LogOut, 
  LayoutDashboard, 
  User as UserIcon, 
  ChevronRight, 
  Activity,
  Menu,
  X,
  KeyRound
} from 'lucide-react';

export default function Dashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedProfile, setSelectedProfile] = useState(null); // For active config editing
  const [stats, setStats] = useState({ users: 0, hosts: 0, profiles: 0, links: 0 });
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const username = localStorage.getItem('username') || user?.username || 'User';
  const role = localStorage.getItem('role') || user?.role || 'user';
  const isAdmin = role === 'admin';

  useEffect(() => {
    if (isAdmin && activeTab === 'dashboard') {
      fetchStats();
    }
  }, [activeTab]);

  const fetchStats = async () => {
    try {
      const users = await apiFetch('/admin/users');
      const hosts = await apiFetch('/admin/hosts');
      const profiles = await apiFetch('/admin/profiles');
      const links = await apiFetch('/admin/user-profiles');
      
      setStats({
        users: users?.length || 0,
        hosts: hosts?.length || 0,
        profiles: profiles?.length || 0,
        links: links?.length || 0
      });
    } catch (err) {
      console.error("Failed to load dashboard statistics:", err);
    }
  };

  const handleEditConfig = (profile) => {
    setSelectedProfile(profile);
    setActiveTab('edit-config');
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'user'] },
    { id: 'users', label: 'Manage Users', icon: Users, roles: ['admin'] },
    { id: 'hosts', label: 'Host Servers', icon: Server, roles: ['admin'] },
    { id: 'profiles', label: 'Game Profiles', icon: FileCode, roles: ['admin'] },
    { id: 'linking', label: 'Link Profiles', icon: Link2, roles: ['admin'] },
    { id: 'change-password', label: 'Change Password', icon: KeyRound, roles: ['admin', 'user'] },
  ];

  return (
    <div className="min-h-screen bg-dark-900 text-slate-100 flex font-sans">
      {/* Mobile sidebar toggle */}
      <button 
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed bottom-5 right-5 z-50 p-3 rounded-full bg-primary-600 text-white shadow-lg hover:bg-primary-500 transition-all"
      >
        {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Sidebar */}
      <aside className={`fixed lg:static top-0 bottom-0 left-0 z-40 w-64 glass-dark border-r border-slate-800/60 flex flex-col justify-between transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div>
          {/* Logo / Brand */}
          <div className="h-16 flex items-center gap-2.5 px-6 border-b border-slate-800/40">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary-500 to-accent-violet flex items-center justify-center text-white font-bold shadow-md shadow-primary-500/25">
              GM
            </div>
            <span className="font-bold text-lg bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              Game Manager
            </span>
          </div>

          {/* Navigation Menu */}
          <nav className="p-4 space-y-1.5">
            {menuItems
              .filter(item => item.roles.includes(role))
              .map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setSelectedProfile(null);
                      if (window.innerWidth < 1024) setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      isActive 
                        ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/15' 
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/30'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                    <span>{item.label}</span>
                    {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                  </button>
                );
              })}
          </nav>
        </div>

        {/* User profile section at the bottom */}
        <div className="p-4 border-t border-slate-800/40">
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-950/40 border border-slate-800/35 mb-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-r from-accent-violet to-primary-600 flex items-center justify-center text-white text-sm font-semibold">
              {username[0].toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-white truncate">{username}</p>
              <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mt-0.5 ${
                isAdmin 
                  ? 'bg-primary-600/10 text-primary-500 border border-primary-500/20' 
                  : 'bg-emerald-600/10 text-emerald-500 border border-emerald-500/20'
              }`}>
                {role}
              </span>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-accent-rose hover:bg-accent-rose/10 transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-screen overflow-y-auto bg-dark-900 relative">
        {/* Dynamic header */}
        <header className="h-16 shrink-0 border-b border-slate-800/60 px-6 lg:px-8 flex items-center justify-between glass-dark sticky top-0 z-30">
          <div className="flex items-center gap-2 text-sm text-slate-400 font-medium">
            <span>Home</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-white capitalize">{activeTab.replace('-', ' ')}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-accent-emerald animate-pulse"></span>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">System Live</span>
          </div>
        </header>

        {/* Panel Page Body */}
        <div className="flex-1 p-6 lg:p-8">
          {activeTab === 'dashboard' && (
            <div className="space-y-6 max-w-6xl animate-fade-in">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white">
                  Welcome back, {username}!
                </h1>
                <p className="text-sm text-slate-400 mt-1">
                  Manage your game server configurations efficiently from this dashboard.
                </p>
              </div>

              {/* Admin summary stats cards */}
              {isAdmin ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                  {[
                    { label: 'Active Users', value: stats.users, icon: Users, color: 'text-primary-500 border-primary-500/10' },
                    { label: 'Host Servers', value: stats.hosts, icon: Server, color: 'text-accent-cyan border-accent-cyan/10' },
                    { label: 'Game Profiles', value: stats.profiles, icon: FileCode, color: 'text-accent-violet border-accent-violet/10' },
                    { label: 'Profile Assignments', value: stats.links, icon: Link2, color: 'text-accent-emerald border-accent-emerald/10' },
                  ].map((stat, i) => {
                    const Icon = stat.icon;
                    return (
                      <div key={i} className="p-6 rounded-2xl glass glass-hover relative overflow-hidden flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{stat.label}</p>
                          <h3 className="text-3xl font-bold text-white mt-1.5 font-sans">{stat.value}</h3>
                        </div>
                        <div className={`p-3 rounded-xl bg-slate-950/40 border ${stat.color}`}>
                          <Icon className="w-6 h-6" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}

              {/* Main Panel views: Users view assigned profile list directly */}
              {isAdmin ? (
                <div className="p-6 rounded-2xl glass overflow-hidden">
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-800/40">
                    <div className="flex items-center gap-2">
                      <Activity className="w-5 h-5 text-primary-500" />
                      <h3 className="text-base font-bold text-white">Your Assigned Game Profiles</h3>
                    </div>
                  </div>
                  <UserPanel onEditConfig={handleEditConfig} />
                </div>
              ) : (
                <UserPanel onEditConfig={handleEditConfig} />
              )}
            </div>
          )}

          {activeTab === 'users' && isAdmin && (
            <AdminPanel section="users" />
          )}

          {activeTab === 'hosts' && isAdmin && (
            <AdminPanel section="hosts" />
          )}

          {activeTab === 'profiles' && isAdmin && (
            <AdminPanel section="profiles" />
          )}

          {activeTab === 'linking' && isAdmin && (
            <AdminPanel section="linking" />
          )}

          {activeTab === 'change-password' && (
            <ChangePassword />
          )}

          {activeTab === 'edit-config' && selectedProfile && (
            <ConfigEditor 
              profile={selectedProfile} 
              onBack={() => {
                setActiveTab('dashboard');
                setSelectedProfile(null);
              }} 
            />
          )}
        </div>
      </main>
    </div>
  );
}
