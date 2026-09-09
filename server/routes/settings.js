const router = require('express').Router();
const { auth, adminOnly } = require('../middleware/auth');
const {
  getHomeSettings,
  getHomeSettingsAdmin,
  updateHomeSettings,
} = require('../controllers/settingsController');

router.get('/home', getHomeSettings);
router.get('/admin/home', auth, adminOnly, getHomeSettingsAdmin);
router.put('/admin/home', auth, adminOnly, updateHomeSettings);

module.exports = router;
