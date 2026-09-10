const Product = require('../models/Product');
const sharp = require('sharp');
const storage = require('../utils/storage');

/**
 * Resize + re-encode an uploaded image, then hand the buffer to the storage
 * layer (Cloudflare R2, or local disk when R2 is not configured).
 *
 * Multer buffers uploads in memory, so there is no temp file to clean up.
 *
 * @returns {Promise<string>} the URL to persist on the product
 */
async function storeOptimizedImage(file) {
  const isPng = file.mimetype === 'image/png';
  const ext = isPng ? '.png' : '.jpg';
  const name = `opt-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;

  let pipeline = sharp(file.buffer)
    .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true });
  pipeline = isPng ? pipeline.png({ quality: 95 }) : pipeline.jpeg({ quality: 90 });

  const buffer = await pipeline.toBuffer();
  return storage.saveImage(name, buffer, isPng ? 'image/png' : 'image/jpeg');
}

// Public: Get all active products
exports.getProducts = async (req, res) => {
  try {
    const { search, sort, featured } = req.query;
    const filter = { active: true };

    if (search) {
      filter.$text = { $search: search };
    }
    if (featured === 'true') {
      filter.featured = true;
    }

    let sortOption = { createdAt: -1 };
    if (sort === 'price_asc') sortOption = { price: 1 };
    if (sort === 'price_desc') sortOption = { price: -1 };
    if (sort === 'newest') sortOption = { createdAt: -1 };

    const products = await Product.find(filter).sort(sortOption);
    res.json({ products });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Public: Get single product
exports.getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json({ product });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Admin: Create product
exports.createProduct = async (req, res) => {
  try {
    const { title, description, price, featured } = req.body;
    const imageUrls = [];

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        imageUrls.push(await storeOptimizedImage(file));
      }
    }

    const { editorType, availableColors, sizes } = req.body;
    let colors = [];
    if (availableColors) {
      try { colors = JSON.parse(availableColors); } catch { colors = []; }
    }
    let parsedSizes = [];
    if (sizes) {
      try {
        const raw = JSON.parse(sizes);
        const seen = new Map();
        for (const entry of raw) {
          const key = `${entry.size}_${entry.style || 'unisex'}`;
          if (!seen.has(key)) {
            seen.set(key, { ...entry, style: entry.style || 'unisex' });
          }
        }
        parsedSizes = Array.from(seen.values());
      } catch { parsedSizes = []; }
    }
    // Truekin sells a single unisex cut — new products are never gendered.
    // The schema still permits the legacy values so existing documents save.
    const product = await Product.create({
      title,
      description,
      price: Math.round(parseFloat(price) * 100),
      imageUrls,
      featured: featured === 'true' || featured === true,
      editorType: editorType === '2d' ? '2d' : '3d',
      shirtStyle: 'unisex',
      availableColors: colors,
      sizes: parsedSizes,
    });

    res.status(201).json({ product });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Admin: Update product
exports.updateProduct = async (req, res) => {
  try {
    const { title, description, price, featured, active } = req.body;
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (title) product.title = title;
    if (description) product.description = description;
    if (price !== undefined) product.price = Math.round(parseFloat(price) * 100);
    if (featured !== undefined) product.featured = featured === 'true' || featured === true;
    if (active !== undefined) product.active = active === 'true' || active === true;
    if (req.body.editorType) product.editorType = req.body.editorType;
    if (req.body.shirtStyle) product.shirtStyle = 'unisex';
    if (req.body.availableColors !== undefined) {
      try { product.availableColors = JSON.parse(req.body.availableColors); } catch { /* keep existing */ }
    }
    if (req.body.sizes !== undefined) {
      try {
        const parsed = JSON.parse(req.body.sizes);
        // Deduplicate by size+style — keep first entry for each combo
        const seen = new Map();
        for (const entry of parsed) {
          const key = `${entry.size}_${entry.style || 'unisex'}`;
          if (!seen.has(key)) {
            seen.set(key, { ...entry, style: entry.style || 'unisex' });
          }
        }
        product.sizes = Array.from(seen.values());
      } catch { /* keep existing */ }
    }

    // Handle new images
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        product.imageUrls.push(await storeOptimizedImage(file));
      }
    }

    await product.save();
    res.json({ product });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Admin: Delete product image
exports.deleteProductImage = async (req, res) => {
  try {
    const { imageUrl } = req.body;
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    product.imageUrls = product.imageUrls.filter((url) => url !== imageUrl);
    await product.save();

    await storage.deleteImage(imageUrl);

    res.json({ product });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Admin: reorder a product's images.
 *
 * Position carries meaning on the storefront: the first image is the card face
 * and the product page's default shot, the second is the card's hover image,
 * and the rest are gallery thumbnails.
 *
 * Deliberately a permutation only — the body must contain exactly the same set
 * of URLs the product already has. Adding or removing images goes through the
 * upload and remove-image endpoints, which also manage the R2 objects; letting
 * this route change membership would orphan or delete files silently.
 */
exports.reorderProductImages = async (req, res) => {
  try {
    const { imageUrls } = req.body;
    if (!Array.isArray(imageUrls)) {
      return res.status(400).json({ message: 'imageUrls must be an array' });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const next = imageUrls.map(String);
    const current = product.imageUrls.map(String);
    const sameSet = next.length === current.length
      && new Set(next).size === next.length
      && [...current].sort().join('\u0000') === [...next].sort().join('\u0000');
    if (!sameSet) {
      return res.status(400).json({ message: 'Image order must contain exactly the current images' });
    }

    product.imageUrls = next;
    await product.save();
    res.json({ product });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Admin: Delete product
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Clean up images — the gallery set and the per-colour shots, which live
    // outside imageUrls and would otherwise be stranded in the bucket forever.
    const orphans = [
      ...product.imageUrls,
      ...[...(product.colorImages?.values() || [])].flatMap((e) => [e.front, e.back]),
    ].filter(Boolean);
    for (const imageUrl of orphans) {
      await storage.deleteImage(imageUrl);
    }

    res.json({ message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Admin: Save design (3D designer snapshot + designData JSON)
exports.saveDesign = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Save the design image (canvas snapshot PNG)
    if (req.files && req.files.designImage && req.files.designImage[0]) {
      const imgFile = req.files.designImage[0];
      // Timestamped rather than a fixed `design-<id>.png`: objects are served
      // with a long immutable cache, so re-saving a design has to produce a
      // new key or viewers keep seeing the previous artwork.
      const imgName = `design-${product._id}-${Date.now()}.png`;

      const buffer = await sharp(imgFile.buffer)
        .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
        .png({ quality: 95 })
        .toBuffer();

      const imgUrl = await storage.saveImage(imgName, buffer, 'image/png');

      // Add/replace design image as first product image
      const existingIdx = product.imageUrls.findIndex(url => url.includes(`design-${product._id}`));
      if (existingIdx >= 0) {
        const stale = product.imageUrls[existingIdx];
        product.imageUrls[existingIdx] = imgUrl;
        await storage.deleteImage(stale);
      } else {
        product.imageUrls.unshift(imgUrl);
      }
    }

    // Save designData JSON
    if (req.body.designData) {
      product.designData = req.body.designData;
    }

    await product.save();
    res.json({ product });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Admin: store the per-colour product shots.
 *
 * Files arrive named `<hex>|<side>` so one request carries the whole set —
 * twelve colours is twenty-four uploads, and doing them one request each was
 * both slower and far more likely to leave the set half-written.
 *
 * Replacing a colourway deletes the object it supersedes, otherwise every
 * re-press would strand another orphan in the bucket.
 */
exports.saveColorImages = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const files = req.files?.colorways || [];
    if (!files.length) return res.status(400).json({ message: 'No colorway images provided' });

    const stale = [];
    const next = new Map(product.colorImages || []);

    for (const file of files) {
      const [hex, side] = String(file.originalname || '').split('|');
      if (!/^#[0-9a-fA-F]{6}$/.test(hex || '') || !['front', 'back'].includes(side)) {
        return res.status(400).json({ message: `Unexpected colorway "${file.originalname}"` });
      }
      const key = hex.toUpperCase();
      const name = `colorway-${product._id}-${key.slice(1)}-${side}-${Date.now()}.png`;
      const buffer = await sharp(file.buffer)
        .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
        .png({ quality: 95 })
        .toBuffer();
      const url = await storage.saveImage(name, buffer, 'image/png');

      const entry = { ...(next.get(key) || { front: '', back: '' }) };
      if (entry[side]) stale.push(entry[side]);
      entry[side] = url;
      next.set(key, entry);
    }

    // Colours the drop no longer stocks keep no photography.
    const stocked = new Set((product.availableColors || []).map((c) => c.toUpperCase()));
    for (const [key, entry] of next) {
      if (stocked.size && !stocked.has(key)) {
        stale.push(entry.front, entry.back);
        next.delete(key);
      }
    }

    product.colorImages = next;
    await product.save();

    // After the save: losing a thumbnail is survivable, losing the record is not.
    await Promise.all(stale.filter(Boolean).map((url) => storage.deleteImage(url).catch(() => {})));

    res.json({ product });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Admin: Get all products (including inactive)
exports.adminGetProducts = async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json({ products });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
