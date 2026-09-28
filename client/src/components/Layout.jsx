import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutGrid, Users, MapPin, Clock, FileLock2, Megaphone,
  Sparkles, Siren, Settings, LogOut, Menu, X, Shield
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutGrid, end: true },
  { to: '/contacts', label: 'Trusted Circle', icon: Users },
  { to: '/journey', label: 'Journey', icon: MapPin },
  { to: '/timers', label: 'Safety Timer', icon: Clock },
  { to: '/vault', label: 'Incident Vault', icon: FileLock2 },
  { to: '/community', label: 'Community', icon: Megaphone },
  { to: '/assistant', label: 'AI Assistant', icon: Sparkles },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const isDemo = typeof window !== 'undefined' && localStorage.getItem('sahaya_demo_mode') === 'true';

  const handleLogout = () => {
    logout();
    toast.info(isDemo ? 'Demo session cleared' : 'Logged out');
    navigate('/login');
  };

  const NavLinks = ({ onNavigate }) => (
    <>
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              isActive
                ? 'bg-violet-100 text-violet-700'
                : 'text-navy-600 hover:bg-navy-50'
            }`
          }
        >
          <item.icon className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />
          {item.label}
        </NavLink>
      ))}
      <NavLink
        to="/emergency"
        onClick={onNavigate}
        className={({ isActive }) =>
          `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors mt-2 ${
            isActive
              ? 'bg-rose-600 text-white shadow-emergency'
              : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
          }`
        }
      >
        <Siren className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />
        Emergency
      </NavLink>
    </>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Mobile top bar */}
      <header className="md:hidden glass border-b border-white/60 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-violet-600" />
          <span className="font-bold text-navy-800">SAHAYA</span>
          {isDemo && <span className="chip bg-amber-100 text-amber-700 text-[10px]">DEMO</span>}
        </div>
        <button
          aria-label="Toggle menu"
          onClick={() => setOpen((o) => !o)}
          className="p-2 rounded-lg hover:bg-navy-50"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Sidebar (desktop) */}
      <aside className="hidden md:flex w-64 lg:w-72 shrink-0 flex-col gap-1 p-5 border-r border-navy-50 sticky top-0 h-screen">
        <div className="flex items-center gap-2.5 mb-6 px-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-navy-700 to-violet-500 flex items-center justify-center shadow-card">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="font-bold text-navy-800 leading-tight">SAHAYA</p>
              {isDemo && <span className="chip bg-amber-100 text-amber-700 text-[10px]">DEMO</span>}
            </div>
            <p className="text-[11px] text-navy-400">Prepare. Connect. Respond.</p>
          </div>
        </div>
        <nav className="flex-1 flex flex-col gap-1">
          <NavLinks />
        </nav>
        <div className="border-t border-navy-50 pt-3 mt-3 flex flex-col gap-1">
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${
                isActive ? 'bg-violet-100 text-violet-700' : 'text-navy-600 hover:bg-navy-50'
              }`
            }
          >
            <Settings className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />
            Profile
          </NavLink>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-navy-600 hover:bg-rose-50 hover:text-rose-700"
          >
            <LogOut className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />
            Log out
          </button>
        </div>
      </aside>

      {/* Mobile menu drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-30 bg-navy-900/40 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div
            className="absolute left-0 top-0 bottom-0 w-72 max-w-[80vw] bg-white p-5 shadow-2xl animate-slide-up flex flex-col gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5 mb-4">
              <Shield className="w-7 h-7 text-violet-600" />
              <span className="font-bold text-navy-800 text-lg">SAHAYA</span>
            </div>
            <nav className="flex-1 flex flex-col gap-1">
              <NavLinks onNavigate={() => setOpen(false)} />
            </nav>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-rose-700 hover:bg-rose-50 mt-2"
            >
              <LogOut className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} /> Log out
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-x-hidden">
        <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 animate-fade-in">
          <Outlet />
        </div>
        <footer className="border-t border-navy-50 mt-10 px-4 py-6 text-center text-xs text-navy-400">
          <p>SAHAYA helps you coordinate safety information, trusted contacts, and emergency-response options.</p>
          <p className="mt-1">This application does not replace emergency services.</p>
        </footer>
      </main>
    </div>
  );
}
