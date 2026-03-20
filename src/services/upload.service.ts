import cloudinary from '../config/cloudinary.js';
import type { UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
import { AppError } from '../utils/customErrors.js';

export class UploadService {
  /**
   * Upload image to cloudinary from buffer
   * @param buffer Image data in memory
   * @param folder Target folder in Cloudinary
   * @returns Image dynamic information from Cloudinary
   */
  async uploadImage(buffer: Buffer, folder: string = 'avatars'): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          transformation: [{ width: 250, height: 250, crop: 'limit' }], // Optimize for avatar
        },
        (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
          if (error) {
            return reject(new AppError('Failed to upload image to Cloudinary', 500, 'CLOUDINARY_ERROR'));
          }
          if (!result) {
            return reject(new AppError('Cloudinary update failed: no result returned', 500, 'CLOUDINARY_ERROR'));
          }
          resolve(result.secure_url);
        }
      );

      // Write buffer to stream
      uploadStream.end(buffer);
    });
  }
}
