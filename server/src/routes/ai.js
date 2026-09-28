import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { requireAuth } from '../middleware/auth.js';
import { ApiError } from '../middleware/errorHandler.js';
import { generateAIResponse } from '../services/geminiService.js';

const router = Router();
router.use(requireAuth);

// POST /api/ai/generate
// body: { prompt }
router.post('/generate', [body('prompt').isLength({ min: 1, max: 4000 })], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(new ApiError('Prompt required (1-4000 chars)', 422));

  const { prompt } = req.body;
  const result = await generateAIResponse(prompt);

  if (!result.available) {
    // Honest unavailable status, NOT fake success
    return res.status(503).json({
      ok: false,
      available: false,
      message: result.message,
      reply: null,
    });
  }

  res.json({ ok: true, available: true, reply: result.reply });
});

// POST /api/ai/summarize  -> shorter helper for incident notes
router.post('/summarize', [body('text').isLength({ min: 1, max: 8000 })], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(new ApiError('Text required (1-8000 chars)', 422));

  const { text } = req.body;
  const prompt = `Summarize the following notes for safety review purposes.
Capture: key events, dates/times mentioned, locations mentioned, people mentioned by role (not name), unresolved questions.
Output as 3-5 short bullet points.

TEXT:
"""
${text}
"""`;
  const result = await generateAIResponse(prompt, { temperature: 0.2 });
  if (!result.available) {
    return res.status(503).json({ ok: false, message: result.message });
  }
  res.json({ ok: true, summary: result.reply });
});

export default router;
