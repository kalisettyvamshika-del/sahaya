import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import { supabaseAdmin } from '../services/supabaseClient.js';
import { signToken } from '../middleware/auth.js';
import { ApiError } from '../middleware/errorHandler.js';

const router = Router();
const BCRYPT_ROUNDS = 10;

async function audit(userId, action, meta = {}) {
  await supabaseAdmin.from('audit_logs').insert({ user_id: userId, action, meta });
}

// POST /api/auth/signup
router.post(
  '/signup',
  [
    body('email').isEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password min 6 chars'),
    body('full_name').optional().isLength({ max: 80 }),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return next(new ApiError(errors.array()[0].msg, 422));

    const { email, password, full_name } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    // Check existing
    const { data: existing } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();
    if (existing) return next(new ApiError('Email already registered', 409));

    const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .insert({ email: normalizedEmail, password_hash, full_name: full_name || null })
      .select('id, email, full_name, preferred_language, created_at')
      .single();

    if (error) return next(new ApiError('Could not create account: ' + error.message, 500));

    // Initial safety state
    await supabaseAdmin.from('safety_states').insert({ user_id: data.id, state: 'safe' });
    await audit(data.id, 'signup', { email: normalizedEmail });

    const token = signToken({ sub: data.id, email: data.email });
    res.status(201).json({ token, user: data });
  }
);

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email').isEmail(),
    body('password').isLength({ min: 1 }),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return next(new ApiError('Invalid credentials', 422));

    const { email, password } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, password_hash, preferred_language, created_at')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (error || !profile) return next(new ApiError('Invalid email or password', 401));

    const ok = await bcrypt.compare(password, profile.password_hash);
    if (!ok) return next(new ApiError('Invalid email or password', 401));

    await audit(profile.id, 'login');
    const token = signToken({ sub: profile.id, email: profile.email });
    const { password_hash, ...safeUser } = profile;
    res.json({ token, user: safeUser });
  }
);

// GET /api/auth/me
import { requireAuth } from '../middleware/auth.js';
router.get('/me', requireAuth, async (req, res, next) => {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, email, full_name, preferred_language, emergency_preferences, accessibility_preferences, created_at')
    .eq('id', req.user.id)
    .maybeSingle();
  if (error || !data) return next(new ApiError('Profile not found', 404));
  res.json({ user: data });
});

// POST /api/auth/change-password
router.post(
  '/change-password',
  requireAuth,
  [
    body('current_password').isLength({ min: 1 }),
    body('new_password').isLength({ min: 6 }),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return next(new ApiError(errors.array()[0].msg, 422));

    const { current_password, new_password } = req.body;
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, password_hash')
      .eq('id', req.user.id)
      .single();
    if (!profile) return next(new ApiError('Profile not found', 404));

    const ok = await bcrypt.compare(current_password, profile.password_hash);
    if (!ok) return next(new ApiError('Current password is incorrect', 401));

    const hash = await bcrypt.hash(new_password, BCRYPT_ROUNDS);
    await supabaseAdmin.from('profiles').update({ password_hash: hash }).eq('id', req.user.id);
    await audit(req.user.id, 'change_password');
    res.json({ ok: true });
  }
);

// DELETE /api/auth/account
router.delete('/account', requireAuth, async (req, res, next) => {
  // cascade rules delete the rest
  const { error } = await supabaseAdmin.from('profiles').delete().eq('id', req.user.id);
  if (error) return next(new ApiError('Could not delete account', 500));
  res.json({ ok: true, message: 'Account deleted' });
});

export default router;
