import fs from 'fs';
import path from 'path';
import { MongoMemoryServer } from 'mongodb-memory-server';

async function runStandaloneMongo() {
  const dbDir = path.resolve(process.cwd(), 'data/db');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  console.log('=======================================================');
  console.log('VaultVerse — Dedicated MongoDB Native Engine');
  console.log('Starting persistent MongoDB daemon on port 27017...');
  console.log(`Database directory: ${dbDir}`);
  console.log('=======================================================');

  try {
    const mongod = await MongoMemoryServer.create({
      instance: {
        port: 27017,
        dbPath: dbDir,
        storageEngine: 'wiredTiger',
      },
    });

    console.log(`\nMongoDB is ready and accepting connections!`);
    console.log(`Connection URI: ${mongod.getUri()}vaultverse\n`);
    console.log('Press Ctrl+C to shut down the database engine.');

    const cleanup = async () => {
      console.log('\nShutting down MongoDB daemon gracefully...');
      await mongod.stop();
      console.log('MongoDB shutdown complete.');
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
  } catch (error) {
    if (error.message.includes('EADDRINUSE') || error.message.includes('27017')) {
      console.log('MongoDB is already running on port 27017. Ready to connect!');
      process.exit(0);
    }
    console.error('Failed to launch MongoDB daemon:', error);
    process.exit(1);
  }
}

runStandaloneMongo();
