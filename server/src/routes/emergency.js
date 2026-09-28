import { Router } from 'express';
import { supabaseAdmin } from '../services/supabaseClient.js';
import { requireAuth } from '../middleware/auth.js';
import { ApiError } from '../middleware/errorHandler.js';

const router = Router();
router.use(requireAuth);

// EmergencyServiceProvider abstraction.
// Real emergency-services integration requires an authorized adapter
// (e.g. a public-safety answering point API, smart911-like integration,
// or a regional eCall gateway). Without one configured, we HONESTLY
// report "direct police notification is unavailable" and provide the
// official public emergency contact (e.g. 112 in India, 911 in US).
class EmergencyServiceProvider {
  constructor() {
    this.configured = false;
    this.providerName = 'None configured';
    this.officialContact = '112'; // default India emergency
  }
  async createEmergencyEvent({ user_id, location, device_info }) {
    return {
      sent: false,
      providerMessage: 'No authorized emergency-service integration is configured.',
    };
  }
  async getDeliveryStatus(event_id) {
    return { status: 'failed', detail: 'No provider configured' };
  }
}

const provider = new EmergencyServiceProvider();

// POST /api/emergency/activate  body: { lat, lng, label }
router.post('/activate', async (req, res, next) => {
  const { lat, lng, label } = req.body || {};
  const device_info = {
    user_agent: req.headers['user-agent'],
    ip: req.ip,
    timestamp: new Date().toISOString(),
  };

  // 1) Create the emergency event record (always succeeds)
  const { data: ev, error } = await supabaseAdmin
    .from('emergency_events')
    .insert({
      user_id: req.user.id,
      state: 'active',
      location_lat: lat ?? null,
      location_lng: lng ?? null,
      location_label: label || null,
      delivery_status: 'sending',
      device_info,
    })
    .select('*')
    .single();
  if (error) return next(new ApiError('Could not create emergency event: ' + error.message, 500));

  // 2) Set safety state to emergency
  await supabaseAdmin
    .from('safety_states')
    .insert({ user_id: req.user.id, state: 'emergency', note: 'Emergency mode activated' });

  // 3) Try the authorized emergency-service integration (provider)
  const result = await provider.createEmergencyEvent({
    user_id: req.user.id,
    location: { lat, lng, label },
    device_info,
  });

  // 4) Notify trusted contacts (logged; real delivery requires configured providers)
  const { data: contacts } = await supabaseAdmin
    .from('trusted_contacts')
    .select('id,name,phone,email,notification_preference')
    .eq('user_id', req.user.id);

  const primary = contacts?.find((c) => c.is_primary) || contacts?.[0];

  await supabaseAdmin.from('notifications').insert({
    user_id: req.user.id,
    type: 'emergency_activated',
    payload: {
      event_id: ev.id,
      contacts_notified: contacts?.length || 0,
      primary_contact: primary || null,
      provider_attempted: provider.configured,
    },
    delivery_status: primary ? 'sent' : 'failed',
  });

  // 5) Update delivery status
  const delivery_status = result.sent ? 'sent' : 'failed';
  await supabaseAdmin
    .from('emergency_events')
    .update({ delivery_status })
    .eq('id', ev.id);

  res.status(201).json({
    event: { ...ev, delivery_status },
    provider: {
      configured: provider.configured,
      name: provider.providerName,
      message: result.providerMessage,
      official_contact: provider.officialContact,
    },
    trusted_contacts: {
      notified_count: contacts?.length || 0,
      primary: primary || null,
      delivery_note:
        contacts?.length > 0
          ? 'Trusted-contact notifications have been logged. Real SMS/Push delivery requires configuring a provider (Twilio/Firebase/SES).'
          : 'No trusted contacts configured. Add one to receive emergency notifications.',
    },
  });
});

// GET /api/emergency/status/:id
router.get('/status/:id', async (req, res, next) => {
  const { data, error } = await supabaseAdmin
    .from('emergency_events')
    .select('*')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .maybeSingle();
  if (error || !data) return next(new ApiError('Emergency event not found', 404));
  res.json({ event: data });
});

// POST /api/emergency/resolve/:id
router.post('/resolve/:id', async (req, res, next) => {
  const { data, error } = await supabaseAdmin
    .from('emergency_events')
    .update({ state: 'resolved', resolved_at: new Date().toISOString(), delivery_status: 'confirmed' })
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .select('*')
    .single();
  if (error || !data) return next(new ApiError('Emergency event not found', 404));

  await supabaseAdmin
    .from('safety_states')
    .insert({ user_id: req.user.id, state: 'safe', note: 'Emergency resolved by user' });

  res.json({ event: data });
});

// GET /api/emergency/history
router.get('/history', async (req, res, next) => {
  const { data, error } = await supabaseAdmin
    .from('emergency_events')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) return next(new ApiError('Could not load history', 500));
  res.json({ events: data });
});

export default router;
