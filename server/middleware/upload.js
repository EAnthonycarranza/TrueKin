const multer = require('multer');

/**
 * Files are buffered in memory rather than written to disk: the storage layer
 * (utils/storage.js) may put them in Cloudflare R2, where a temp file on the
 * dyno would be pointless. sharp reads the buffer directly.
 *
 * Kept at 10MB/file so a handful of buffered uploads stays well inside the
 * dyno's memory budget.
 */
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, and WebP images are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    fieldSize: 50 * 1024 * 1024, // 50MB for text fields (designData with base64 textures)
  },
});

module.exports = upload;
