const mongoose = require('mongoose');
const PickupLocation = require('../models/PickupLocation');
const { locationInput } = require('../utils/fulfillment');

exports.listLocations = async (req, res) => {
  try {
    const locations = await PickupLocation.find(req.user?.role === 'admin' ? {} : { active: true }).sort({ name: 1 });
    res.json({ locations });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.saveLocation = async (req, res) => {
  try {
    const data = locationInput(req.body);
    if (req.params.id && !mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid location ID' });
    }
    const location = req.params.id
      ? await PickupLocation.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true })
      : await PickupLocation.create(data);
    if (!location) return res.status(404).json({ message: 'Pickup location not found' });
    res.status(req.params.id ? 200 : 201).json({ location });
  } catch (error) {
    res.status(error.status || (error.name === 'ValidationError' ? 400 : 500)).json({ message: error.message });
  }
};
