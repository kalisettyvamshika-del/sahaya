import React, { useEffect, useState } from 'react';
import { UserPlus, Star, Phone, Mail, MoreVertical, Trash2, Bell, X, Pencil } from 'lucide-react';
import api from '../lib/api';
import { useToast } from '../context/ToastContext';

const empty = { name: '', relationship: '', phone: '', email: '', notification_preference: 'email', is_primary: false };

export default function Contacts() {
  const toast = useToast();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(empty);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/contacts');
      setContacts(data.contacts || []);
    } catch {
      toast.error('Could not load contacts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    try {
      if (editingId) {
        const { data } = await api.put(`/contacts/${editingId}`, form);
        setContacts((c) => c.map((x) => (x.id === editingId ? data.contact : x)));
        toast.success('Contact updated');
      } else {
        const { data } = await api.post('/contacts', form);
        setContacts((c) => [data.contact, ...c]);
        toast.success('Trusted contact added');
      }
      setForm(empty); setShowForm(false); setEditingId(null);
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Save failed');
    }
  };

  const remove = async (id) => {
    if (!confirm('Remove this trusted contact?')) return;
    try {
      await api.delete(`/contacts/${id}`);
      setContacts((c) => c.filter((x) => x.id !== id));
      toast.success('Contact removed');
    } catch {
      toast.error('Delete failed');
    }
  };

  const test = async (id) => {
    try {
      const { data } = await api.post(`/contacts/${id}/test`);
      toast.success(data.note || 'Test notification logged');
    } catch {
      toast.error('Test failed');
    }
  };

  const edit = (c) => {
    setForm({ ...c });
    setEditingId(c.id);
    setShowForm(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-navy-800">Trusted Circle</h1>
          <p className="text-navy-500 text-sm mt-1">People who can check on you and receive emergency notifications.</p>
        </div>
        <button
          onClick={() => { setForm(empty); setEditingId(null); setShowForm(true); }}
          className="btn-primary"
        >
          <UserPlus className="w-4 h-4" /> Add Contact
        </button>
      </header>

      {showForm && (
        <form onSubmit={submit} className="card p-5 sm:p-6 space-y-4 animate-slide-up">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-navy-800">{editingId ? 'Edit Contact' : 'New Trusted Contact'}</h2>
            <button type="button" onClick={() => { setShowForm(false); setEditingId(null); setForm(empty); }} className="text-navy-400 hover:text-navy-600"><X className="w-5 h-5" /></button>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block"><span className="label">Name *</span><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
            <label className="block"><span className="label">Relationship</span><input className="input" value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })} placeholder="e.g. Parent, Partner, Friend" /></label>
            <label className="block"><span className="label">Phone</span><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91…" /></label>
            <label className="block"><span className="label">Email</span><input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="trust@example.com" /></label>
            <label className="block"><span className="label">Notify via</span>
              <select className="input" value={form.notification_preference} onChange={(e) => setForm({ ...form, notification_preference: e.target.value })}>
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="push">Push</option>
              </select>
            </label>
            <label className="flex items-center gap-3 mt-7 cursor-pointer">
              <input type="checkbox" checked={!!form.is_primary} onChange={(e) => setForm({ ...form, is_primary: e.target.checked })} className="w-5 h-5 rounded accent-violet-600" />
              <span className="text-sm text-navy-700">Set as primary contact</span>
            </label>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">{editingId ? 'Save Changes' : 'Add Contact'}</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-navy-500 text-sm">Loading contacts…</div>
      ) : contacts.length === 0 ? (
        <div className="card p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center mx-auto mb-3"><UserPlus className="w-7 h-7" /></div>
          <p className="font-medium text-navy-800">No trusted contacts yet</p>
          <p className="text-sm text-navy-500 mt-1">Add someone you trust — they'll receive notifications in emergencies.</p>
          <button onClick={() => setShowForm(true)} className="btn-primary mt-4 mx-auto">Add your first contact</button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
          {contacts.map((c) => (
            <div key={c.id} className={`card p-4 sm:p-5 ${c.is_primary ? 'border-violet-200 bg-violet-50/30' : ''}`}>
              <div className="flex items-start gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-semibold shrink-0 ${c.is_primary ? 'bg-violet-600 text-white' : 'bg-navy-50 text-navy-700'}`}>
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-navy-800 truncate">{c.name}</p>
                    {c.is_primary && <span className="chip bg-violet-100 text-violet-700"><Star className="w-3 h-3" /> Primary</span>}
                  </div>
                  {c.relationship && <p className="text-xs text-navy-400">{c.relationship}</p>}
                  <div className="mt-2 space-y-1 text-xs text-navy-600">
                    {c.phone && <p className="flex items-center gap-1.5"><Phone className="w-3 h-3" /> {c.phone}</p>}
                    {c.email && <p className="flex items-center gap-1.5"><Mail className="w-3 h-3" /> {c.email}</p>}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <button onClick={() => edit(c)} className="p-1.5 rounded-lg text-navy-400 hover:bg-navy-50 hover:text-navy-600"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => test(c.id)} className="p-1.5 rounded-lg text-navy-400 hover:bg-navy-50 hover:text-navy-600" title="Send test notification"><Bell className="w-4 h-4" /></button>
                  <button onClick={() => remove(c.id)} className="p-1.5 rounded-lg text-navy-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
