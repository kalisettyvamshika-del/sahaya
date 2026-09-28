import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Globe, Key, Trash2, Save, Shield, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../lib/api';

export default function Profile() {
  const { user, logout, refreshUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [lang, setLang] = useState(user?.preferred_language || 'en');
  const [saving, setSaving] = useState(false);

  // change password
  const [showPw, setShowPw] = useState(false);
  const [curPw, setCurPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch('/profile', { full_name: fullName, preferred_language: lang });
      await refreshUser();
      toast.success('Profile updated');
    } catch (e) { toast.error(e?.response?.data?.error || 'Update failed'); }
    finally { setSaving(false); }
  };

  const changePw = async (e) => {
    e.preventDefault();
    if (newPw.length < 6) { toast.error('New password min 6 chars'); return; }
    setPwLoading(true);
    try {
      await api.post('/auth/change-password', { current_password: curPw, new_password: newPw });
      toast.success('Password changed');
      setCurPw(''); setNewPw(''); setShowPw(false);
    } catch (e) { toast.error(e?.response?.data?.error || 'Could not change password'); }
    finally { setPwLoading(false); }
  };

  const deleteAccount = async () => {
    const confirm1 = confirm('Are you sure? This permanently deletes your account and all data.');
    if (!confirm1) return;
    const confirm2 = confirm('FINAL CONFIRMATION. This cannot be undone.');
    if (!confirm2) return;
    try {
      await api.delete('/auth/account');
      logout();
      toast.info('Account deleted. Redirecting…');
      navigate('/signup');
    } catch { toast.error('Could not delete account'); }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <header>
        <h1 className="text-2xl font-bold text-navy-800">Profile & Settings</h1>
        <p className="text-navy-500 text-sm mt-1">Manage your account, language, and security.</p>
      </header>

      {/* Profile basics */}
      <form onSubmit={saveProfile} className="card p-5 sm:p-6 space-y-4">
        <h2 className="font-semibold text-navy-800 flex items-center gap-2"><User className="w-4 h-4 text-violet-600" /> Basic Information</h2>
        <label className="block"><span className="label">Email</span>
          <div className="relative">
            <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
            <input className="input pl-10 bg-navy-50/60 cursor-not-allowed" value={user?.email || ''} disabled />
          </div>
        </label>
        <label className="block"><span className="label">Full name</span>
          <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" />
        </label>
        <label className="block"><span className="label">Preferred language</span>
          <div className="relative">
            <Globe className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-navy-300 pointer-events-none" />
            <select className="input pl-10" value={lang} onChange={(e) => setLang(e.target.value)}>
              <option value="en">English</option>
              <option value="hi">हिन्दी (Hindi)</option>
              <option value="te">తెలుగు (Telugu)</option>
            </select>
          </div>
        </label>
        <button type="submit" disabled={saving} className="btn-primary">
          <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </form>

      {/* Change password */}
      <div className="card p-5 sm:p-6">
        <button onClick={() => setShowPw((s) => !s)} className="w-full flex items-center justify-between">
          <h2 className="font-semibold text-navy-800 flex items-center gap-2"><Key className="w-4 h-4 text-violet-600" /> Change Password</h2>
          <span className="text-xs text-violet-600 font-medium">{showPw ? 'Cancel' : 'Change'}</span>
        </button>
        {showPw && (
          <form onSubmit={changePw} className="space-y-3 mt-4 animate-slide-up">
            <label className="block"><span className="label">Current password</span>
              <input type="password" className="input" value={curPw} onChange={(e) => setCurPw(e.target.value)} required autoComplete="current-password" />
            </label>
            <label className="block"><span className="label">New password</span>
              <input type="password" className="input" value={newPw} onChange={(e) => setNewPw(e.target.value)} required minLength={6} autoComplete="new-password" />
            </label>
            <button type="submit" disabled={pwLoading} className="btn-primary"><Key className="w-4 h-4" /> {pwLoading ? 'Updating…' : 'Update Password'}</button>
          </form>
        )}
      </div>

      {/* Privacy */}
      <div className="card p-5 sm:p-6 space-y-2">
        <h2 className="font-semibold text-navy-800 flex items-center gap-2"><Shield className="w-4 h-4 text-violet-600" /> Privacy & Security</h2>
        <p className="text-sm text-navy-600 leading-relaxed">
          SAHAYA stores your data in a Supabase Postgres database with row-level security. Trusted contacts, incidents, and journeys
          are visible only to you. All passwords are hashed with bcrypt. No API keys are ever exposed to the browser.
        </p>
        <ul className="text-sm text-navy-500 list-disc pl-5 space-y-1 mt-2">
          <li>Account data can be deleted at any time.</li>
          <li>Location is only captured when you explicitly use Emergency, Journey, or Check-In features.</li>
          <li>SAHAYA does not sell or share your data with third parties.</li>
        </ul>
      </div>

      {/* Danger zone */}
      <div className="card p-5 sm:p-6 border-rose-200">
        <h2 className="font-semibold text-rose-700 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Danger Zone</h2>
        <p className="text-sm text-navy-600 mt-2">
          Deleting your account permanently removes your profile, trusted contacts, journeys, incidents, and emergency history.
          This cannot be undone.
        </p>
        <button onClick={deleteAccount} className="btn btn-danger mt-4">
          <Trash2 className="w-4 h-4" /> Delete My Account
        </button>
      </div>
    </div>
  );
}
