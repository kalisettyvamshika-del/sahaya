import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { supabaseAdmin } from '../services/supabaseClient.js';
import { requireAuth } from '../middleware/auth.js';
import { ApiError } from '../middleware/errorHandler.js';

const router = Router();
router.use(requireAuth);

// GET /api/contacts
router.get('/', async (req, res, next) => {
  const { data, error } = await supabaseAdmin
    .from('trusted_contacts')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });
  if (error) return next(new ApiError('Could not load contacts', 500));
  res.json({ contacts: data });
});

// POST /api/contacts
router.post(
  '/',
  [
    body('name').isLength({ min: 1, max: 100 }).withMessage('Name required'),
    body('phone').optional().isLength({ max: 30 }),
    body('email').optional().isEmail().withMessage('Valid email or none'),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return next(new ApiError(errors.array()[0].msg, 422));

    const { name, relationship, phone, email, notification_preference, is_primary } = req.body;
    const { data, error } = await supabaseAdmin
      .from('trusted_contacts')
      .insert({
        user_id: req.user.id,
        name,
        relationship,
        phone,
        email,
        notification_preference: notification_preference || 'email',
        is_primary: !!is_primary,
      })
      .select('*')
      .single();
    if (error) return next(new ApiError('Could not create contact: ' + error.message, 500));

    // If new contact is primary, demote others
    if (is_primary) {
      await supabaseAdmin
        .from('trusted_contacts')
        .update({ is_primary: false })
        .neq('id', data.id)
        .eq('user_id', req.user.id);
    }
    res.status(201).json({ contact: data });
  }
);

// PUT /api/contacts/:id
router.put('/:id', async (req, res, next) => {
  const { id } = req.params;
  const allowed = ['name', 'relationship', 'phone', 'email', 'notification_preference', 'is_primary'];
  const updates = {};
  for (const k of allowed) if (req.body[k] !== undefined) updates[k] = req.body[k];

  if (updates.is_primary === true) {
    await supabaseAdmin
      .from('trusted_contacts')
      .update({ is_primary: false })
      .neq('id', id)
      .eq('user_id', req.user.id);
  }

  const { data, error } = await supabaseAdmin
    .from('trusted_contacts')
    .update(updates)
    .eq('id', id)
    .eq('user_id', req.user.id) // enforce ownership
    .select('*')
    .single();
  if (error) return next(new ApiError('Update failed', 500));
  if (!data) return next(new ApiError('Contact not found', 404));
  res.json({ contact: data });
});

// DELETE /api/contacts/:id
router.delete('/:id', async (req, res, next) => {
  const { id } = req.params;
  const { error, count } = await supabaseAdmin
    .from('trusted_contacts')
    .delete({ count: 'exact' })
    .eq('id', id)
    .eq('user_id', req.user.id);
  if (error) return next(new ApiError('Delete failed', 500));
  if (count === 0) return next(new ApiError('Contact not found', 404));
  res.json({ ok: true });
});

// POST /api/contacts/:id/test  -> simulate sending a test notification
router.post('/:id/test', async (req, res, next) => {
  const { id } = req.params;
  const { data, error } = await supabaseAdmin
    .from('trusted_contacts')
    .select('*')
    .eq('id', id)
    .eq('user_id', req.user.id)
    .maybeSingle();
  if (error || !data) return next(new ApiError('Contact not found', 404));

  // Log a test notification (real push/SMS/email requires configured providers)
  await supabaseAdmin.from('notifications').insert({
    user_id: req.user.id,
    type: 'test',
    payload: { contact_id: id, contact_name: data.name },
    delivery_status: 'sent',
  });

  res.json({
    ok: true,
    delivered_via: data.notification_preference,
    note:
      'A test notification was logged. Real SMS/Push delivery requires configuring providers (Twilio/Firebase/SES) - none are configured in this environment.',
  });
});

export default router;
