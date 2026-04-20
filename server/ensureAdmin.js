// Non-destructive: creates the admin user if it doesn't exist, or
// resets the password/role to match .env if the account is already there.
// Run:  node ensureAdmin.js
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

(async () => {
  const email = (process.env.ADMIN_EMAIL || 'admin@truekin.co').toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'Truekin123!';

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('[ensureAdmin] Connected to MongoDB');

    let user = await User.findOne({ email });

    if (!user) {
      // Create fresh admin — pre-save hook hashes the password.
      user = new User({
        email,
        password,
        name: 'Truekin Admin',
        role: 'admin',
      });
      await user.save();
      console.log(`[ensureAdmin] Created admin: ${email}`);
    } else {
      // Ensure role is admin and password matches .env (no silent drift).
      user.role = 'admin';
      user.password = password; // pre-save hook re-hashes
      await user.save();
      console.log(`[ensureAdmin] Updated admin: ${email} (role=admin, password reset)`);
    }

    console.log('\n--- Admin ready ---');
    console.log(`Email:    ${email}`);
    console.log(`Password: ${password}`);
    console.log('-------------------\n');

    process.exit(0);
  } catch (err) {
    console.error('[ensureAdmin] Failed:', err.message || err);
    process.exit(1);
  }
})();
