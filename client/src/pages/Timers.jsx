import React, { useEffect, useState } from 'react';
import { Clock, Play, Pause, Plus, AlertTriangle } from 'lucide-react';
import api from '../lib/api';
import { useToast } from '../context/ToastContext';

const PRESETS = [15, 30, 60, 120];

export default function Timers() {
  const toast = useToast();
  const [timers, setTimers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [minutes, setMinutes] = useState(30);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/timers');
      setTimers(data.timers || []);
    } catch { toast.error('Could not load timers'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const start = async () => {
    if (minutes < 1) { toast.error('Minutes must be >= 1'); return; }
    try {
      const { data } = await api.post('/timers', { duration_minutes: minutes });
      toast.success(`Timer set: ${minutes} minutes. We'll check on you.`);
      setTimers((t) => [data.timer, ...t.filter((x) => x.status === 'active' ? { ...x, status: 'cancelled' } : x)]);
      load();
    } catch (e) { toast.error(e?.response?.data?.error || 'Could not set timer'); }
  };

  const extend = async (id) => {
    const m = parseInt(prompt('Extend by (minutes)?', '15'), 10);
    if (!m || m < 1) return;
    try {
      await api.post(`/timers/${id}/extend`, { minutes: m });
      toast.success(`Extended by ${m} min`);
      load();
    } catch { toast.error('Could not extend'); }
  };

  const cancel = async (id) => {
    if (!confirm('Cancel this timer?')) return;
    try {
      await api.post(`/timers/${id}/cancel`);
      toast.info('Timer cancelled');
      load();
    } catch { toast.error('Could not cancel'); }
  };

  const escalate = async (id) => {
    if (!confirm('Escalate? Your primary trusted contact will be notified.')) return;
    try {
      const { data } = await api.post(`/timers/${id}/escalate`);
      toast.success(data.note || 'Escalation logged');
      load();
    } catch { toast.error('Could not escalate'); }
  };

  const active = timers.filter((t) => t.status === 'active' || t.status === 'extended');
  const past = timers.filter((t) => t.status !== 'active' && t.status !== 'extended');

  return (
    <div className="space-y-6 animate-fade-in">
      <header>
        <h1 className="text-2xl font-bold text-navy-800">Safety Timer</h1>
        <p className="text-navy-500 text-sm mt-1">"Check on me in N minutes." If you don't respond, we escalate to your primary contact.</p>
      </header>

      {/* Set timer */}
      <section className="card p-5 sm:p-6">
        <h2 className="font-semibold text-navy-800 mb-4 flex items-center gap-2"><Play className="w-4 h-4 text-violet-600" /> Set a new timer</h2>
        <div className="flex items-end gap-3 flex-wrap">
          <label className="block flex-1 min-w-[160px]">
            <span className="label">Duration (minutes)</span>
            <input type="number" min="1" max="1440" className="input" value={minutes} onChange={(e) => setMinutes(parseInt(e.target.value, 10) || 1)} />
          </label>
          <button onClick={start} className="btn-primary"><Clock className="w-4 h-4" /> Start Timer</button>
        </div>
        <div className="flex gap-2 mt-3 flex-wrap">
          {PRESETS.map((p) => (
            <button key={p} onClick={() => setMinutes(p)} className="chip bg-navy-50 text-navy-700 hover:bg-violet-100 hover:text-violet-700 cursor-pointer">{p} min</button>
          ))}
        </div>
      </section>

      {loading ? (
        <div className="text-navy-500 text-sm">Loading timers…</div>
      ) : active.length > 0 ? (
        active.map((t) => {
          const remaining = Math.max(0, new Date(t.expires_at).getTime() - Date.now());
          const minLeft = Math.floor(remaining / 60000);
          const secLeft = Math.floor((remaining % 60000) / 1000);
          const expired = remaining <= 0;
          return (
            <div key={t.id} className={`card p-5 sm:p-6 ${expired ? 'border-amber-300 bg-amber-50/40' : 'border-violet-200 bg-violet-50/30'}`}>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`chip ${expired ? 'bg-amber-100 text-amber-700' : 'bg-violet-100 text-violet-700'}`}>
                      {t.status}
                    </span>
                    <span className="text-xs text-navy-400">Started {new Date(t.started_at).toLocaleTimeString()}</span>
                  </div>
                  <p className="mt-3 font-mono text-3xl sm:text-4xl font-bold text-navy-800 tabular-nums">
                    {expired ? '00:00' : `${String(minLeft).padStart(2, '0')}:${String(secLeft).padStart(2, '0')}`}
                  </p>
                  <p className="text-xs text-navy-400 mt-1">{expired ? 'Timer expired' : `Expires at ${new Date(t.expires_at).toLocaleTimeString()}`}</p>
                </div>
                <div className="flex flex-col gap-2">
                  <button onClick={() => extend(t.id)} className="btn-secondary text-sm"><Plus className="w-4 h-4" /> Extend</button>
                  <button onClick={() => cancel(t.id)} className="btn-ghost text-sm text-rose-600 hover:bg-rose-50"><Pause className="w-4 h-4" /> Cancel</button>
                </div>
              </div>
              {expired && (
                <div className="mt-4 p-3 rounded-xl bg-amber-100 border border-amber-300 flex items-center gap-2 text-amber-800 text-sm">
                  <AlertTriangle className="w-4 h-4 shrink-0" /> Timer expired. Are you safe?
                  <button onClick={() => escalate(t.id)} className="ml-auto px-3 py-1 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700">Notify trusted contact</button>
                </div>
              )}
            </div>
          );
        })
      ) : (
        <div className="card p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center mx-auto mb-3"><Clock className="w-7 h-7" /></div>
          <p className="font-medium text-navy-800">No active timer</p>
          <p className="text-sm text-navy-500 mt-1">Set a timer and we'll check on you at the end of it.</p>
        </div>
      )}

      {/* Past timers */}
      {past.length > 0 && (
        <section className="card p-5 sm:p-6">
          <h2 className="font-semibold text-navy-800 mb-3">Past Timers</h2>
          <ul className="divide-y divide-navy-50">
            {past.slice(0, 10).map((t) => (
              <li key={t.id} className="py-2.5 flex items-center justify-between text-sm">
                <span className="text-navy-600">{t.duration_minutes} min · {new Date(t.started_at).toLocaleDateString()}</span>
                <span className={`chip ${statusChip(t.status)}`}>{t.status}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function statusChip(s) {
  switch (s) {
    case 'completed': return 'bg-emerald-100 text-emerald-700';
    case 'extended': return 'bg-violet-100 text-violet-700';
    case 'escalated': return 'bg-rose-100 text-rose-700';
    case 'cancelled': return 'bg-navy-100 text-navy-600';
    default: return 'bg-navy-100 text-navy-600';
  }
}
