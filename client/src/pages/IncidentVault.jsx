import React, { useEffect, useState } from 'react';
import { FileLock2, Plus, Trash2, Pencil, Sparkles, X, Search, Clock } from 'lucide-react';
import api from '../lib/api';
import { useToast } from '../context/ToastContext';

const emptyForm = { title: '', description: '', occurred_at: '', timeline: [] };

export default function IncidentVault() {
  const toast = useToast();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [timelineText, setTimelineText] = useState('');
  const [summId, setSummId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/incidents', { params: search ? { q: search } : undefined });
      setIncidents(data.incidents || []);
    } catch { toast.error('Could not load incidents'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [search]);

  const save = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error('Title required'); return; }
    const payload = { ...form, occurred_at: form.occurred_at ? new Date(form.occurred_at).toISOString() : new Date().toISOString() };
    try {
      if (editing) {
        const { data } = await api.put(`/incidents/${editing}`, payload);
        setIncidents((arr) => arr.map((x) => (x.id === editing ? data.incident : x)));
        toast.success('Incident updated');
      } else {
        const { data } = await api.post('/incidents', payload);
        setIncidents((arr) => [data.incident, ...arr]);
        toast.success('Incident saved to vault');
      }
      setForm(emptyForm); setTimelineText(''); setEditing(null); setShowForm(false);
    } catch (e) { toast.error(e?.response?.data?.error || 'Save failed'); }
  };

  const remove = async (id) => {
    if (!confirm('Delete this incident permanently?')) return;
    try { await api.delete(`/incidents/${id}`); setIncidents((arr) => arr.filter((x) => x.id !== id)); toast.success('Incident deleted'); }
    catch { toast.error('Delete failed'); }
  };

  const edit = (inc) => {
    setForm({ title: inc.title, description: inc.description || '', occurred_at: inc.occurred_at ? new Date(inc.occurred_at).toISOString().slice(0, 16) : '', timeline: inc.timeline || [] });
    setTimelineText(JSON.stringify(inc.timeline || [], null, 2));
    setEditing(inc.id); setShowForm(true);
  };

  const summarize = async (id) => {
    setSummId(id);
    try {
      const { data } = await api.post(`/incidents/${id}/summarize`);
      if (data.summary) { toast.success('AI summary generated'); load(); }
      else { toast.error(data.message || 'AI not available'); }
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Summary failed');
    } finally { setSummId(null); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-navy-800">Incident Vault</h1>
          <p className="text-navy-500 text-sm mt-1">Private, secure records. Only you can see them.</p>
        </div>
        <button onClick={() => { setForm(emptyForm); setTimelineText(''); setEditing(null); setShowForm(true); }} className="btn-primary">
          <Plus className="w-4 h-4" /> New Incident
        </button>
      </header>

      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
        <input className="input pl-10" placeholder="Search incidents…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {showForm && (
        <form onSubmit={save} className="card p-5 sm:p-6 space-y-4 animate-slide-up">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-navy-800">{editing ? 'Edit Incident' : 'New Incident'}</h2>
            <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="text-navy-400 hover:text-navy-600"><X className="w-5 h-5" /></button>
          </div>
          <label className="block"><span className="label">Title *</span><input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></label>
          <label className="block"><span className="label">Description</span><textarea className="input min-h-[100px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What happened? Be as detailed as you like." /></label>
          <label className="block"><span className="label">When did it occur?</span><input type="datetime-local" className="input" value={form.occurred_at} onChange={(e) => setForm({ ...form, occurred_at: e.target.value })} /></label>
          <label className="block"><span className="label">Timeline (JSON, optional)</span>
            <textarea className="input min-h-[80px] font-mono text-xs" value={timelineText} onChange={(e) => {
              setTimelineText(e.target.value);
              try { const parsed = JSON.parse(e.target.value); setForm((f) => ({ ...f, timeline: parsed })); } catch {}
            }} placeholder='[{"time":"10:00","event":"left home"}]' />
          </label>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">{editing ? 'Save' : 'Save to Vault'}</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-navy-500 text-sm">Loading vault…</div>
      ) : incidents.length === 0 ? (
        <div className="card p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center mx-auto mb-3"><FileLock2 className="w-7 h-7" /></div>
          <p className="font-medium text-navy-800">Your vault is empty</p>
          <p className="text-sm text-navy-500 mt-1">Create your first incident record. Everything is private to you.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {incidents.map((inc) => (
            <article key={inc.id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-navy-800">{inc.title}</h3>
                    <span className="text-xs text-navy-400 flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(inc.occurred_at).toLocaleDateString()}</span>
                  </div>
                  {inc.description && <p className="text-sm text-navy-600 mt-2 whitespace-pre-wrap">{inc.description}</p>}
                  {inc.ai_summary && (
                    <div className="mt-3 p-3 rounded-xl bg-violet-50 border border-violet-100">
                      <p className="text-xs font-semibold text-violet-700 flex items-center gap-1.5 mb-1"><Sparkles className="w-3 h-3" /> AI Summary</p>
                      <p className="text-sm text-navy-700 whitespace-pre-wrap">{inc.ai_summary}</p>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <button onClick={() => summarize(inc.id)} disabled={summId === inc.id} className="btn-ghost text-xs" title="AI summarize">
                    <Sparkles className={`w-4 h-4 ${summId === inc.id ? 'animate-spin' : ''}`} />
                  </button>
                  <button onClick={() => edit(inc)} className="p-1.5 rounded-lg text-navy-400 hover:bg-navy-50 hover:text-navy-600"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => remove(inc.id)} className="p-1.5 rounded-lg text-navy-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
