import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck, ShieldAlert, Siren, Users, MapPin, Clock, FileLock2,
  Megaphone, Sparkles, Plus, MapPinned, Navigation, AlertTriangle,
  Phone, ChevronRight
} from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const stateConfig = {
  safe: { label: "I'm Safe", icon: ShieldCheck, color: 'emerald', bg: 'bg-emerald-500', soft: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200' },
  check_on_me: { label: 'Check on Me', icon: ShieldAlert, color: 'amber', bg: 'bg-amber-500', soft: 'bg-amber-50', text: 'text-amber-700', ring: 'ring-amber-200' },
  emergency: { label: 'Emergency', icon: Siren, color: 'rose', bg: 'bg-rose-600', soft: 'bg-rose-50', text: 'text-rose-700', ring: 'ring-rose-200' },
};

export default function Dashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const [state, setState] = useState('safe');
  const [contacts, setContacts] = useState([]);
  const [activeJourney, setActiveJourney] = useState(null);
  const [activeTimer, setActiveTimer] = useState(null);
  const [recentReports, setRecentReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stateBusy, setStateBusy] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/profile/state').then((r) => setState(r.data.state)).catch(() => {}),
      api.get('/contacts').then((r) => setContacts(r.data.contacts || [])).catch(() => {}),
      api.get('/journeys?status=active').then((r) => setActiveJourney(r.data.journeys?.[0] || null)).catch(() => {}),
      api.get('/timers?status=active').then((r) => setActiveTimer(r.data.timers?.[0] || null)).catch(() => {}),
      api.get('/reports').then((r) => setRecentReports((r.data.reports || []).slice(0, 3))).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const changeState = async (newState) => {
    if (stateBusy || newState === state) return;
    setStateBusy(true);
    try {
      const { data } = await api.post('/profile/state', { state: newState });
      setState(data.state.state);
      toast.success(`Safety status: ${stateConfig[data.state.state].label}`);
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Could not update status');
    } finally {
      setStateBusy(false);
    }
  };

  const sc = stateConfig[state] || stateConfig.safe;

  if (loading) {
    return <div className="text-navy-500 text-sm">Loading dashboard…</div>;
  }

  const primaryContact = contacts.find((c) => c.is_primary) || contacts[0];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Greeting */}
      <header>
        <p className="text-sm text-navy-400">Welcome back</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-navy-800">
          {user?.full_name || user?.email?.split('@')[0] || 'there'}
        </h1>
        <p className="text-navy-500 text-sm mt-1">
          {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </header>

      {/* Emergency CTA */}
      <Link
        to="/emergency"
        className={`relative block rounded-3xl p-6 sm:p-8 text-white overflow-hidden shadow-emergency bg-gradient-to-br from-rose-500 to-rose-700 transition-transform hover:scale-[1.01] active:scale-[0.99]`}
      >
        <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full bg-rose-900/30 blur-2xl" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center shrink-0 animate-pulse-soft">
            <Siren className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-xs uppercase tracking-wider text-white/70 font-semibold">In case of immediate danger</p>
            <h2 className="text-xl sm:text-2xl font-bold mt-0.5">Activate Emergency Mode</h2>
            <p className="text-sm text-white/85 mt-1">
              Notifies trusted contacts and attempts authorized emergency-service integration.
            </p>
          </div>
          <div className="sm:ml-auto bg-white/15 backdrop-blur-md rounded-xl px-4 py-2.5 text-sm font-semibold inline-flex items-center gap-2 shrink-0">
            <Phone className="w-4 h-4" /> Activate
          </div>
        </div>
      </Link>

      {/* Safety Status */}
      <section className="card p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-navy-800">Safety Status</h2>
            <p className="text-xs text-navy-400">Let trusted contacts know how you are</p>
          </div>
          <div className={`chip ${sc.soft} ${sc.text}`}>
            <sc.icon className="w-3.5 h-3.5" /> {sc.label}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {Object.entries(stateConfig).map(([key, cfg]) => {
            const active = state === key;
            const Icon = cfg.icon;
            return (
              <button
                key={key}
                onClick={() => changeState(key)}
                disabled={stateBusy}
                className={`relative rounded-2xl p-3 sm:p-4 flex flex-col items-center gap-2 transition-all border ${
                  active
                    ? `${cfg.soft} ${cfg.text} border-transparent ring-2 ${cfg.ring} shadow-card`
                    : 'border-navy-50 hover:border-navy-200 text-navy-500'
                }`}
              >
                <Icon className="w-6 h-6" />
                <span className="text-xs sm:text-sm font-medium text-center">{cfg.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Quick tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <QuickCard to="/journey" icon={MapPin} title="My Journey" subtitle={activeJourney ? `Active: ${activeJourney.destination_label}` : 'Start a journey'} highlight={!!activeJourney} />
        <QuickCard to="/contacts" icon={Users} title="Trusted Circle" subtitle={primaryContact ? `Primary: ${primaryContact.name}` : 'Add a contact'} highlight={!!primaryContact} />
        <QuickCard to="/timers" icon={Clock} title="Safety Timer" subtitle={activeTimer ? `Expires ${new Date(activeTimer.expires_at).toLocaleTimeString()}` : 'Set a check-in timer'} highlight={!!activeTimer} />
        <QuickCard to="/vault" icon={FileLock2} title="Incident Vault" subtitle="Secure records" />
      </div>

      {/* Safety tools */}
      <section className="card p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-navy-800">Safety Tools</h2>
          <span className="text-xs text-navy-400">{new Date().toLocaleDateString()}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <ToolLink to="/assistant" icon={Sparkles} title="AI Safety Assistant" desc="Ask questions, summarize notes, prepare information" />
          <ToolLink to="/community" icon={Megaphone} title="Community Reports" desc="View and share infrastructure issues" />
          <ToolLink to="/vault" icon={FileLock2} title="Incident Vault" desc="Private notes & timeline with AI summary" />
          <ToolLink to="/journey" icon={Navigation} title="Journey Check-In" desc="Set destination + check-in reminders" />
          <ToolLink to="/timers" icon={Clock} title="Safety Timer" desc="Check on me in N minutes" />
          <ToolLink to="/emergency" icon={AlertTriangle} title="Emergency Mode" desc="Activate trusted-contact & emergency response" danger />
        </div>
      </section>

      {/* Community reports preview */}
      {recentReports.length > 0 && (
        <section className="card p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-navy-800">Recent Community Reports</h2>
            <Link to="/community" className="text-sm text-violet-600 font-medium hover:underline inline-flex items-center gap-1">
              See all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <ul className="space-y-2">
            {recentReports.map((r) => (
              <li key={r.id} className="flex items-start gap-3 p-3 rounded-xl bg-navy-50/40">
                <div className="w-9 h-9 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
                  <MapPinned className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-navy-700 truncate capitalize">{r.category}</p>
                  <p className="text-xs text-navy-500 line-clamp-2">{r.description}</p>
                </div>
                <span className="text-xs text-navy-400 shrink-0">{new Date(r.created_at).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function QuickCard({ to, icon: Icon, title, subtitle, highlight }) {
  return (
    <Link
      to={to}
      className={`card p-4 sm:p-5 flex flex-col gap-2 transition-all hover:shadow-card-hover hover:-translate-y-0.5 group ${
        highlight ? 'border-violet-200 bg-violet-50/30' : ''
      }`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${highlight ? 'bg-violet-100 text-violet-700' : 'bg-navy-50 text-navy-600'} group-hover:scale-110 transition-transform`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-sm font-semibold text-navy-800">{title}</p>
        <p className="text-xs text-navy-500 line-clamp-1 mt-0.5">{subtitle}</p>
      </div>
    </Link>
  );
}

function ToolLink({ to, icon: Icon, title, desc, danger }) {
  return (
    <Link
      to={to}
      className={`group p-4 rounded-xl border transition-all hover:shadow-card-hover hover:-translate-y-0.5 ${
        danger ? 'border-rose-100 hover:border-rose-300 bg-rose-50/30' : 'border-navy-50 hover:border-violet-200 bg-white'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${danger ? 'bg-rose-100 text-rose-700' : 'bg-violet-100 text-violet-700'} group-hover:scale-110 transition-transform`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-navy-800 truncate">{title}</p>
          <p className="text-xs text-navy-500 line-clamp-1">{desc}</p>
        </div>
        <ChevronRight className="w-4 h-4 text-navy-300 group-hover:translate-x-0.5 transition-transform" />
      </div>
    </Link>
  );
}
