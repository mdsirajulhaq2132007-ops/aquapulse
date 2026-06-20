const express = require('express');
const router = express.Router();
const { getVillages, getVillage, createVillage, updateVillage, deleteVillage } = require('../controllers/villageController');
const { protect, requireRole } = require('../middleware/auth');

router.get('/', protect, getVillages);
router.get('/:id', protect, getVillage);
router.post('/', protect, requireRole('admin'), createVillage);
router.put('/:id', protect, requireRole('admin'), updateVillage);
router.delete('/:id', protect, requireRole('admin'), deleteVillage);

module.exports = router;
