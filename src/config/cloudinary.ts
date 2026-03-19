import { v2 as cloudinary } from 'cloudinary';
import 'dotenv/config';

const cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
const api_key = process.env.CLOUDINARY_API_KEY;
const api_secret = process.env.CLOUDINARY_API_SECRET;

if (!cloud_name || !api_key || !api_secret || cloud_name === 'xxxxxxxx') {
  console.warn("⚠️ Cloudinary config is missing in .env or contains placeholder 'xxxxxxxx'");
}

cloudinary.config({
  cloud_name: cloud_name!,
  api_key: api_key!,
  api_secret: api_secret!,
});

export default cloudinary;
