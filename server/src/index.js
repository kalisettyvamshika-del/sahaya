import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/auth.js';
import profileRoutes from './routes/profile.js';
import contactRoutes from './routes/contacts.js';
import journeyRoutes from './routes/journeys.js';
import timerRoutes from './routes/timers.js';
import incidentRoutes from './routes/incidents.js';
import reportRoutes from './routes/reports.js';
import emergencyRoutes from './routes/emergency.js';
import aiRoutes from './routes/ai.js';
import healthRoutes from './routes/health.js';

import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// ---- Security & middleware ----
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    origin: (origin, cb) => {
      // Allow same-origin (no Origin header) and any configured client URL
      const allowed = (process.env.CLIENT_URL || '').split(',').map((u) => u.trim());
      if (!origin || allowed.includes(origin) || allowed.includes('*')) return cb(null, true);
      return cb(new Error('CORS blocked: ' + origin));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(morgan('tiny'));

// ---- Rate limiting ----
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// ---- Routes ----
app.get('/', (_req, res) =>
  res.json({
    name: 'SAHAYA API',
    status: 'online',
    tagline: 'Prepare. Connect. Respond.',
    docs: '/api/health',
  })
);

app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/journeys', journeyRoutes);
app.use('/api/timers', timerRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/emergency', emergencyRoutes);
app.use('/api/ai', aiRoutes);

// ---- 404 + error ----
app.use((req, res) => res.status(404).json({ error: 'Not found', path: req.path }));
app.use(errorHandler);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🛡️  SAHAYA API running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
});
