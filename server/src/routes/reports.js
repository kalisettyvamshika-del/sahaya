import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { supabaseAdmin } from '../services/supabaseClient.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { ApiError } from '../middleware/errorHandler.js';

const router = Router();

// GET /api/reports  (public: anyone may view, create requires auth)
router.get('/', async (req, res, next) => {
  const { data, error } = await supabaseAdmin
    .from('community_reports')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) return next(new ApiError('Could not load reports', 500));
  res.json({ reports: data });
});

// POST /api/reports
router.post(
  '/',
  optionalAuth,
  [
    body('category').isIn(['streetlight', 'road', 'isolated', 'transport', 'other']),
    body('description').isLength({ min: 5, max: 1000 }),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return next(new ApiError(errors.array()[0].msg, 422));

    const { category, description, location_label, location_lat, location_lng } = req.body;
    const { data, error } = await supabaseAdmin
      .from('community_reports')
      .insert({
        user_id: req.user?.id || null,
        category,
        description,
        location_label,
        location_lat,
        location_lng,
        status: 'pending',
      })
      .select('*')
      .single();
    if (error) return next(new ApiError('Could not create report: ' + error.message, 500));
    res.status(201).json({ report: data });
  }
);

// PUT /api/reports/:id  (only owner, status changes restricted)
router.put('/:id', requireAuth, async (req, res, next) => {
  const { id } = req.params;
  const allowed = ['description', 'location_label'];
  const updates = {};
  for (const k of allowed) if (req.body[k] !== undefined) updates[k] = req.body[k];

  const { data, error } = await supabaseAdmin
    .from('community_reports')
    .update(updates)
    .eq('id', id)
    .eq('user_id', req.user.id)
    .select('*')
    .single();
  if (error || !data) return next(new ApiError('Report not found or not owned', 404));
  res.json({ report: data });
});

// DELETE /api/reports/:id  (only owner)
router.delete('/:id', requireAuth, async (req, res, next) => {
  const { error, count } = await supabaseAdmin
    .from('community_reports')
    .delete({ count: 'exact' })
    .eq('id', req.params.id)
    .eq('user_id', req.user.id);
  if (error) return next(new ApiError('Delete failed', 500));
  if (count === 0) return next(new ApiError('Report not found', 404));
  res.json({ ok: true });
});

export default router;
