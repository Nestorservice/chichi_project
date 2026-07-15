'use strict';
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const DOSSIER = path.join(__dirname, '..', '..', 'uploads');
fs.mkdirSync(DOSSIER, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, DOSSIER),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, crypto.randomBytes(8).toString('hex') + ext);
  },
});

function fileFilter(req, file, cb) {
  const ok = /image\/(jpeg|jpg|png|webp|gif)/.test(file.mimetype);
  cb(ok ? null : new Error('Format non supporté (images uniquement)'), ok);
}

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

const champsImages = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'gallery', maxCount: 10 },
]);

module.exports = { upload, champsImages, DOSSIER };
