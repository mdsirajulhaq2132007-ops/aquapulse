require('dotenv').config();
const mongoose = require('mongoose');

const User = require('../models/User');
const Village = require('../models/Village');
const WaterSource = require('../models/WaterSource');
const SensorReading = require('../models/SensorReading');
const Alert = require('../models/Alert');
const { classify } = require('../services/safetyClassifier');

// Core seeding logic — usable both as standalone script and as a function
const seedDemo = async () => {
  // Clear existing data
  await Promise.all([
    User.deleteMany(),
    Village.deleteMany(),
    WaterSource.deleteMany(),
    SensorReading.deleteMany(),
    Alert.deleteMany(),
  ]);
  console.log('🗑️  Cleared existing data');

  // Create admin user
  const admin = await User.create({
    name: 'Dr. Arjun Sharma',
    email: 'admin@aquapulse.in',
    password: 'Admin@1234',
    role: 'admin',
    language: 'en',
  });
  console.log('👤 Admin created:', admin.email);

  // Create 3 villages
  const villages = await Village.insertMany([
    { name: 'Rampur', district: 'Mahbubnagar', state: 'Telangana', coordinates: { lat: 16.7387, lng: 78.0020 }, population: 1200 },
    { name: 'Kotapally', district: 'Nalgonda', state: 'Telangana', coordinates: { lat: 17.0580, lng: 79.2671 }, population: 850 },
    { name: 'Yellareddy', district: 'Kamareddy', state: 'Telangana', coordinates: { lat: 18.1833, lng: 78.0167 }, population: 2100 },
  ]);
  console.log('🏘️  Villages created:', villages.map(v => v.name).join(', '));

  // Create health workers
  await User.create({
    name: 'Priya Devi',
    email: 'priya@aquapulse.in',
    password: 'Worker@1234',
    role: 'health_worker',
    assignedVillages: [villages[0]._id, villages[1]._id],
    language: 'te',
  });
  await User.create({
    name: 'Suresh Kumar',
    email: 'suresh@aquapulse.in',
    password: 'Worker@1234',
    role: 'health_worker',
    assignedVillages: [villages[2]._id],
    language: 'hi',
  });
  console.log('👥 Health workers created');

  // Create 6 water sources
  const sources = await WaterSource.insertMany([
    { name: 'Main Well', village: villages[0]._id, type: 'well', deviceId: 'ESP32-001', location: { lat: 16.740, lng: 78.003 }, status: 'active' },
    { name: 'River Tap Point', village: villages[0]._id, type: 'tap_water', deviceId: 'ESP32-002', location: { lat: 16.735, lng: 78.001 }, status: 'active' },
    { name: 'Community Borewell', village: villages[1]._id, type: 'borewell', deviceId: 'ESP32-003', location: { lat: 17.060, lng: 79.268 }, status: 'active' },
    { name: 'Village Pond', village: villages[1]._id, type: 'lake', deviceId: 'ESP32-004', location: { lat: 17.055, lng: 79.265 }, status: 'active' },
    { name: 'Handpump Station', village: villages[2]._id, type: 'well', deviceId: 'ESP32-005', location: { lat: 18.185, lng: 78.018 }, status: 'active' },
    { name: 'Spring Source', village: villages[2]._id, type: 'river', deviceId: 'ESP32-006', location: { lat: 18.180, lng: 78.015 }, status: 'active' },
  ]);
  console.log('💧 Water sources created:', sources.length);

  // Generate 7 days of sensor readings
  const readings = [];
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  const HOUR = 60 * 60 * 1000;

  const scenarios = [
    { phRange: [6.8, 7.4], turbRange: [0.3, 0.9], tempRange: [18, 23] },
    { phRange: [7.0, 8.2], turbRange: [0.5, 3.5], tempRange: [20, 27] },
    { phRange: [6.5, 7.8], turbRange: [0.2, 0.8], tempRange: [16, 22] },
    { phRange: [5.8, 6.4], turbRange: [2.0, 5.5], tempRange: [25, 31] },
    { phRange: [7.2, 8.0], turbRange: [0.4, 1.2], tempRange: [19, 24] },
    { phRange: [6.9, 7.5], turbRange: [0.3, 0.7], tempRange: [17, 22] },
  ];

  for (let s = 0; s < sources.length; s++) {
    const source = sources[s];
    const scenario = scenarios[s];
    const rand = (min, max) => Math.random() * (max - min) + min;

    for (let day = 7; day >= 0; day--) {
      for (let hour = 0; hour < 24; hour += 3) {
        const timestamp = new Date(now - day * DAY + hour * HOUR);
        const ph = parseFloat(rand(...scenario.phRange).toFixed(2));
        const turbidity = parseFloat(rand(...scenario.turbRange).toFixed(2));
        const temperature = parseFloat(rand(...scenario.tempRange).toFixed(1));
        const { status: safetyStatus, flags } = classify({ ph, turbidity, temperature });
        const task5Status = (ph >= 6.5 && ph <= 8.5 && turbidity <= 5) ? 'SAFE' : 'UNSAFE';
        readings.push({
          sourceId: source._id,
          villageId: source.village,
          status: task5Status,
          waterSource: source._id,
          village: source.village,
          deviceId: source.deviceId,
          ph,
          turbidity,
          temperature,
          safetyStatus,
          flags,
          timestamp
        });
      }
    }
  }
  await SensorReading.insertMany(readings);
  console.log(`📊 Created ${readings.length} sensor readings`);

  // Update each source with its latest reading
  for (let s = 0; s < sources.length; s++) {
    const latest = readings
      .filter(r => r.waterSource.toString() === sources[s]._id.toString())
      .sort((a, b) => b.timestamp - a.timestamp)[0];
    await WaterSource.findByIdAndUpdate(sources[s]._id, {
      safetyStatus: latest.safetyStatus,
      lastReading: latest.timestamp,
      lastReadingValues: { ph: latest.ph, turbidity: latest.turbidity, temperature: latest.temperature },
    });
  }

  // Sample alerts
  await Alert.insertMany([
    {
      waterSource: sources[3]._id, village: villages[1]._id,
      type: 'critical', parameter: 'turbidity', value: 5.2, threshold: 4,
      message: 'Critical turbidity level: 5.20 NTU (Safe: <1 NTU)',
      acknowledged: false, createdAt: new Date(now - 2 * HOUR),
    },
    {
      waterSource: sources[3]._id, village: villages[1]._id,
      type: 'critical', parameter: 'temperature', value: 30.5, threshold: 30,
      message: 'Critical temperature: 30.5°C (Safe: 10–25°C)',
      acknowledged: false, createdAt: new Date(now - 4 * HOUR),
    },
    {
      waterSource: sources[1]._id, village: villages[0]._id,
      type: 'warning', parameter: 'turbidity', value: 3.2, threshold: 1,
      message: 'Elevated turbidity: 3.20 NTU (Safe: <1 NTU)',
      acknowledged: true, acknowledgedBy: admin._id, acknowledgedAt: new Date(now - DAY),
      createdAt: new Date(now - DAY - 2 * HOUR),
    },
  ]);
  console.log('🔔 Sample alerts created');

  console.log('\n✅ Demo data seeded!');
  console.log('   Admin    → admin@aquapulse.in / Admin@1234');
  console.log('   Worker 1 → priya@aquapulse.in / Worker@1234');
};

// Export for use by db.js auto-seed
module.exports = { seedDemo };

// Standalone script entry point: node utils/seed.js
if (require.main === module) {
  (async () => {
    try {
      await mongoose.connect(process.env.MONGO_URI);
      console.log('✅ Connected to MongoDB');
      await seedDemo();
      mongoose.disconnect();
    } catch (error) {
      console.error('❌ Seed error:', error);
      process.exit(1);
    }
  })();
}
