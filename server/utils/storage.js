/**
 * Image storage — Cloudflare R2 with a local-disk fallback.
 *
 * Why this exists: Heroku dynos have an ephemeral filesystem. Anything written
 * to server/uploads is destroyed on every restart, deploy, and daily dyno
 * cycle, so product images uploaded through the admin silently vanished. R2 is
 * the durable store; local disk stays as the dev/no-credentials path.
 *
 * Object keys mirror the historical URL shape (`uploads/<name>` ⇄
 * `/uploads/<name>`) so rows already in Mongo keep resolving unchanged.
 *
 * Serving: if R2_PUBLIC_BASE_URL is set (an r2.dev development URL or a custom
 * domain) images are linked directly and never touch the dyno. Without it the
 * bucket stays private and Express streams objects back through /uploads —
 * correct either way, just more egress through the app.
 */
const fs = require('fs');
const path = require('path');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
const KEY_PREFIX = 'uploads';

const {
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET,
  R2_PUBLIC_BASE_URL,
} = process.env;

const r2Configured = Boolean(
  R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET
);

let s3 = null;
let S3Cmd = null;

if (r2Configured) {
  // Required lazily so a missing optional dep can never take down boot.
  const {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand,
  } = require('@aws-sdk/client-s3');

  S3Cmd = { PutObjectCommand, GetObjectCommand, DeleteObjectCommand };
  s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });
}

const isEnabled = () => r2Configured;

/** `/uploads/foo.jpg` → `uploads/foo.jpg`; bare names are prefixed. */
function keyFromUrl(imageUrl) {
  if (!imageUrl) return null;
  let u = String(imageUrl);
  if (/^https?:\/\//i.test(u)) {
    try { u = new URL(u).pathname; } catch { return null; }
  }
  u = u.replace(/^\/+/, '');
  return u.startsWith(`${KEY_PREFIX}/`) ? u : `${KEY_PREFIX}/${u}`;
}

/** The URL persisted on the Product document for a stored object. */
function publicUrlForName(name) {
  if (r2Configured && R2_PUBLIC_BASE_URL) {
    return `${R2_PUBLIC_BASE_URL.replace(/\/+$/, '')}/${KEY_PREFIX}/${name}`;
  }
  // Served by the /uploads route: from R2 when configured, else from disk.
  return `/${KEY_PREFIX}/${name}`;
}

/**
 * Persist an optimized image buffer.
 * @returns {Promise<string>} the URL to store on the product
 */
async function saveImage(name, buffer, contentType) {
  if (r2Configured) {
    await s3.send(new S3Cmd.PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: `${KEY_PREFIX}/${name}`,
      Body: buffer,
      ContentType: contentType,
      // Immutable filenames (unique suffix / product id), so cache hard.
      CacheControl: 'public, max-age=31536000, immutable',
    }));
  } else {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    fs.writeFileSync(path.join(UPLOAD_DIR, name), buffer);
  }
  return publicUrlForName(name);
}

/** Best-effort removal; a failed cleanup must never fail the request. */
async function deleteImage(imageUrl) {
  if (!imageUrl) return;
  if (r2Configured) {
    const Key = keyFromUrl(imageUrl);
    if (!Key) return;
    try {
      await s3.send(new S3Cmd.DeleteObjectCommand({ Bucket: R2_BUCKET, Key }));
    } catch (err) {
      console.warn(`R2 delete failed for ${Key}: ${err.message}`);
    }
    return;
  }
  try {
    const filePath = path.join(UPLOAD_DIR, path.basename(imageUrl));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (err) {
    console.warn(`Local delete failed for ${imageUrl}: ${err.message}`);
  }
}

/**
 * Fetch an object for the /uploads proxy route.
 * @returns {Promise<{body: Readable, contentType: string, contentLength: number}|null>}
 */
async function getImageStream(name) {
  if (!r2Configured) return null;
  try {
    const out = await s3.send(new S3Cmd.GetObjectCommand({
      Bucket: R2_BUCKET,
      Key: `${KEY_PREFIX}/${name}`,
    }));
    return {
      body: out.Body,
      contentType: out.ContentType || 'application/octet-stream',
      contentLength: out.ContentLength,
    };
  } catch {
    return null; // Missing key — caller falls through to disk / 404
  }
}

module.exports = {
  isEnabled,
  saveImage,
  deleteImage,
  getImageStream,
  publicUrlForName,
  keyFromUrl,
  UPLOAD_DIR,
};
