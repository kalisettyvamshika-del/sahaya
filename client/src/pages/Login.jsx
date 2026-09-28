import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, LogIn, AlertTriangle, Sparkles } from 'lucide-react';
import { AuthShell } from '../components/AuthShell.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function Login() {
  const { login, startDemoMode } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const u = await login(email, password);
      toast.success(`Welcome back, ${u.full_name || u.email}`);
      navigate('/');
    } catch (e) {
      const msg = e?.response?.data?.error || 'Login failed — backend may not be deployed yet';
      setErr(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const tryDemo = () => {
    const u = startDemoMode();
    toast.success(`Welcome to demo mode, ${u.full_name || 'friend'}! All data is stored locally in your browser.`);
    navigate('/');
  };

  return (
    <AuthShell title="Welcome back" subtitle="Log in to your SAHAYA account">
      {/* Preview banner */}
      <div className="mb-5 p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-amber-800 text-xs">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold">Backend not yet deployed</p>
          <p className="text-amber-700 mt-0.5">
            Real login (below) requires the Express backend on Render + Supabase.
            To explore the full app right now, use Demo Mode — all data stays in your browser.
          </p>
        </div>
      </div>

      {/* Demo mode CTA */}
      <button
        onClick={tryDemo}
        className="btn w-full mb-4 bg-gradient-to-br from-violet-600 to-violet-500 text-white hover:from-violet-700 hover:to-violet-600 shadow-card"
      >
        <Sparkles className="w-4 h-4" />
        Try Demo Mode — explore the app now
      </button>

      <div className="flex items-center gap-3 my-5">
        <div className="h-px bg-navy-100 flex-1" />
        <span className="text-xs text-navy-400 uppercase tracking-wider">or real login</span>
        <div className="h-px bg-navy-100 flex-1" />
      </div>

      <form onSubmit={submit} className="space-y-5">
        <div>
          <span className="label">Email</span>
          <div className="relative">
            <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="input pl-10"
            />
          </div>
        </div>
        <div>
          <span className="label">Password</span>
          <div className="relative">
            <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="input pl-10"
            />
          </div>
        </div>

        {err && (
          <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
            {err}
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-secondary w-full">
          <LogIn className="w-4 h-4" />
          {loading ? 'Logging in…' : 'Log in (requires live backend)'}
        </button>

        <p className="text-sm text-navy-500 text-center">
          New to SAHAYA?{' '}
          <Link to="/signup" className="text-violet-600 font-medium hover:underline">
            Create an account
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
