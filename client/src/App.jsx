import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Contacts from './pages/Contacts.jsx';
import Journey from './pages/Journey.jsx';
import Timers from './pages/Timers.jsx';
import IncidentVault from './pages/IncidentVault.jsx';
import CommunityReports from './pages/CommunityReports.jsx';
import AIAssistant from './pages/AIAssistant.jsx';
import Emergency from './pages/Emergency.jsx';
import Profile from './pages/Profile.jsx';
import LoadingScreen from './components/LoadingScreen.jsx';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="contacts" element={<Contacts />} />
        <Route path="journey" element={<Journey />} />
        <Route path="timers" element={<Timers />} />
        <Route path="vault" element={<IncidentVault />} />
        <Route path="community" element={<CommunityReports />} />
        <Route path="assistant" element={<AIAssistant />} />
        <Route path="emergency" element={<Emergency />} />
        <Route path="profile" element={<Profile />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
