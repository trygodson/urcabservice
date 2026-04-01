require('dotenv').config();
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/urcab';

async function main() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('urcab');
    const result = await db.collection('vehicle').dropIndex('vin_1');
    console.log('Dropped vin_1 index:', result);
  } catch (err) {
    if (err.codeName === 'IndexNotFound') {
      console.log('Index vin_1 does not exist, nothing to drop.');
    } else {
      console.error('Error:', err.message);
      process.exit(1);
    }
  } finally {
    await client.close();
  }
}

main();
