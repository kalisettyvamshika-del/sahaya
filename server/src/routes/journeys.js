import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { supabaseAdmin } from '../services/supabaseClient.js';
import { requireAuth } from '../middleware/auth.js';
import { ApiError } from '../middleware/errorHandler.js';

const router = Router();
router.use(requireAuth);

// GET /api/journeys?status=active|completed|all
router.get('/', async (req, res, next) => {
  let q = supabaseAdmin.from('journeys').select('*').eq('user_id', req.user.id);
  if (req.query.status === 'active') q = q.eq('status', 'active');
  q = q.order('created_at', { ascending: false });
  const { data, error } = await q;
  if (error) return next(new ApiError('Could not load journeys', 500));
  res.json({ journeys: data });
});

// POST /api/journeys
router.post(
  '/',
  [
    body('destination_label').isLength({ min: 1 }).withMessage('Destination required'),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return next(new ApiError(errors.array()[0].msg, 422));

    const {
      origin_label, origin_lat, origin_lng,
      destination_label, dest_lat, dest_lng,
      expected_arrival, trusted_contact_id,
    } = req.body;

    // Complete any prior active journey
    await supabaseAdmin
      .from('journeys')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('user_id', req.user.id)
      .eq('status', 'active');

    const { data, error } = await supabaseAdmin
      .from('journeys')
      .insert({
        user_id: req.user.id,
        origin_label, origin_lat, origin_lng,
        destination_label, dest_lat, dest_lng,
        expected_arrival,
        trusted_contact_id,
        status: 'active',
      })
      .select('*')
      .single();
    if (error) return next(new ApiError('Could not create journey: ' + error.message, 500));
    res.status(201).json({ journey: data });
  }
);

// POST /api/journeys/:id/complete
router.post('/:id/complete', async (req, res, next) => {
  const { id } = req.params;
  const { data, error } = await supabaseAdmin
    .from('journeys')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', req.user.id)
    .select('*')
    .single();
  if (error || !data) return next(new ApiError('Journey not found', 404));
  res.json({ journey: data });
});

// POST /api/journeys/:id/cancel
router.post('/:id/cancel', async (req, res, next) => {
  const { id } = req.params;
  const { data, error } = await supabaseAdmin
    .from('journeys')
    .update({ status: 'cancelled', completed_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', req.user.id)
    .select('*')
    .single();
  if (error || !data) return next(new ApiError('Journey not found', 404));
  res.json({ journey: data });
});

// GET /api/journeys/active/checkin  -> prompt user
router.get('/active/checkin', async (req, res, next) => {
  const { data } = await supabaseAdmin
    .from('journeys')
    .select('*')
    .eq('user_id', req.user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  res.json({ active: data || null });
});

// POST /api/journeys/checkin
router.post('/checkin', async (req, res, next) => {
  const { journey_id, status, lat, lng } = req.body;
  if (!['safe', 'extend', 'help', 'no_response'].includes(status)) {
    return next(new ApiError('Invalid check-in status', 422));
  }
  const { data, error } = await supabaseAdmin
    .from('check_ins')
    .insert({
      user_id: req.user.id,
      journey_id,
      status,
      location_lat: lat,
      location_lng: lng,
    })
    .select('*')
    .single();
  if (error) return next(new ApiError('Could not save check-in', 500));
  res.json({ check_in: data });
});

export default router;
