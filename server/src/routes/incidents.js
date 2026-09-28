import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { supabaseAdmin } from '../services/supabaseClient.js';
import { requireAuth } from '../middleware/auth.js';
import { ApiError } from '../middleware/errorHandler.js';
import { summarizeText } from '../services/geminiService.js';

const router = Router();
router.use(requireAuth);

// GET /api/incidents
router.get('/', async (req, res, next) => {
  const q = req.query.q ? String(req.query.q) : null;
  let query = supabaseAdmin.from('incident_records').select('*').eq('user_id', req.user.id);
  if (q) {
    query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
  }
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) return next(new ApiError('Could not load incidents', 500));
  res.json({ incidents: data });
});

// GET /api/incidents/:id
router.get('/:id', async (req, res, next) => {
  const { data, error } = await supabaseAdmin
    .from('incident_records')
    .select('*')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .maybeSingle();
  if (error || !data) return next(new ApiError('Incident not found', 404));
  res.json({ incident: data });
});

// POST /api/incidents
router.post('/', [body('title').isLength({ min: 1, max: 200 })], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(new ApiError('Title required (max 200 chars)', 422));

  const { title, description, occurred_at, timeline } = req.body;
  const { data, error } = await supabaseAdmin
    .from('incident_records')
    .insert({
      user_id: req.user.id,
      title,
      description: description || null,
      timeline: timeline || [],
      occurred_at: occurred_at || new Date().toISOString(),
    })
    .select('*')
    .single();
  if (error) return next(new ApiError('Could not create incident: ' + error.message, 500));
  res.status(201).json({ incident: data });
});

// PUT /api/incidents/:id
router.put('/:id', async (req, res, next) => {
  const allowed = ['title', 'description', 'timeline', 'occurred_at', 'ai_summary'];
  const updates = {};
  for (const k of allowed) if (req.body[k] !== undefined) updates[k] = req.body[k];

  const { data, error } = await supabaseAdmin
    .from('incident_records')
    .update(updates)
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .select('*')
    .single();
  if (error || !data) return next(new ApiError('Incident not found or update failed', 404));
  res.json({ incident: data });
});

// DELETE /api/incidents/:id
router.delete('/:id', async (req, res, next) => {
  const { error, count } = await supabaseAdmin
    .from('incident_records')
    .delete({ count: 'exact' })
    .eq('id', req.params.id)
    .eq('user_id', req.user.id);
  if (error) return next(new ApiError('Delete failed', 500));
  if (count === 0) return next(new ApiError('Incident not found', 404));
  res.json({ ok: true });
});

// POST /api/incidents/:id/summarize  -> AI summary of incident description + timeline
router.post('/:id/summarize', async (req, res, next) => {
  const { data: inc, error } = await supabaseAdmin
    .from('incident_records')
    .select('*')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .maybeSingle();
  if (error || !inc) return next(new ApiError('Incident not found', 404));

  const textParts = [inc.description || '', JSON.stringify(inc.timeline || [])].join('\n');
  if (!textParts.trim()) return next(new ApiError('No content to summarize', 422));

  const result = await summarizeText(textParts, 'incident review');
  if (!result.available) {
    return res.status(503).json({ ok: false, message: result.message });
  }
  const { data: updated } = await supabaseAdmin
    .from('incident_records')
    .update({ ai_summary: result.reply })
    .eq('id', inc.id)
    .select('*')
    .single();
  res.json({ incident: updated, summary: result.reply });
});

export default router;
