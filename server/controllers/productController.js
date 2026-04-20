const Product = require('../models/Product');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

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
        const isPng = file.mimetype === 'image/png';
        const ext = isPng ? '.png' : '.jpg';
        const optimizedName = 'opt-' + file.filename.replace(/\.[^.]+$/, ext);
        const optimizedPath = path.join(__dirname, '../uploads', optimizedName);

        let pipeline = sharp(file.path)
          .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true });

        if (isPng) {
          pipeline = pipeline.png({ quality: 95 });
        } else {
          pipeline = pipeline.jpeg({ quality: 90 });
        }

        await pipeline.toFile(optimizedPath);
        fs.unlinkSync(file.path);
        imageUrls.push(`/uploads/${optimizedName}`);
      }
    }

    const { editorType, shirtStyle, availableColors, sizes } = req.body;
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
    const allowedStyles = ['unisex', 'mens', 'womens'];
    const product = await Product.create({
      title,
      description,
      price: Math.round(parseFloat(price) * 100),
      imageUrls,
      featured: featured === 'true' || featured === true,
      editorType: editorType === '2d' ? '2d' : '3d',
      shirtStyle: allowedStyles.includes(shirtStyle) ? shirtStyle : 'unisex',
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
    if (req.body.shirtStyle) product.shirtStyle = req.body.shirtStyle;
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
        const isPng = file.mimetype === 'image/png';
        const ext = isPng ? '.png' : '.jpg';
        const optimizedName = 'opt-' + file.filename.replace(/\.[^.]+$/, ext);
        const optimizedPath = path.join(__dirname, '../uploads', optimizedName);

        let pipeline = sharp(file.path)
          .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true });

        if (isPng) {
          pipeline = pipeline.png({ quality: 95 });
        } else {
          pipeline = pipeline.jpeg({ quality: 90 });
        }

        await pipeline.toFile(optimizedPath);
        fs.unlinkSync(file.path);
        product.imageUrls.push(`/uploads/${optimizedName}`);
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

    // Delete file from disk
    const filePath = path.join(__dirname, '..', imageUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

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

    // Clean up images
    for (const imageUrl of product.imageUrls) {
      const filePath = path.join(__dirname, '..', imageUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
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

    // Ensure designs directory exists
    const designsDir = path.join(__dirname, '../uploads/designs');
    if (!fs.existsSync(designsDir)) {
      fs.mkdirSync(designsDir, { recursive: true });
    }

    // Save the design image (canvas snapshot PNG)
    if (req.files && req.files.designImage && req.files.designImage[0]) {
      const imgFile = req.files.designImage[0];
      const imgName = `design-${product._id}.png`;
      const imgPath = path.join(__dirname, '../uploads', imgName);

      await sharp(imgFile.path)
        .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
        .png({ quality: 95 })
        .toFile(imgPath);

      fs.unlinkSync(imgFile.path);

      // Add/replace design image as first product image
      const imgUrl = `/uploads/${imgName}`;
      const existingIdx = product.imageUrls.findIndex(url => url.includes(`design-${product._id}`));
      if (existingIdx >= 0) {
        product.imageUrls[existingIdx] = imgUrl;
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

// Admin: Get all products (including inactive)
exports.adminGetProducts = async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json({ products });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
