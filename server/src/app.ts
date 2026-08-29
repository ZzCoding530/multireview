import express from 'express';
import cors from 'cors';
import { UPLOADS_DIR } from './paths.js';
import { authRouter } from './routes/auth.js';
import { submitRouter } from './routes/submit.js';
import { reviewRouter } from './routes/review.js';
import { rulesRouter } from './routes/rules.js';
import { statsRouter } from './routes/stats.js';

export function createApp(): express.Express {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.use('/uploads', express.static(UPLOADS_DIR));

  app.use('/api/auth', authRouter);
  app.use('/api/submit', submitRouter);
  app.use('/api/review', reviewRouter);
  app.use('/api/rules', rulesRouter);
  app.use('/api/stats', statsRouter);

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, name: 'mini-modguard' });
  });

  return app;
}
