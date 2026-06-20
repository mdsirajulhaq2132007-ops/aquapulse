require('dotenv').config();
const mongoose = require('mongoose');
const Village = require('../models/Village');
const WaterSource = require('../models/WaterSource');
const SensorReading = require('../models/SensorReading');
const Alert = require('../models/Alert');

const cleanupOrphans = async () => {
  try {
    console.log('🔍 Starting database cleanup...');
    
    // Get all villages
    const villages = await Village.find();
    const villageIds = villages.map(v => v._id.toString());
    console.log(`🏘️  Current active villages in DB: [${villages.map(v => v.name).join(', ')}]`);

    // Get all water sources
    const sources = await WaterSource.find();
    console.log(`💧 Total water sources found in DB: ${sources.length}`);

    let deletedSourcesCount = 0;
    for (const source of sources) {
      const sourceVillageId = source.village.toString();
      // If the source's village is not in the list of active villages, it is orphaned
      if (!villageIds.includes(sourceVillageId)) {
        console.log(`🗑️  Deleting orphaned water source "${source.name}" (ID: ${source._id}, Device: ${source.deviceId})`);
        
        // Delete water source
        await WaterSource.findByIdAndDelete(source._id);
        
        // Delete associated readings
        const readingsResult = await SensorReading.deleteMany({ waterSource: source._id });
        
        // Delete associated alerts
        const alertsResult = await Alert.deleteMany({ waterSource: source._id });

        console.log(`   └ Deleted ${readingsResult.deletedCount} readings and ${alertsResult.deletedCount} alerts`);
        deletedSourcesCount++;
      }
    }

    console.log(`✅ Cleanup complete! Removed ${deletedSourcesCount} orphaned water sources.`);
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
};

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('🔌 Connected to MongoDB');
    await cleanupOrphans();
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Connection error:', error);
    process.exit(1);
  }
})();
