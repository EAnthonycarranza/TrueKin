const router = require('express').Router();
const { auth, adminOnly } = require('../middleware/auth');
const { listLocations, saveLocation } = require('../controllers/pickupController');

router.get('/locations', listLocations);
router.get('/admin/locations', auth, adminOnly, listLocations);
router.post('/admin/locations', auth, adminOnly, saveLocation);
router.put('/admin/locations/:id', auth, adminOnly, saveLocation);

module.exports = router;
