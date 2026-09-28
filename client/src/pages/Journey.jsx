import React, { useEffect, useState } from 'react';
import { Navigation, MapPin, Clock, CheckCircle2, XCircle, Flag, AlertCircle } from 'lucide-react';
import api from '../lib/api';
import { useToast } from '../context/ToastContext';

export default function Journey() {
  const toast = useToast();
  const [journeys, setJourneys] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ destination_label: '', origin_label: '', expected_arrival: '', trusted_contact_id: '' });

  const load = async () => {
    setLoading(true);
    try {
      const [jr, cr] = await Promise.all([api.get('/journeys'), api.get('/contacts')]);
      setJourneys(jr.data.journeys || []);
      setContacts(cr.data.contacts || []);
    } catch {
      toast.error('Could not load journeys');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const start = async (e) => {
    e.preventDefault();
    if (!form.destination_label.trim()) { toast.error('Destination is required'); return; }
    try {
      const payload = {
        destination_label: form.destination_label,
        origin_label: form.origin_label || null,
        expected_arrival: form.expected_arrival ? new Date(form.expected_arrival).toISOString() : null,
        trusted_contact_id: form.trusted_contact_id || null,
      };
      const { data } = await api.post('/journeys', payload);
      setJourneys((j) => [data.journey, ...j.filter((x) => x.status === 'active' ? { ...x, status: 'completed' } : x)]);
      toast.success('Journey started. Stay safe!');
      setForm({ destination_label: '', origin_label: '', expected_arrival: '', trusted_contact_id: '' });
      setShowForm(false);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Could not start journey');
    }
  };

  const complete = async (id) => {
    if (!confirm('Mark this journey as completed?')) return;
    try {
      await api.post(`/journeys/${id}/complete`);
      toast.success('Journey completed');
      load();
    } catch { toast.error('Could not complete journey'); }
  };

  const cancel = async (id) => {
    if (!confirm('Cancel this journey?')) return;
    try {
      await api.post(`/journeys/${id}/cancel`);
      toast.info('Journey cancelled');
      load();
    } catch { toast.error('Could not cancel journey'); }
  };

  const checkIn = async (journey_id, status) => {
    try {
      await api.post('/journeys/checkin', { journey_id, status });
      toast.success(`Check-in: ${status}`);
    } catch {
      toast.error('Check-in failed');
    }
  };

  const active = journeys.filter((j) => j.status === 'active');
  const history = journeys.filter((j) => j.status !== 'active');

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-navy-800">My Journey</h1>
          <p className="text-navy-500 text-sm mt-1">Plan a journey, share status, and check in with trusted contacts.</p>
        </div>
        <button onClick={() => setShowForm((s) => !s)} className="btn-primary">
          <Navigation className="w-4 h-4" /> Start Journey
        </button>
      </header>

      {showForm && (
        <form onSubmit={start} className="card p-5 sm:p-6 space-y-4 animate-slide-up">
          <h2 className="font-semibold text-navy-800">New Journey</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block"><span className="label">From <span className="text-navy-300 font-normal">(optional)</span></span>
              <input className="input" value={form.origin_label} onChange={(e) => setForm({ ...form, origin_label: e.target.value })} placeholder="e.g. College" /></label>
            <label className="block"><span className="label">To *</span>
              <input className="input" value={form.destination_label} onChange={(e) => setForm({ ...form, destination_label: e.target.value })} placeholder="e.g. Home" required /></label>
            <label className="block"><span className="label">Expected arrival</span>
              <input type="datetime-local" className="input" value={form.expected_arrival} onChange={(e) => setForm({ ...form, expected_arrival: e.target.value })} /></label>
            <label className="block"><span className="label">Trusted contact</span>
              <select className="input" value={form.trusted_contact_id} onChange={(e) => setForm({ ...form, trusted_contact_id: e.target.value })}>
                <option value="">None</option>
                {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}{c.is_primary ? ' (primary)' : ''}</option>)}
              </select>
            </label>
          </div>
          <button type="submit" className="btn-primary w-full sm:w-auto">Start Journey</button>
        </form>
      )}

      {loading ? (
        <div className="text-navy-500 text-sm">Loading…</div>
      ) : (
        <>
          {/* Active journey */}
          {active.length > 0 ? (
            <section className="space-y-3">
              {active.map((j) => (
                <div key={j.id} className="card p-5 sm:p-6 border-l-4 border-l-violet-500">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="chip bg-violet-100 text-violet-700"><span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" /> Active</span>
                        <span className="text-xs text-navy-400">Started {new Date(j.created_at).toLocaleString()}</span>
                      </div>
                      <p className="mt-3 font-semibold text-navy-800 text-lg flex items-center gap-2">
                        {j.origin_label ? `${j.origin_label} → ` : ''}{j.destination_label}
                      </p>
                      {j.expected_arrival && <p className="text-xs text-navy-500 mt-1 flex items-center gap-1.5"><Clock className="w-3 h-3" /> Expected by {new Date(j.expected_arrival).toLocaleString()}</p>}
                    </div>
                  </div>

                  <div className="mt-4 p-4 rounded-xl bg-violet-50/50 border border-violet-100">
                    <p className="text-sm font-medium text-navy-700 mb-3 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-violet-600" /> Are you safe?
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      <button onClick={() => checkIn(j.id, 'safe')} className="btn bg-emerald-500 text-white hover:bg-emerald-600 text-xs">I'm Safe</button>
                      <button onClick={() => checkIn(j.id, 'extend')} className="btn bg-amber-500 text-white hover:bg-amber-600 text-xs">Extend</button>
                      <button onClick={() => checkIn(j.id, 'help')} className="btn bg-rose-500 text-white hover:bg-rose-600 text-xs">Need Help</button>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button onClick={() => complete(j.id)} className="btn-secondary text-sm flex-1"><CheckCircle2 className="w-4 h-4" /> Complete</button>
                    <button onClick={() => cancel(j.id)} className="btn-ghost text-sm text-rose-600 hover:bg-rose-50"><XCircle className="w-4 h-4" /> Cancel</button>
                  </div>
                </div>
              ))}
            </section>
          ) : (
            <div className="card p-8 text-center">
              <div className="w-14 h-14 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center mx-auto mb-3"><MapPin className="w-7 h-7" /></div>
              <p className="font-medium text-navy-800">No active journey</p>
              <p className="text-sm text-navy-500 mt-1">Start a journey so trusted contacts know you're on your way.</p>
            </div>
          )}

          {/* History */}
          {history.length > 0 && (
            <section className="card p-5 sm:p-6">
              <h2 className="font-semibold text-navy-800 mb-3 flex items-center gap-2"><Flag className="w-4 h-4 text-navy-400" /> Journey History</h2>
              <ul className="divide-y divide-navy-50">
                {history.slice(0, 20).map((j) => (
                  <li key={j.id} className="py-3 flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${j.status === 'completed' ? 'bg-emerald-500' : 'bg-navy-300'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-navy-700 truncate">{j.origin_label ? `${j.origin_label} → ` : ''}{j.destination_label}</p>
                      <p className="text-xs text-navy-400">{new Date(j.created_at).toLocaleDateString()} · {j.status}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
