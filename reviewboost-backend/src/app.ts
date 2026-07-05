import './config/env';
import http from 'http';
import express from 'express';
import cors, { CorsOptions } from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';

import authRouter from './routes/auth';
import adminAuthRouter from './routes/adminAuth';
import adminRouter from './routes/admin';
import reviewRouter from './routes/review';
import qrRouter from './routes/qr';
import ownerRouter from './routes/owner';
import customerRouter from './routes/customer';
import voucherRouter from './routes/voucher';
import menuRouter from './routes/menu';
import billRouter from './routes/bill';
import orderRouter from './routes/order';
import publicRouter from './routes/public';
import whatsappRouter from './routes/whatsapp';
import { startScheduler } from './services/schedulerService';
import { initializeExistingSessions } from './services/whatsappService';
import { initSocket } from './services/socketService';
import { errorHandler } from './middleware/errorHandler';
import { requestId } from './middleware/requestId';
import { responseHandler } from './middleware/responseHandler';
import { AppError } from './utils/AppError';
import { logger, httpLogStream } from './utils/logger';
import { connectDB } from './config/db';
import { registerShutdownHandlers } from './utils/shutdown';
import { seedAdmin } from './utils/seedAdmin';
import { env } from './config/env';

const app = express();

// ─── CORS must come BEFORE helmet ─────────────────────────────────────────────
// helmet sets Cross-Origin-Resource-Policy: same-origin by default which
// blocks cross-origin requests before CORS headers are applied.
const corsOptions: CorsOptions = {
  origin:
    env.CORS_ORIGIN === '*'
      ? true
      : env.CORS_ORIGIN.split(',').map((o) => o.trim()),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  exposedHeaders: ['X-Request-ID'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // handle preflight for all routes

// ─── Security headers (after CORS so headers don't conflict) ──────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  }),
);

// ─── Request ID — must come before logging ────────────────────────────────────
app.use(requestId);

// ─── Standardised response helpers (res.success, res.created, etc.) ──────────
app.use(responseHandler);

// ─── HTTP access logging via Winston ─────────────────────────────────────────
if (env.NODE_ENV !== 'test') {
  const morganFormat = env.NODE_ENV === 'production' ? 'combined' : 'dev';
  app.use(morgan(morganFormat, { stream: httpLogStream }));
}

// ─── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ─── Response compression ─────────────────────────────────────────────────────
app.use(compression());

// ─── NoSQL injection prevention (strips $ and . from user input) ──────────────
app.use(mongoSanitize());

// ─── HTTP Parameter Pollution prevention ─────────────────────────────────────
app.use(hpp());

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    env: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/admin/auth', adminAuthRouter);
app.use('/api/admin', adminRouter);
app.use('/api/review', reviewRouter);
app.use('/api/qr', qrRouter);
app.use('/api/owner', ownerRouter);
app.use('/api/customers', customerRouter);
app.use('/api/voucher', voucherRouter);
app.use('/api/menu', menuRouter);
app.use('/api/bills', billRouter);
app.use('/api/orders', orderRouter);
app.use('/api/public',    publicRouter);
app.use('/api/whatsapp', whatsappRouter);

// ─── 404 handler ──────────────────────────────────────────────────────────────
app.use((_req, _res, next) => {
  next(new AppError('Route not found', 404));
});

// ─── Global error handler — must be last ─────────────────────────────────────
app.use(errorHandler);

// ─── Server startup — only runs when executed directly, not when imported ─────
if (require.main === module) {
  connectDB()
    .then(() => seedAdmin())
    .then(() => {
      const httpServer = http.createServer(app);
      initSocket(httpServer);
      httpServer.listen(env.PORT, () => {
        logger.info(`ReviewBoost API — port ${env.PORT} [${env.NODE_ENV}]`);
      });
      startScheduler();
      initializeExistingSessions().catch((err: Error) =>
        logger.error('WhatsApp session restore failed', err),
      );
      registerShutdownHandlers(httpServer);
    })
    .catch((err: Error) => {
      logger.error('Failed to start server', err);
      process.exit(1);
    });
}

export default app;
