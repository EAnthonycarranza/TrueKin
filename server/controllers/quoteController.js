const sharp = require('sharp');
const mongoose = require('mongoose');
const Quote = require('../models/Quote');
const Product = require('../models/Product');
const SiteSettings = require('../models/SiteSettings');
const storage = require('../utils/storage');
const { RECAPTCHA_ACTIONS, verifyRecaptcha } = require('../utils/recaptcha');
const mail = require('../utils/email');

function requestError(message, status = 400) {
  return Object.assign(new Error(message), { status });
}

function text(value, max, fallback = '') {
  const result = value == null ? fallback : String(value).trim();
  if (result.length > max) throw requestError(`Keep this field under ${max.toLocaleString()} characters.`);
  return result;
}

function money(value, label) {
  const result = Number(value || 0);
  if (!Number.isInteger(result) || result < 0 || result > 100000000) {
    throw requestError(`${label} must be a valid non-negative amount.`);
  }
  return result;
}

function parseJson(value, label, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); }
  catch { throw requestError(`${label} could not be read.`); }
}

function validateStudioDesign(value, productType) {
  const design = parseJson(value, 'The studio design', null);
  if (!design || typeof design !== 'object' || Array.isArray(design)) {
    throw requestError('Attach a studio design before submitting this quote.');
  }
  if (design.studio !== 'truekin-unified' || design.productType !== productType) {
    throw requestError('The attached studio design does not match the selected product.');
  }
  const serialized = JSON.stringify(design);
  if (Buffer.byteLength(serialized, 'utf8') > 12 * 1024 * 1024) {
    throw requestError('The studio design is too large. Remove unused artwork and try again.');
  }
  return serialized;
}

async function ensureStudioProductEnabled(productType) {
  if (productType !== 'sticker') return;
  const settings = await SiteSettings.findOne({ key: 'site' }).select('studioTools');
  if (settings?.studioTools?.stickerEnabled === false) {
    throw requestError('Sticker studio quotes are currently unavailable. Please use the quick quote form.');
  }
}

async function storeQuoteImage(file, prefix) {
  const name = `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e9)}.png`;
  const buffer = await sharp(file.buffer)
    .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
    .png({ quality: 95 })
    .toBuffer();
  return storage.saveImage(name, buffer, 'image/png');
}

exports.createQuote = async (req, res) => {
  let storedPreview = '';
  try {
    const { name, email, phone, organization, quantity, neededBy, details, recaptchaToken } = req.body;
    const requestType = req.body.requestType === 'studio' ? 'studio' : 'basic';
    if (!name || !email || !quantity || !details) {
      throw requestError('Name, email, quantity, and project details are required.');
    }
    const customerEmail = text(email, 200).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      throw requestError('Enter a valid email address so we can send your quote.');
    }
    const qty = Number(quantity);
    if ((typeof quantity === 'string' && !/^\d+$/.test(quantity.trim())) || !Number.isInteger(qty) || qty < 1 || qty > 100000) {
      throw requestError('Quantity must be from 1 to 100,000.');
    }

    await verifyRecaptcha({ token: recaptchaToken, expectedAction: RECAPTCHA_ACTIONS.quote });

    let productType = 'other';
    let designData = null;
    let specifications;
    if (requestType === 'studio') {
      productType = ['tshirt', 'sticker'].includes(req.body.productType) ? req.body.productType : '';
      if (!productType) throw requestError('Choose a T-shirt or sticker for your studio quote.');
      await ensureStudioProductEnabled(productType);
      designData = validateStudioDesign(req.body.designData, productType);
      if (!req.file) throw requestError('Attach a studio preview before submitting this quote.');
      const sourceSpecifications = parseJson(req.body.specifications, 'The quote specifications', {});
      if (!sourceSpecifications || typeof sourceSpecifications !== 'object' || Array.isArray(sourceSpecifications)) {
        throw requestError('The quote specifications must be an object.');
      }
      const printLocations = Number(sourceSpecifications.printLocations || 1);
      if (productType === 'tshirt' && (!Number.isInteger(printLocations) || printLocations < 1 || printLocations > 4)) {
        throw requestError('Print locations must be from 1 to 4.');
      }
      const stickerSize = sourceSpecifications.stickerSize || '3in';
      if (productType === 'sticker' && !['2in', '3in', '4in'].includes(stickerSize)) {
        throw requestError('Choose a valid sticker size.');
      }
      specifications = {
        printLocations: productType === 'tshirt' ? printLocations : 1,
        stickerSize: productType === 'sticker' ? stickerSize : '',
        rush: sourceSpecifications.rush === true || sourceSpecifications.rush === 'true',
      };
      storedPreview = await storeQuoteImage(req.file, 'quote-design');
    }

    const quote = await Quote.create({
      requestType,
      productType,
      name: text(name, 120),
      email: customerEmail,
      phone: text(phone, 40),
      organization: text(organization, 160),
      quantity: qty,
      neededBy: text(neededBy, 80),
      details: text(details, 4000),
      designData,
      designPreviewUrl: storedPreview,
      specifications,
    });

    // The request is already saved: an unavailable mail provider must not
    // turn a successful submission into an error or invite a duplicate retry.
    let confirmationEmailSent = false;
    try {
      confirmationEmailSent = await mail.sendQuoteRequestConfirmation(quote);
    } catch (emailError) {
      console.error('Quote request confirmation failed:', emailError.message);
    }

    res.status(201).json({
      message: requestType === 'studio'
        ? "Design received — your production-ready brief is with Truekin. An admin will email your custom quote within 1 business day."
        : "Thanks — we'll reply with a custom quote within 1 business day.",
      quote: { id: quote._id, createdAt: quote.createdAt },
      confirmationEmailSent,
    });
  } catch (error) {
    if (storedPreview) await storage.deleteImage(storedPreview).catch(() => {});
    res.status(error.status || 500).json({ message: error.message });
  }
};

