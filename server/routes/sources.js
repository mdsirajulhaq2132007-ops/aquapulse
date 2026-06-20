const express = require('express');
const router = express.Router();
const { getSources, getSource, createSource, updateSource, deleteSource, getSourceStats } = require('../controllers/sourceController');
const { protect, requireRole } = require('../middleware/auth');

router.get('/', protect, getSources);
router.get('/:id', protect, getSource);
router.get('/:id/stats', protect, getSourceStats);
router.post('/', protect, requireRole('admin'), createSource);
router.put('/:id', protect, requireRole('admin'), updateSource);
router.delete('/:id', protect, requireRole('admin'), deleteSource);

module.exports = router;
