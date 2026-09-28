import { Router } from 'express';
import { supabaseAdmin } from '../services/supabaseClient.js';

const router = Router();

// GET /api/health
router.get('/', async (_req, res) => {
  let db = 'unknown';
  let gemini = 'unknown';
  try {
    const { error } = await supabaseAdmin.from('audit_logs').select('id').limit(1);
    db = error ? 'down' : 'ok';
  } catch {
    db = 'down';
  }
  gemini = process.env.GEMINI_API_KEY ? 'configured' : 'not_configured';
  res.json({
    status: 'online',
    tagline: 'Prepare. Connect. Respond.',
    services: {
      database: db,
      ai: gemini,
      emergency_provider: 'not_configured',
    },
    time: new Date().toISOString(),
  });
});

export default router;
