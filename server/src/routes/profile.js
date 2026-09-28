import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { supabaseAdmin } from '../services/supabaseClient.js';
import { requireAuth } from '../middleware/auth.js';
import { ApiError } from '../middleware/errorHandler.js';

const router = Router();
router.use(requireAuth);

// GET /api/profile
router.get('/', async (req, res, next) => {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, email, full_name, preferred_language, emergency_preferences, accessibility_preferences, created_at')
    .eq('id', req.user.id)
    .maybeSingle();
  if (error || !data) return next(new ApiError('Profile not found', 404));
  res.json({ profile: data });
});

// PATCH /api/profile
router.patch(
  '/',
  [
    body('full_name').optional().isLength({ max: 80 }),
    body('preferred_language').optional().isIn(['en', 'hi', 'te']),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return next(new ApiError(errors.array()[0].msg, 422));

    const allowed = ['full_name', 'preferred_language', 'emergency_preferences', 'accessibility_preferences'];
    const updates = {};
    for (const k of allowed) if (req.body[k] !== undefined) updates[k] = req.body[k];
    if (Object.keys(updates).length === 0) return next(new ApiError('Nothing to update', 400));

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('id', req.user.id)
      .select('id, email, full_name, preferred_language, emergency_preferences, accessibility_preferences, created_at')
      .single();
    if (error) return next(new ApiError('Update failed', 500));
    res.json({ profile: data });
  }
);

// GET /api/profile/state  -> current safety state
router.get('/state', async (req, res, next) => {
  const { data, error } = await supabaseAdmin
    .from('safety_states')
    .select('id, state, note, created_at')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return next(new ApiError('Could not load state', 500));
  res.json({ state: data ? data.state : 'safe', record: data });
});

// POST /api/profile/state  -> set safety state
router.post('/state', async (req, res, next) => {
  const { state, note } = req.body;
  if (!['safe', 'check_on_me', 'emergency'].includes(state)) {
    return next(new ApiError('Invalid state. Use safe | check_on_me | emergency', 422));
  }
  const { data, error } = await supabaseAdmin
    .from('safety_states')
    .insert({ user_id: req.user.id, state, note: note || null })
    .select('id, state, note, created_at')
    .single();
  if (error) return next(new ApiError('Could not set state', 500));
  res.json({ state: data });
});

export default router;
