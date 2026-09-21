const router = require('express').Router();
const { auth, adminOnly } = require('../middleware/auth');
const {
  getHomeSettings,
  getHomeSettingsAdmin,
  updateHomeSettings,
  getStudioSettings,
  getStudioSettingsAdmin,
  updateStudioSettings,
} = require('../controllers/settingsController');

router.get('/home', getHomeSettings);
router.get('/admin/home', auth, adminOnly, getHomeSettingsAdmin);
router.put('/admin/home', auth, adminOnly, updateHomeSettings);
router.get('/studio', getStudioSettings);
router.get('/admin/studio', auth, adminOnly, getStudioSettingsAdmin);
router.put('/admin/studio', auth, adminOnly, updateStudioSettings);

module.exports = router;
