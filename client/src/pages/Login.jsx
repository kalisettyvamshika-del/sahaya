import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, LogIn, AlertTriangle } from 'lucide-react';
import { AuthShell, Field } from '../components/AuthShell.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function Login() {
  const { login } = useAuth();
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
      const msg = e?.response?.data?.error || 'Login failed';
      setErr(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Welcome back" subtitle="Log in to your SAHAYA account">
      {/* Preview banner - shown because no backend is deployed yet */}
      <div className="mb-5 p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-amber-800 text-xs">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold">Preview Mode</p>
          <p className="text-amber-700 mt-0.5">
            Frontend is live but the backend is not yet deployed.
            Login/Signup will return "Network Error". The full UI is fully visible.
            Once the backend goes live at <code className="font-mono bg-amber-100 px-1 py-0.5 rounded">sahaya-api.onrender.com</code>,
            everything will work without rebuild.
          </p>
        </div>
      </div>
      <form onSubmit={submit} className="space-y-5">
        <div>
          <span className="label">Email</span>
          <div className="relative">
            <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
            <input
              type="email"
              required
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
              required
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

        <button type="submit" disabled={loading} className="btn-primary w-full">
          <LogIn className="w-4 h-4" />
          {loading ? 'Logging in…' : 'Log in'}
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
