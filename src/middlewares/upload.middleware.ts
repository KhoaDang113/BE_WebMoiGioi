import type { Request } from 'express';
import multer from 'multer';
import type { FileFilterCallback } from 'multer';
import { AppError } from '../utils/customErrors.js';

// Setup Memory Storage
const storage = multer.memoryStorage();

/**
 * fileFilter - Implements strict image-only filtering for uploads.
 * Complies with high security standards.
 */
const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    // Cast to any for callback compatibility with custom AppError
    cb(new AppError('Only images are allowed', 400, 'INVALID_FILE_TYPE') as any, false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB Limit
  },
});

export default upload;
