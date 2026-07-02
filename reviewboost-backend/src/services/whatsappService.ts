import type { WASocket } from 'baileys';
import P from 'pino';
import path from 'path';
import fs from 'fs';
import { logger } from '../utils/logger';

type SessionStatus = 'not_initialized' | 'connecting' | 'connected' | 'disconnected';

interface WASession {
  socket: WASocket | null;
  qr:     string | null;
  status: SessionStatus;
  error:  string | null;
}

const sessions = new Map<string, WASession>();
const AUTH_DIR  = path.join(process.cwd(), 'whatsapp-sessions');
const waLog     = P({ level: 'silent' });

// Cache so baileys is only dynamically imported once
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _baileys: any = null;
async function baileys() {
  if (!_baileys) _baileys = await import('baileys');
  return _baileys;
}

// ─── Session lifecycle ────────────────────────────────────────────────────────

export async function connectWhatsApp(restaurantId: string): Promise<void> {
  const existing = sessions.get(restaurantId);
  if (existing?.status === 'connected') return;

  const authDir = path.join(AUTH_DIR, restaurantId);
  fs.mkdirSync(authDir, { recursive: true });

  const session: WASession = { socket: null, qr: null, status: 'connecting', error: null };
  sessions.set(restaurantId, session);

  let makeWASocket: (opts: unknown) => WASocket;
  let useMultiFileAuthState: (dir: string) => Promise<{ state: unknown; saveCreds: () => Promise<void> }>;
  let DisconnectReason: Record<string, number>;
  let fetchLatestBaileysVersion: () => Promise<{ version: [number, number, number] }>;

  try {
    ({ default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = await baileys());
  } catch (err) {
    session.status = 'disconnected';
    session.error  = `Failed to load Baileys: ${String(err)}`;
    logger.error('[WhatsApp] Baileys dynamic import failed:', err);
    return;
  }

  let state: unknown;
  let saveCreds: () => Promise<void>;
  let version: [number, number, number];

  try {
    ({ state, saveCreds } = await useMultiFileAuthState(authDir));
    // fetchLatestBaileysVersion makes a network call — use a known-good fallback if it fails
    try {
      ({ version } = await fetchLatestBaileysVersion());
    } catch {
      version = [2, 3000, 1023767601];
      logger.warn('[WhatsApp] fetchLatestBaileysVersion failed, using fallback version');
    }
  } catch (err) {
    session.status = 'disconnected';
    session.error  = `Init failed: ${String(err)}`;
    logger.error('[WhatsApp] Auth state init failed:', err);
    return;
  }

  let sock: WASocket;
  try {
    sock = makeWASocket({
      version,
      auth:              state,
      printQRInTerminal: false,
      logger:            waLog,
    });
  } catch (err) {
    session.status = 'disconnected';
    session.error  = `Socket creation failed: ${String(err)}`;
    logger.error('[WhatsApp] makeWASocket failed:', err);
    return;
  }

  session.socket = sock;
  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }: {
    connection?: string;
    lastDisconnect?: { error?: unknown };
    qr?: string;
  }) => {
    if (qr) {
      session.qr     = qr;
      session.status = 'connecting';
      logger.info(`[WhatsApp] QR ready — restaurant ${restaurantId}`);
    }
    if (connection === 'open') {
      session.qr     = null;
      session.status = 'connected';
      logger.info(`[WhatsApp] Connected — restaurant ${restaurantId}`);
    }
    if (connection === 'close') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const code   = (lastDisconnect?.error as any)?.output?.statusCode;
      const logout = code === DisconnectReason.loggedOut;
      session.status = 'disconnected';
      logger.warn(`[WhatsApp] Disconnected (code ${code}) — restaurant ${restaurantId}`);
      if (logout) {
        sessions.delete(restaurantId);
        fs.rmSync(authDir, { recursive: true, force: true });
      } else {
        setTimeout(() => connectWhatsApp(restaurantId).catch(() => null), 3_000);
      }
    }
  });
}

export async function disconnectWhatsApp(restaurantId: string): Promise<void> {
  const session = sessions.get(restaurantId);
  if (!session?.socket) return;
  try { await session.socket.logout(); } catch { /* ignore */ }
  sessions.delete(restaurantId);
  const authDir = path.join(AUTH_DIR, restaurantId);
  fs.rmSync(authDir, { recursive: true, force: true });
  logger.info(`[WhatsApp] Logged out — restaurant ${restaurantId}`);
}

export function getWhatsAppStatus(restaurantId: string): { status: SessionStatus; qr: string | null; error: string | null } {
  const session = sessions.get(restaurantId);
  if (!session) return { status: 'not_initialized', qr: null, error: null };
  return { status: session.status, qr: session.qr, error: session.error };
}

export async function initializeExistingSessions(): Promise<void> {
  if (!fs.existsSync(AUTH_DIR)) return;
  const ids = fs.readdirSync(AUTH_DIR).filter((f) =>
    fs.statSync(path.join(AUTH_DIR, f)).isDirectory(),
  );
  for (const id of ids) {
    await connectWhatsApp(id).catch((err) =>
      logger.error(`[WhatsApp] Failed to restore ${id}: ${String(err)}`),
    );
  }
  if (ids.length) logger.info(`[WhatsApp] Restored ${ids.length} session(s)`);
}

// ─── Send (fire-and-forget) ───────────────────────────────────────────────────

export function sendWA(restaurantId: string, phone: string | undefined | null, message: string): void {
  if (!phone) return;
  const session = sessions.get(restaurantId);
  if (!session || session.status !== 'connected' || !session.socket) return;

  const jid = toJid(phone);
  if (!jid) return;

  session.socket.sendMessage(jid, { text: message }).catch((err: unknown) =>
    logger.error(`[WhatsApp] Send failed (${phone}): ${String(err)}`),
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toJid(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) return null;
  const stripped = digits.replace(/^0/, '');
  const withCC   = stripped.length === 10 ? `91${stripped}` : stripped;
  return `${withCC}@s.whatsapp.net`;
}