exports.adminListQuotes = async (_req, res) => {
  try {
    const quotes = await Quote.find().select('-designData').sort({ createdAt: -1 });
    res.json({ quotes });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.adminGetQuote = async (req, res) => {
  try {
    const quote = await Quote.findById(req.params.id);
    if (!quote) return res.status(404).json({ message: 'Quote not found.' });
    res.json({ quote, emailDeliveryConfigured: Boolean(process.env.SMTP_USER && process.env.SMTP_PASSWORD) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.adminUpdateQuoteStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['new', 'contacted', 'quoted', 'closed'];
    if (!allowed.includes(status)) return res.status(400).json({ message: 'Invalid status.' });
    const quote = await Quote.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!quote) return res.status(404).json({ message: 'Quote not found.' });
    res.json({ quote });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.adminSaveQuoteBuilder = async (req, res) => {
  const newImages = [];
  try {
    const quote = await Quote.findById(req.params.id);
    if (!quote) return res.status(404).json({ message: 'Quote not found.' });
    const payload = parseJson(req.body.payload, 'The quote builder data', req.body || {});
    const rawItems = Array.isArray(payload.lineItems) ? payload.lineItems : [];
    if (!rawItems.length) throw requestError('Add at least one line item to the quote.');
    if (rawItems.length > 40) throw requestError('A quote supports up to 40 line items.');
    const lineItems = rawItems.map((item) => {
      const quantity = Number(item.quantity);
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100000) throw requestError('Line-item quantity must be from 1 to 100,000.');
      return {
        description: text(item.description, 240),
        quantity,
        unitPrice: money(item.unitPrice, 'Unit price'),
      };
    });
    if (lineItems.some((item) => !item.description)) throw requestError('Every line item needs a description.');

    const setupFee = money(payload.setupFee, 'Setup fee');
    const shipping = money(payload.shipping, 'Shipping');
    const discount = money(payload.discount, 'Discount');
    const taxRate = Number(payload.taxRate || 0);
    if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) throw requestError('Tax rate must be from 0 to 100.');
    const itemSubtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const subtotal = itemSubtotal + setupFee;
    const taxable = Math.max(0, subtotal + shipping - discount);
    if (discount > subtotal + shipping) throw requestError('Discount cannot exceed the quote amount.');
    const tax = Math.round(taxable * taxRate / 100);
    const total = taxable + tax;

    const requestedPreview = payload.productPreview;
    const productImageFile = req.files?.productImage?.[0];
    let productPreview;
    if (requestedPreview?.sourceProductId) {
      if (productImageFile) throw requestError('Choose a catalog product or upload a custom preview, not both.');
      if (!mongoose.isValidObjectId(requestedPreview.sourceProductId)) throw requestError('Choose a valid catalog product.');
      const product = await Product.findById(requestedPreview.sourceProductId);
      if (!product) throw requestError('The selected catalog product no longer exists.');
      if (!product.imageUrls?.[0]) throw requestError('The selected catalog product needs an image before it can be previewed.');
      productPreview = {
        sourceProductId: product._id,
        title: text(requestedPreview.title || product.title, 160),
        description: text(requestedPreview.description || product.description, 700),
        imageUrl: product.imageUrls[0],
      };
    } else if (productImageFile) {
      const imageUrl = await storeQuoteImage(productImageFile, `quote-product-${quote._id}`);
      newImages.push(imageUrl);
      productPreview = {
        title: text(requestedPreview?.title, 160),
        description: text(requestedPreview?.description, 700),
        imageUrl,
      };
      if (!productPreview.title) throw requestError('Name the custom product preview.');
    } else if (requestedPreview?.imageUrl) {
      const current = quote.adminQuote?.productPreview;
      if (current?.sourceProductId || current?.imageUrl !== requestedPreview.imageUrl) {
        throw requestError('Upload a custom preview image through this quote.');
      }
      productPreview = {
        title: text(requestedPreview.title, 160),
        description: text(requestedPreview.description, 700),
        imageUrl: current.imageUrl,
      };
      if (!productPreview.title) throw requestError('Name the custom product preview.');
    }

    const currentImages = new Set((quote.adminQuote?.concepts || []).map((concept) => concept.imageUrl));
    const concepts = (Array.isArray(payload.concepts) ? payload.concepts : [])
      .slice(0, 8)
      .filter((concept) => concept?.imageUrl)
      .map((concept) => {
        if (!currentImages.has(concept.imageUrl)) throw requestError('A concept image must be uploaded through this quote.');
        return ({
        label: text(concept.label, 120, 'Design concept'),
        imageUrl: text(concept.imageUrl, 2000),
        notes: text(concept.notes, 500),
        });
      });
    const newMetadata = parseJson(req.body.conceptMetadata, 'Concept labels', []);
    const files = req.files?.conceptImages || [];
    for (let index = 0; index < Math.min(files.length, 6); index += 1) {
      const imageUrl = await storeQuoteImage(files[index], `quote-concept-${quote._id}`);
      newImages.push(imageUrl);
      concepts.push({
        label: text(newMetadata[index]?.label, 120, `Concept ${concepts.length + 1}`),
        imageUrl,
        notes: text(newMetadata[index]?.notes, 500),
      });
    }

    quote.adminQuote = {
      quoteNumber: text(payload.quoteNumber, 40, `TKQ-${quote._id.toString().slice(-6).toUpperCase()}`),
      lineItems,
      setupFee,
      shipping,
      discount,
      taxRate,
      subtotal,
      tax,
      total,
      validUntil: text(payload.validUntil, 40),
      leadTime: text(payload.leadTime, 120, '7–14 business days after art approval'),
      paymentTerms: text(payload.paymentTerms, 240, 'Payment terms confirmed before production begins.'),
      customerMessage: text(payload.customerMessage, 3000),
      internalNotes: text(payload.internalNotes, 3000),
      productPreview,
      concepts: concepts.slice(0, 12),
      lastSentAt: null,
    };
    if (quote.status === 'quoted') quote.status = 'contacted';
    await quote.save();
    res.json({ quote });
  } catch (error) {
    await Promise.all(newImages.map((url) => storage.deleteImage(url).catch(() => {})));
    res.status(error.status || 500).json({ message: error.message });
  }
};

exports.adminSendQuoteProposal = async (req, res) => {
  try {
    const quote = await Quote.findById(req.params.id);
    if (!quote) return res.status(404).json({ message: 'Quote not found.' });
    if (!quote.adminQuote?.lineItems?.length) throw requestError('Save the quote with at least one priced line item before sending it.');
    const sent = await mail.sendQuoteProposal(quote);
    if (!sent) throw requestError('The quote email could not be sent. Check mail settings and try again.', 503);
    quote.status = 'quoted';
    quote.adminQuote.lastSentAt = new Date();
    await quote.save();
    res.json({ quote, message: `Quote sent to ${quote.email}.` });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
};
