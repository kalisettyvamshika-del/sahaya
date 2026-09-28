import React, { useEffect, useState } from 'react';
import { Megaphone, Plus, Trash2, MapPin, X } from 'lucide-react';
import api from '../lib/api';
import { useToast } from '../context/ToastContext';

const CATEGORIES = [
  { value: 'streetlight', label: 'Broken Streetlight', icon: '💡' },
  { value: 'road', label: 'Damaged Road', icon: '🛣️' },
  { value: 'isolated', label: 'Isolated Area', icon: '🌳' },
  { value: 'transport', label: 'Transport Issue', icon: '🚍' },
  { value: 'other', label: 'Other', icon: '⚠️' },
];

const STATUS_STYLE = {
  pending: 'bg-amber-100 text-amber-700',
  verified: 'bg-violet-100 text-violet-700',
  resolved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-rose-100 text-rose-700',
};

export default function CommunityReports() {
  const toast = useToast();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ category: 'streetlight', description: '', location_label: '' });

  const load = async () => {
    setLoading(true);
    try { const { data } = await api.get('/reports'); setReports(data.reports || []); }
    catch { toast.error('Could not load reports'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (form.description.length < 5) { toast.error('Description too short'); return; }
    try {
      const { data } = await api.post('/reports', form);
      setReports((r) => [data.report, ...r]);
      toast.success('Report submitted. Thank you for contributing.');
      setForm({ category: 'streetlight', description: '', location_label: '' });
      setShowForm(false);
    } catch (e) { toast.error(e?.response?.data?.error || 'Submit failed'); }
  };

  const remove = async (id) => {
    if (!confirm('Delete your report?')) return;
    try { await api.delete(`/reports/${id}`); setReports((r) => r.filter((x) => x.id !== id)); toast.success('Report deleted'); }
    catch (e) {
      if (e?.response?.status === 404) toast.error('You can only delete your own reports');
      else toast.error('Delete failed');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-navy-800">Community Reports</h1>
          <p className="text-navy-500 text-sm mt-1">Infrastructure and safety issues reported by users.</p>
        </div>
        <button onClick={() => setShowForm((s) => !s)} className="btn-primary">
          <Plus className="w-4 h-4" /> New Report
        </button>
      </header>

      {showForm && (
        <form onSubmit={submit} className="card p-5 sm:p-6 space-y-4 animate-slide-up">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-navy-800">Report an Issue</h2>
            <button type="button" onClick={() => setShowForm(false)} className="text-navy-400 hover:text-navy-600"><X className="w-5 h-5" /></button>
          </div>
          <div>
            <span className="label">Category</span>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {CATEGORIES.map((c) => (
                <button key={c.value} type="button" onClick={() => setForm({ ...form, category: c.value })}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    form.category === c.value ? 'border-violet-300 bg-violet-50 ring-2 ring-violet-200' : 'border-navy-50 hover:border-navy-200'
                  }`}>
                  <div className="text-2xl">{c.icon}</div>
                  <div className="text-xs text-navy-700 mt-1">{c.label}</div>
                </button>
              ))}
            </div>
          </div>
          <label className="block"><span className="label">Description *</span>
            <textarea className="input min-h-[100px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe the issue (e.g. streetlight out near the bus stop on 5th Ave)." required minLength={5} />
          </label>
          <label className="block"><span className="label">Location <span className="text-navy-300 font-normal">(optional)</span></span>
            <input className="input" value={form.location_label} onChange={(e) => setForm({ ...form, location_label: e.target.value })} placeholder="e.g. near MG Road metro station" />
          </label>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Submit Report</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-navy-500 text-sm">Loading reports…</div>
      ) : reports.length === 0 ? (
        <div className="card p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center mx-auto mb-3"><Megaphone className="w-7 h-7" /></div>
          <p className="font-medium text-navy-800">No community reports yet</p>
          <p className="text-sm text-navy-500 mt-1">Be the first to share an infrastructure issue.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
          {reports.map((r) => {
            const cat = CATEGORIES.find((c) => c.value === r.category) || CATEGORIES[CATEGORIES.length - 1];
            return (
              <div key={r.id} className="card p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl bg-violet-50 text-2xl flex items-center justify-center shrink-0">{cat.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-navy-800 text-sm">{cat.label}</p>
                      <span className={`chip ${STATUS_STYLE[r.status] || STATUS_STYLE.pending}`}>{r.status}</span>
                    </div>
                    <p className="text-sm text-navy-600 mt-1 line-clamp-3">{r.description}</p>
                    {r.location_label && <p className="text-xs text-navy-400 mt-2 flex items-center gap-1"><MapPin className="w-3 h-3" /> {r.location_label}</p>}
                    <p className="text-xs text-navy-300 mt-1">{new Date(r.created_at).toLocaleString()}</p>
                  </div>
                  <button onClick={() => remove(r.id)} className="p-1.5 rounded-lg text-navy-400 hover:bg-rose-50 hover:text-rose-600 shrink-0"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
