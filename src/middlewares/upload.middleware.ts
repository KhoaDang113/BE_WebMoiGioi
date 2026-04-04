import type { Request } from 'express';
import multer from 'multer';
import type { FileFilterCallback } from 'multer';
import { AppError } from '../utils/customErrors.js';

const storage = multer.memoryStorage();

// Image-only filter (used by listing, avatar, etc.)
const imageFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new AppError('Only images are allowed', 400, 'INVALID_FILE_TYPE') as any, false);
  }
};

// Any file filter (used by chat file upload)
const anyFileFilter = (
  _req: Request,
  _file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  cb(null, true);
};

// Default: images only
const upload = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// For chat file uploads: allow any file, 20MB limit
export const uploadChatFile = multer({
  storage,
  fileFilter: anyFileFilter,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});

export default upload;
