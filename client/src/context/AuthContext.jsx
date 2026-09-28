import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../lib/api';
import { startDemo } from '../lib/mockApi.js';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Boot - check stored session
  useEffect(() => {
    const token = localStorage.getItem('sahaya_token');
    if (!token) {
      setLoading(false);
      return;
    }
    // If demo mode, the user object is already in localStorage
    if (localStorage.getItem('sahaya_demo_mode') === 'true') {
      try {
        const cached = JSON.parse(localStorage.getItem('sahaya_user') || 'null');
        if (cached) {
          setUser(cached);
          setLoading(false);
          return;
        }
      } catch {}
    }
    api.get('/auth/me')
      .then((r) => setUser(r.data.user))
      .catch(() => {
        localStorage.removeItem('sahaya_token');
        localStorage.removeItem('sahaya_user');
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    // Allow demo login shortcut
    if (email === 'demo' && (password === 'demo' || password === '')) {
      const demoUser = startDemo();
      setUser(demoUser);
      return demoUser;
    }
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('sahaya_token', data.token);
    localStorage.setItem('sahaya_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const startDemoMode = () => {
    const demoUser = startDemo();
    setUser(demoUser);
    return demoUser;
  };

  const signup = async (email, password, full_name) => {
    const { data } = await api.post('/auth/signup', { email, password, full_name });
    localStorage.setItem('sahaya_token', data.token);
    localStorage.setItem('sahaya_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('sahaya_token');
    localStorage.removeItem('sahaya_user');
    localStorage.removeItem('sahaya_demo_mode');
    setUser(null);
  };

  const refreshUser = async () => {
    // Demo mode: no refresh from backend needed - user is cached
    if (localStorage.getItem('sahaya_demo_mode') === 'true') {
      return user;
    }
    const { data } = await api.get('/auth/me');
    setUser(data.user);
    localStorage.setItem('sahaya_user', JSON.stringify(data.user));
    return data.user;
  };

  return (
    <AuthCtx.Provider value={{ user, loading, login, signup, logout, refreshUser, startDemoMode }}>
      {children}
    </AuthCtx.Provider>
  );
}
