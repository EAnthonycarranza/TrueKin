const Quote = require('../models/Quote');

exports.createQuote = async (req, res) => {
  try {
    const { name, email, phone, organization, quantity, neededBy, details } = req.body;

    if (!name || !email || !quantity || !details) {
      return res.status(400).json({
        message: 'Name, email, quantity, and project details are required.',
      });
    }

    const qty = parseInt(quantity, 10);
    if (!Number.isFinite(qty) || qty < 1) {
      return res.status(400).json({ message: 'Quantity must be at least 1.' });
    }

    const quote = await Quote.create({
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      phone: phone ? String(phone).trim() : '',
      organization: organization ? String(organization).trim() : '',
      quantity: qty,
      neededBy: neededBy ? String(neededBy).trim() : '',
      details: String(details).trim(),
    });

    res.status(201).json({
      message: "Thanks — we'll reply with a custom quote within 1 business day.",
      quote: { id: quote._id, createdAt: quote.createdAt },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.adminListQuotes = async (_req, res) => {
  try {
    const quotes = await Quote.find().sort({ createdAt: -1 });
    res.json({ quotes });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.adminUpdateQuoteStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['new', 'contacted', 'quoted', 'closed'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: 'Invalid status.' });
    }
    const quote = await Quote.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true },
    );
    if (!quote) return res.status(404).json({ message: 'Quote not found.' });
    res.json({ quote });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
