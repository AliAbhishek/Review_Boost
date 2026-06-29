import QRCode from 'qrcode';
import { env } from '../config/env';

const REVIEW_BASE_URL = `${env.FRONTEND_URL}/r`;

/**
 * Generates a QR code PNG buffer for the public review page of a restaurant.
 * @param slug - Restaurant slug (e.g. "rajdhani-restaurant-chandigarh")
 * @returns PNG image as a Buffer
 */
export async function generateQRCode(slug: string): Promise<Buffer> {
  const url = `${REVIEW_BASE_URL}/${slug}`;

  const buffer = await QRCode.toBuffer(url, {
    type: 'png',
    width: 400,
    margin: 2,
    color: {
      dark: '#1a1a1a',
      light: '#ffffff',
    },
    errorCorrectionLevel: 'H',
  });

  return buffer;
}

/**
 * Returns the public review URL for a restaurant slug.
 * @param slug - Restaurant slug
 */
export function getReviewUrl(slug: string): string {
  return `${REVIEW_BASE_URL}/${slug}`;
}

