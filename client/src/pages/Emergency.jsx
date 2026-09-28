import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Siren, Phone, MapPin, CheckCircle2, XCircle, Loader, Users, ShieldAlert, ArrowLeft, RefreshCw } from 'lucide-react';
import api from '../lib/api';
import { useToast } from '../context/ToastContext';

const OFFICIAL_EMERGENCY = '112'; // India emergency number; user can change in production

export default function Emergency() {
  const toast = useToast();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState([]);
  const [location, setLocation] = useState(null);
  const [locStatus, setLocStatus] = useState('idle'); // idle | loading | ok | denied

  useEffect(() => {
    api.get('/emergency/history').then((r) => setHistory(r.data.events || [])).catch(() => {});
    if (navigator.geolocation) {
      setLocStatus('loading');
      navigator.geolocation.getCurrentPosition(
        (pos) => { setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocStatus('ok'); },
        () => setLocStatus('denied'),
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      setLocStatus('denied');
    }
  }, []);

  const activate = async () => {
    if (!confirm('Activate Emergency Mode?\n\nThis will:\n• Create an emergency event\n• Notify your trusted contacts\n• Attempt authorized emergency-service integration')) return;
    setBusy(true);
    try {
      const { data } = await api.post('/emergency/activate', {
        lat: location?.lat,
        lng: location?.lng,
        label: location ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : null,
      });
      setEvent(data.event);
      if (data.trusted_contacts?.notified_count > 0) {
        toast.success(`Emergency activated. ${data.trusted_contacts.notified_count} trusted contact(s) notified.`);
      } else {
        toast.error('Emergency activated but no trusted contacts configured.');
      }
      // Refresh history
      const h = await api.get('/emergency/history');
      setHistory(h.data.events || []);
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Could not activate emergency');
    } finally { setBusy(false); }
  };

  const resolve = async () => {
    if (!event) return;
    if (!confirm('Resolve this emergency?')) return;
    try {
      const { data } = await api.post(`/emergency/resolve/${event.id}`);
      setEvent(data.event);
      toast.success('Emergency resolved. Stay safe.');
    } catch { toast.error('Could not resolve'); }
  };

  const active = event && event.state === 'active' ? event : null;

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-navy-500 hover:text-navy-700">
        <ArrowLeft className="w-4 h-4" /> Back to dashboard
      </Link>

      {!active ? (
        <>
          <div className="card p-6 sm:p-8 text-center border-rose-200 bg-rose-50/30">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-rose-500 to-rose-700 flex items-center justify-center mx-auto mb-4 shadow-emergency">
              <Siren className="w-10 h-10 text-white animate-pulse-soft" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-rose-700">Emergency Mode</h1>
            <p className="text-navy-600 mt-2 max-w-md mx-auto">
              Activating Emergency Mode will create an emergency event, notify your trusted contacts, and attempt
              authorized emergency-service integration. Use this only when you need immediate assistance.
            </p>

            <div className="mt-6 grid sm:grid-cols-2 gap-3 text-left">
              <div className="card p-3">
                <p className="text-xs font-medium text-navy-500 uppercase tracking-wider">Location</p>
                <p className="text-sm text-navy-700 mt-1 flex items-center gap-1.5">
                  {locStatus === 'ok' && <><MapPin className="w-4 h-4 text-emerald-500" /> Available</>}
                  {locStatus === 'loading' && <><Loader className="w-4 h-4 animate-spin text-violet-500" /> Detecting…</>}
                  {locStatus === 'denied' && <><XCircle className="w-4 h-4 text-rose-500" /> Permission denied</>}
                  {locStatus === 'idle' && <><MapPin className="w-4 h-4 text-navy-400" /> Not requested</>}
                </p>
              </div>
              <div className="card p-3">
                <p className="text-xs font-medium text-navy-500 uppercase tracking-wider">Status</p>
                <p className="text-sm text-navy-700 mt-1">Ready to activate</p>
              </div>
            </div>

            <button
              onClick={activate}
              disabled={busy}
              className="btn btn-danger w-full sm:w-auto mt-6 text-base px-8 py-3.5 shadow-emergency"
            >
              <Siren className="w-5 h-5" /> {busy ? 'Activating…' : 'Activate Emergency Mode'}
            </button>

            <p className="text-xs text-navy-400 mt-4">
              If you cannot use the app, call your local emergency number directly.
            </p>
          </div>

          {/* History */}
          {history.length > 0 && (
            <section className="card p-5 sm:p-6">
              <h2 className="font-semibold text-navy-800 mb-3">Emergency History</h2>
              <ul className="divide-y divide-navy-50">
                {history.map((e) => (
                  <li key={e.id} className="py-3 flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${e.state === 'resolved' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-navy-700 truncate">{new Date(e.created_at).toLocaleString()} · {e.state}</p>
                      <p className="text-xs text-navy-400">Delivery: {e.delivery_status}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      ) : (
        // ====== ACTIVE EMERGENCY SCREEN ======
        <div className="space-y-4">
          <div className="rounded-3xl bg-gradient-to-br from-rose-500 to-rose-700 text-white p-6 sm:p-8 shadow-emergency">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center animate-pulse-soft">
                <Siren className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-white/70 font-semibold">Emergency Mode</p>
                <h1 className="text-2xl sm:text-3xl font-bold">Emergency is active</h1>
              </div>
            </div>
            <p className="mt-4 text-white/85">Your emergency response is being processed.</p>
            <p className="mt-1 text-xs text-white/60">Event ID: {active.id}</p>
            <p className="mt-1 text-xs text-white/60">Activated: {new Date(active.created_at).toLocaleString()}</p>
          </div>

          {/* Status panels */}
          <div className="grid sm:grid-cols-2 gap-3">
            <StatusPanel
              icon={MapPin}
              title="Location"
              status={active.location_lat ? 'shared' : 'unavailable'}
              detail={active.location_lat ? `${active.location_lat.toFixed(4)}, ${active.location_lng.toFixed(4)}` : 'No location available'}
            />
            <StatusPanel
              icon={Users}
              title="Trusted Contacts"
              status={active.delivery_status === 'sent' ? 'notified' : 'failed'}
              detail={active.delivery_status === 'sent'
                ? 'Your trusted contacts have been notified.'
                : 'Trusted-contact delivery could not be confirmed.'}
            />
            <StatusPanel
              icon={ShieldAlert}
              title="Emergency Service"
              status="unavailable"
              detail="No authorized emergency-service integration is configured."
            />
            <StatusPanel
              icon={CheckCircle2}
              title="Timestamp"
              status="ok"
              detail={new Date(active.created_at).toLocaleString()}
            />
          </div>

          {active.delivery_status === 'failed' && (
            <div className="card p-4 border-amber-200 bg-amber-50/50 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-medium">Emergency notification could not be confirmed.</p>
                <p className="text-amber-700 mt-1">No authorized emergency-service integration is configured. Please contact your local emergency service directly.</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="card p-4 sm:p-5 space-y-3">
            <h2 className="font-semibold text-navy-800">Actions</h2>
            <a href={`tel:${OFFICIAL_EMERGENCY}`} className="btn btn-danger w-full">
              <Phone className="w-5 h-5" /> Call Emergency Service ({OFFICIAL_EMERGENCY})
            </a>
            <button onClick={resolve} className="btn btn-secondary w-full">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" /> Resolve Emergency
            </button>
            <p className="text-xs text-navy-400 text-center">
              Resolving will end the active emergency. Trusted contacts will see the resolution in your shared status.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusPanel({ icon: Icon, title, status, detail }) {
  const colors = {
    ok: 'bg-emerald-100 text-emerald-700',
    shared: 'bg-violet-100 text-violet-700',
    notified: 'bg-violet-100 text-violet-700',
    failed: 'bg-rose-100 text-rose-700',
    unavailable: 'bg-amber-100 text-amber-700',
  };
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-lg bg-navy-50 text-navy-700 flex items-center justify-center">
          <Icon className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />
        </div>
        <p className="text-sm font-semibold text-navy-700">{title}</p>
      </div>
      <span className={`chip mt-3 ${colors[status] || colors.unavailable} capitalize`}>{status}</span>
      <p className="text-xs text-navy-500 mt-2">{detail}</p>
    </div>
  );
}
