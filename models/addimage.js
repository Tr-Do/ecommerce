const mongoose = require('mongoose');

const MONGO_URI = 'mongodb://localhost:27017/terrarium'; // change if needed

async function runMigration() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        const result = await mongoose.connection.collection('designs').updateMany(
            { image: { $exists: false } },   // only docs without image
            {
                $set: {
                    image: '/images/default.png' // or null, or real URL
                }
            }
        );

        console.log('Matched:', result.matchedCount);
        console.log('Modified:', result.modifiedCount);

        await mongoose.disconnect();
        console.log('Migration complete');
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

runMigration();
