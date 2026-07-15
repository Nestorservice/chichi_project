'use strict';
// Sanitize CLOUDINARY_URL before importing the SDK to prevent startup crash if variables are not set yet
const isCloudinaryConfigured = 
  (process.env.CLOUDINARY_URL && process.env.CLOUDINARY_URL.startsWith('cloudinary://')) ||
  (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

if (process.env.CLOUDINARY_URL !== undefined && !process.env.CLOUDINARY_URL.startsWith('cloudinary://')) {
  delete process.env.CLOUDINARY_URL;
}

const multer = require('multer');
const cloudinary = require('cloudinary').v2;

if (isCloudinaryConfigured) {
  if (!process.env.CLOUDINARY_URL) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });
  }
} else {
  console.warn("WARNING: Cloudinary is not configured yet. Set CLOUDINARY_URL on Railway.");
}

// Memory storage keeps files as buffers in memory
const storage = multer.memoryStorage();

function fileFilter(req, file, cb) {
  const ok = /image\/(jpeg|jpg|png|webp|gif)/.test(file.mimetype);
  cb(ok ? null : new Error('Format non supporté (images uniquement)'), ok);
}

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

const champsImages = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'gallery', maxCount: 10 },
]);

// Helper function to upload buffers to Cloudinary
function uploadToCloudinary(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.buffer) return resolve(null);
    if (!isCloudinaryConfigured) {
      return reject(new Error("Cloudinary n'est pas configuré. Veuillez définir la variable CLOUDINARY_URL sur Railway."));
    }
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: 'mboa_resto' },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    uploadStream.end(file.buffer);
  });
}

module.exports = { upload, champsImages, uploadToCloudinary };
