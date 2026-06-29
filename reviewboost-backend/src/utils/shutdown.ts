import http from 'http';
import mongoose from 'mongoose';
import { logger } from './logger';

const SHUTDOWN_TIMEOUT_MS = 30_000;

/**
 * Registers SIGTERM / SIGINT handlers for graceful shutdown and
 * process-level handlers for uncaught exceptions and unhandled rejections.
 * Call this once after the HTTP server starts.
 */
export function registerShutdownHandlers(server: http.Server): void {
  const shutdown = (signal: string) => (): void => {
    logger.info(`${signal} received — starting graceful shutdown`);

    // Stop accepting new connections; wait for in-flight requests to finish.
    server.close(async (closeErr) => {
      if (closeErr) {
        logger.error('Error closing HTTP server', closeErr);
        process.exit(1);
      }

      try {
        await mongoose.disconnect();
        logger.info('MongoDB connection closed');
        process.exit(0);
      } catch (dbErr) {
        logger.error('Error disconnecting MongoDB', dbErr);
        process.exit(1);
      }
    });

    // Force exit if graceful shutdown takes too long.
    const timer = setTimeout(() => {
      logger.error('Graceful shutdown timed out — forcing exit');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);

    // Don't let this timer keep the event loop alive.
    timer.unref();
  };

  process.on('SIGTERM', shutdown('SIGTERM'));
  process.on('SIGINT', shutdown('SIGINT'));

  process.on('uncaughtException', (err: Error) => {
    logger.error('Uncaught exception — shutting down', err);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason: unknown) => {
    logger.error('Unhandled promise rejection — shutting down', { reason });
    process.exit(1);
  });
}
