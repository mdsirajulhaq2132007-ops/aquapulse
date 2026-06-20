const express = require('express');
const router = express.Router();
const { ingestReading, getLatestReading, getHistory, getReadings, getLatestPerSource } = require('../controllers/sensorController');
const { protect } = require('../middleware/auth');
const deviceAuth = require('../middleware/deviceAuth');

router.post('/ingest', deviceAuth, ingestReading);
router.get('/latest-per-source', protect, getLatestPerSource);
router.get('/',                  protect, getReadings);
router.get('/:sourceId/latest',  protect, getLatestReading);
router.get('/:sourceId/history', protect, getHistory);

module.exports = router;
