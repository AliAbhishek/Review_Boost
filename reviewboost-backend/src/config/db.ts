import mongoose from 'mongoose';
import { logger } from '../utils/logger';

const POOL_SIZE = { maxPoolSize: 10, minPoolSize: 2 };
const TIMEOUTS = { serverSelectionTimeoutMS: 5_000, socketTimeoutMS: 45_000 };

/**
 * Connects to MongoDB with exponential-backoff retry.
 * Reads MONGODB_URI at call-time so tests can override it after module load.
 * @param retries - Total attempts before throwing (default 5)
 * @param delayMs - Initial delay between retries in ms (doubles each attempt)
 */
export const connectDB = async (retries = 5, delayMs = 3_000): Promise<void> => {
  if (mongoose.connection.readyState === 1) return;

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI environment variable is not set');

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoose.connect(uri, { ...POOL_SIZE, ...TIMEOUTS });
      logger.info('MongoDB connected');
      return;
    } catch (err) {
      if (attempt === retries) throw err;
      const wait = delayMs * 2 ** (attempt - 1);
      logger.warn(`MongoDB connection attempt ${attempt}/${retries} failed — retrying in ${wait}ms`);
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
  }
};

mongoose.connection.on('error', (err) => logger.error('MongoDB error', err));
mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
