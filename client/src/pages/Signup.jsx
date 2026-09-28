import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, UserPlus } from 'lucide-react';
import { AuthShell } from '../components/AuthShell.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function Signup() {
  const { signup } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (password.length < 6) {
      setErr('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const u = await signup(email, password, fullName);
      toast.success(`Account created — welcome, ${u.full_name || u.email}`);
      navigate('/');
    } catch (e) {
      const msg = e?.response?.data?.error || 'Sign up failed';
      setErr(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Create your account" subtitle="SAHAYA helps you prepare, connect, and respond.">
      <form onSubmit={submit} className="space-y-5">
        <div>
          <span className="label">Full name <span className="text-navy-300 font-normal">(optional)</span></span>
          <div className="relative">
            <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
            <input
              type="text"
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your name"
              className="input pl-10"
            />
          </div>
        </div>
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
              minLength={6}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 6 characters"
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
          <UserPlus className="w-4 h-4" />
          {loading ? 'Creating account…' : 'Create account'}
        </button>

        <p className="text-xs text-navy-400 text-center">
          By signing up you acknowledge SAHAYA does not replace emergency services.
        </p>

        <p className="text-sm text-navy-500 text-center">
          Already have an account?{' '}
          <Link to="/login" className="text-violet-600 font-medium hover:underline">
            Log in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
