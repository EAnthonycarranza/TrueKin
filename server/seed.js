require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Product = require('./models/Product');

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Product.deleteMany({});

    // Create admin user
    const admin = await User.create({
      email: process.env.ADMIN_EMAIL || 'admin@tshirtstore.com',
      password: process.env.ADMIN_PASSWORD || 'Admin123!',
      name: 'Store Admin',
      role: 'admin',
    });
    console.log('Admin user created:', admin.email);

    // Create test customer
    await User.create({
      email: 'customer@test.com',
      password: 'Customer123!',
      name: 'Test Customer',
      role: 'customer',
    });
    console.log('Test customer created');

    // Create sample products (prices in cents)
    const products = await Product.insertMany([
      {
        title: 'Classic Black Tee',
        description: 'A timeless black t-shirt made from premium cotton. Comfortable fit for everyday wear.',
        price: 2499,
        imageUrls: [],
        featured: true,
      },
      {
        title: 'Ocean Wave Graphic Tee',
        description: 'Ride the wave with this stunning ocean-inspired graphic tee. Made with soft, breathable fabric.',
        price: 2999,
        imageUrls: [],
        featured: true,
      },
      {
        title: 'Retro Sunset Tee',
        description: 'Vintage-inspired sunset design that brings those good vibes. Premium heavyweight cotton.',
        price: 3499,
        imageUrls: [],
        featured: true,
      },
      {
        title: 'Minimalist Line Art Tee',
        description: 'Clean minimalist line art design for the modern aesthetic. Ultra-soft tri-blend fabric.',
        price: 2799,
        imageUrls: [],
        featured: false,
      },
      {
        title: 'Mountain Explorer Tee',
        description: 'For the adventurers. Bold mountain design on durable, trail-ready fabric.',
        price: 3299,
        imageUrls: [],
        featured: false,
      },
      {
        title: 'Abstract Splash Tee',
        description: 'Colorful abstract paint splash design. Stand out from the crowd with this artistic piece.',
        price: 3199,
        imageUrls: [],
        featured: true,
      },
    ]);

    console.log(`${products.length} products created`);
    console.log('\n--- Seed Complete ---');
    console.log('Admin Login: admin@tshirtstore.com / Admin123!');
    console.log('Customer Login: customer@test.com / Customer123!');

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seedData();
