import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { apiRouter } from './routes/api.js';
import { logger } from './utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const app = express();

app.set('trust proxy', 1);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https://*.twimg.com'],
        mediaSrc: ["'self'", 'https://video.twimg.com', 'blob:'],
        connectSrc: ["'self'"]
      }
    },
    crossOriginEmbedderPolicy: false
  })
);

app.use(cors());
app.use(express.json({ limit: '1mb' }));

const windowMinutes = Number(process.env.RATE_LIMIT_WINDOW_MINUTES) || 15;

const limiter = rateLimit({
  windowMs: windowMinutes * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: `Muitas requisições. Tente de novo em ${windowMinutes} minutos.`
  }
});

app.use(express.static(path.join(__dirname, '../public')));
app.use('/api', limiter, apiRouter);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Não encontrado.' });
});

app.use((err, req, res, next) => {
  logger.error(err.stack || err.message);
  res.status(500).json({ success: false, error: 'Erro interno.' });
});
