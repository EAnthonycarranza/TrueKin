/**
 * /uploads — serves product images.
 *
 * Two sources, in order:
 *   1. the local filesystem, for dev and for any legacy file still on the dyno
 *   2. Cloudflare R2, when credentials are configured
 *
 * This route only matters when the bucket is private. Set R2_PUBLIC_BASE_URL
 * (an r2.dev development URL or a custom domain) and newly stored images are
 * linked to Cloudflare directly, bypassing the dyno entirely — this route then
 * just keeps older `/uploads/...` rows working.
 */
const express = require('express');
const storage = require('../utils/storage');

const router = express.Router();

// Local files win when present: zero-latency in dev, and legacy files on a
// long-lived dyno keep resolving without a round trip to Cloudflare.
router.use(express.static(storage.UPLOAD_DIR, {
  maxAge: '1y',
  immutable: true,
  fallthrough: true,
}));

if (storage.isEnabled()) {
  router.get('/:name', async (req, res) => {
    const { name } = req.params;

    // An Express route param cannot span '/', but reject traversal explicitly
    // rather than relying on that: `name` is interpolated into an object key.
    if (name.includes('..') || name.includes('/') || name.includes('\\')) {
      return res.status(400).json({ message: 'Invalid image name' });
    }

    const obj = await storage.getImageStream(name);
    if (!obj) {
      return res.status(404).json({ message: 'Image not found' });
    }

    res.set('Content-Type', obj.contentType);
    if (obj.contentLength) res.set('Content-Length', String(obj.contentLength));
    res.set('Cache-Control', 'public, max-age=31536000, immutable');

    obj.body.on('error', (err) => {
      console.error(`R2 stream error for ${name}: ${err.message}`);
      if (!res.headersSent) res.status(502).end();
      else res.destroy();
    });
    obj.body.pipe(res);
  });
}

module.exports = router;
