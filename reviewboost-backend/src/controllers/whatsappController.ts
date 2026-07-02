import { Request, Response } from 'express';
import QRCode from 'qrcode';
import { asyncHandler } from '../utils/asyncHandler';
import { connectWhatsApp, disconnectWhatsApp, getWhatsAppStatus } from '../services/whatsappService';
import { logger } from '../utils/logger';

export const getStatus = asyncHandler(async (req: Request, res: Response) => {
  const restaurantId = req.owner!.restaurantId.toString();
  const { status, qr, error } = getWhatsAppStatus(restaurantId);
  const qrDataUrl = qr ? await QRCode.toDataURL(qr) : null;
  res.success({ status, qrDataUrl, error });
});

export const connect = asyncHandler(async (req: Request, res: Response) => {
  const restaurantId = req.owner!.restaurantId.toString();

  // Fire-and-forget — kick off connection without blocking the HTTP response.
  // The frontend polls /status to track progress and pick up the QR.
  connectWhatsApp(restaurantId).catch((err: unknown) => {
    logger.error('[WhatsApp] connectWhatsApp threw:', err);
  });

  // Brief pause so Baileys has a chance to emit the QR before we respond
  await new Promise((r) => setTimeout(r, 2000));
  const { status, qr, error } = getWhatsAppStatus(restaurantId);
  const qrDataUrl = qr ? await QRCode.toDataURL(qr) : null;
  res.success({ status, qrDataUrl, error });
});

export const disconnect = asyncHandler(async (req: Request, res: Response) => {
  const restaurantId = req.owner!.restaurantId.toString();
  await disconnectWhatsApp(restaurantId);
  res.success({ message: 'WhatsApp disconnected' });
});
