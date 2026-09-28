import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { supabaseAdmin } from '../services/supabaseClient.js';
import { requireAuth } from '../middleware/auth.js';
import { ApiError } from '../middleware/errorHandler.js';

const router = Router();
router.use(requireAuth);

// GET /api/timers?status=active|all
router.get('/', async (req, res, next) => {
  let q = supabaseAdmin.from('safety_timers').select('*').eq('user_id', req.user.id);
  if (req.query.status === 'active') q = q.eq('status', 'active');
  q = q.order('started_at', { ascending: false });
  const { data, error } = await q;
  if (error) return next(new ApiError('Could not load timers', 500));
  res.json({ timers: data });
});

// POST /api/timers  body: { duration_minutes }
router.post(
  '/',
  [body('duration_minutes').isInt({ min: 1, max: 1440 })],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return next(new ApiError('duration_minutes must be 1-1440', 422));

    const duration = parseInt(req.body.duration_minutes, 10);
    const now = new Date();
    const expires = new Date(now.getTime() + duration * 60_000);

    // Cancel any existing active timers
    await supabaseAdmin
      .from('safety_timers')
      .update({ status: 'cancelled', ended_at: now.toISOString() })
      .eq('user_id', req.user.id)
      .eq('status', 'active');

    const { data, error } = await supabaseAdmin
      .from('safety_timers')
      .insert({
        user_id: req.user.id,
        duration_minutes: duration,
        status: 'active',
        started_at: now.toISOString(),
        expires_at: expires.toISOString(),
      })
      .select('*')
      .single();
    if (error) return next(new ApiError('Could not create timer', 500));
    res.status(201).json({ timer: data });
  }
);

// POST /api/timers/:id/extend  body: { minutes }
router.post('/:id/extend', async (req, res, next) => {
  const { id } = req.params;
  const minutes = parseInt(req.body.minutes, 10);
  if (!minutes || minutes < 1) return next(new ApiError('Provide minutes (>=1)', 422));

  const { data: existing } = await supabaseAdmin
    .from('safety_timers')
    .select('*')
    .eq('id', id)
    .eq('user_id', req.user.id)
    .maybeSingle();
  if (!existing) return next(new ApiError('Timer not found', 404));

  const base = new Date(Math.max(Date.now(), new Date(existing.expires_at).getTime()));
  const newExpires = new Date(base.getTime() + minutes * 60_000);
  const { data, error } = await supabaseAdmin
    .from('safety_timers')
    .update({ status: 'extended', expires_at: newExpires.toISOString() })
    .eq('id', id)
    .eq('user_id', req.user.id)
    .select('*')
    .single();
  if (error) return next(new ApiError('Could not extend timer', 500));
  res.json({ timer: data });
});

// POST /api/timers/:id/cancel
router.post('/:id/cancel', async (req, res, next) => {
  const { id } = req.params;
  const { data, error } = await supabaseAdmin
    .from('safety_timers')
    .update({ status: 'cancelled', ended_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', req.user.id)
    .select('*')
    .single();
  if (error || !data) return next(new ApiError('Timer not found', 404));
  res.json({ timer: data });
});

// POST /api/timers/:id/escalate  -> mark escalated (user did not respond)
router.post('/:id/escalate', async (req, res, next) => {
  const { id } = req.params;
  const { data, error } = await supabaseAdmin
    .from('safety_timers')
    .update({ status: 'escalated', ended_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', req.user.id)
    .select('*')
    .single();
  if (error || !data) return next(new ApiError('Timer not found', 404));
  // Auto-notify primary trusted contact (logged; real delivery requires provider)
  const { data: primary } = await supabaseAdmin
    .from('trusted_contacts')
    .select('id,name,phone,email')
    .eq('user_id', req.user.id)
    .eq('is_primary', true)
    .maybeSingle();
  await supabaseAdmin.from('notifications').insert({
    user_id: req.user.id,
    type: 'timer_escalation',
    payload: { timer_id: id, primary_contact: primary || null },
    delivery_status: primary ? 'sent' : 'failed',
  });
  res.json({
    timer: data,
    primary_contact: primary || null,
    note: primary
      ? 'A timer-escalation notification was logged for your primary trusted contact.'
      : 'No primary trusted contact set. Add one to receive escalations.',
  });
});

export default router;
