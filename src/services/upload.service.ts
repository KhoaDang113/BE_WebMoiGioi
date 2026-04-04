import cloudinary from '../config/cloudinary.js';
import type { UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
import { AppError } from '../utils/customErrors.js';

interface UploadOptions {
  folder?: string;
  transformation?: object[];
}

export class UploadService {
  /**
   * Upload image to cloudinary from buffer
   * @param buffer Image data in memory
   * @param options Target folder and transformation options
   * @returns Image dynamic information from Cloudinary
   */
  async uploadImage(buffer: Buffer, options: UploadOptions = {}): Promise<string> {
    const { folder = 'general', transformation } = options;
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          ...(transformation ? { transformation } : {}),
        },
        (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
          if (error) {
            return reject(new AppError(`Failed to upload image to Cloudinary: ${error.message}`, 500, "CLOUDINARY_ERROR"));
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

  /**
   * Upload any file (image, pdf, docx, etc.) to Cloudinary
   */
  async uploadFile(buffer: Buffer, originalName: string, options: UploadOptions = {}): Promise<string> {
    const { folder = 'chat_files' } = options;
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'auto',
          public_id: `${Date.now()}-${originalName.replace(/\s+/g, '_')}`,
          use_filename: true,
          unique_filename: false,
        },
        (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
          if (error) {
            return reject(new AppError(`Failed to upload file to Cloudinary: ${error.message}`, 500, "CLOUDINARY_ERROR"));
          }
          if (!result) {
            return reject(new AppError('Cloudinary upload failed: no result returned', 500, 'CLOUDINARY_ERROR'));
          }
          resolve(result.secure_url);
        }
      );
      uploadStream.end(buffer);
    });
  }
}

