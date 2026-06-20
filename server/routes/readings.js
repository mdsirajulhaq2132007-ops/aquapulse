const express = require('express');
const router = express.Router();
const { ingestReading, getReadings, getLatestPerSource } = require('../controllers/sensorController');
const { protect } = require('../middleware/auth');

/**
 * POST /api/readings
 * Public alias for ESP32 ingestion. Does NOT require x-device-key header —
 * useful for dev/testing. In production, prefer /api/sensors/ingest with the key.
 */
router.post('/', ingestReading);

/**
 * GET /api/readings
 * Returns paginated list of all sensor readings (protected).
 */
router.get('/', protect, getReadings);

/**
 * GET /api/readings/latest
 * Returns the latest reading for every registered water source (protected).
 */
router.get('/latest', protect, getLatestPerSource);

module.exports = router;
