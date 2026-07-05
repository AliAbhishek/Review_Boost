import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { logger } from '../utils/logger';
import { env } from '../config/env';

let io: SocketIOServer | null = null;

export function initSocket(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(',').map((o) => o.trim()),
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket) => {
    const restaurantId = socket.handshake.query.restaurantId as string;
    if (restaurantId) {
      socket.join(`restaurant:${restaurantId}`);
      logger.info(`Socket connected — restaurant ${restaurantId}`);
    }

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected — restaurant ${restaurantId}`);
    });
  });

  return io;
}

export function getIO(): SocketIOServer {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}

export function emitToRestaurant(restaurantId: string, event: string, data: unknown): void {
  if (!io) return;
  io.to(`restaurant:${restaurantId}`).emit(event, data);
}
