const express = require('express');
const router = express.Router();
const { getOverview, getTrends, getVillageHealth } = require('../controllers/analyticsController');
const { protect } = require('../middleware/auth');

router.get('/overview', protect, getOverview);
router.get('/trends', protect, getTrends);
router.get('/village-health', protect, getVillageHealth);

module.exports = router;
