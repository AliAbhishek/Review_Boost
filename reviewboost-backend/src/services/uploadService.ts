import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env';

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key:    env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

export async function uploadLogo(fileBuffer: Buffer, restaurantId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder:         'reviewboost/logos',
          public_id:      `restaurant_${restaurantId}`,
          overwrite:      true,
          transformation: [
            { width: 400, height: 400, crop: 'limit' },
            { quality: 'auto', fetch_format: 'auto' },
          ],
        },
        (error, result) => {
          if (error || !result) return reject(error ?? new Error('Upload failed'));
          resolve(result.secure_url);
        },
      )
      .end(fileBuffer);
  });
}

export async function deleteLogo(restaurantId: string): Promise<void> {
  await cloudinary.uploader.destroy(`reviewboost/logos/restaurant_${restaurantId}`).catch(() => null);
}
