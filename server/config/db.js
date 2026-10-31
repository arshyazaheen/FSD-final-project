import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';

let embeddedServer = null;

/**
 * Connect to MongoDB with intelligent local fallback.
 * Attempts to connect to process.env.MONGODB_URI or mongodb://127.0.0.1:27017/vaultverse.
 * If no MongoDB instance is currently listening, automatically boots a persistent
 * local MongoDB instance using the cached native MongoDB engine.
 */
export async function connectDB(uri) {
  let targetURI = uri || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vaultverse';

  try {
    const conn = await mongoose.connect(targetURI, {
      autoIndex: true,
      serverSelectionTimeoutMS: 2500,
    });
    console.log(`[MongoDB] Connected successfully to host: ${conn.connection.host}, database: ${conn.connection.name}`);
    return conn;
  } catch (initialError) {
    // If target URI was explicitly non-local (e.g. Atlas mongodb+srv), rethrow
    if (targetURI.startsWith('mongodb+srv://') || (process.env.MONGODB_URI && !process.env.MONGODB_URI.includes('127.0.0.1') && !process.env.MONGODB_URI.includes('localhost'))) {
      console.error(`[MongoDB] Remote connection error: ${initialError.message}`);
      throw initialError;
    }

    console.warn(`[MongoDB] No running MongoDB service detected on 127.0.0.1:27017 (${initialError.message}).`);
    console.log(`[MongoDB] Initializing native embedded persistent MongoDB instance...`);

    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      const dbDir = path.resolve(process.cwd(), 'data/db');
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      embeddedServer = await MongoMemoryServer.create({
        instance: {
          port: 27017,
          dbPath: dbDir,
          storageEngine: 'wiredTiger',
        },
      });

      targetURI = `${embeddedServer.getUri()}vaultverse`;
      const conn = await mongoose.connect(targetURI, {
        autoIndex: true,
      });
      console.log(`[MongoDB] Native embedded MongoDB started successfully at ${targetURI}`);
      console.log(`[MongoDB] Storage persistence location: ${dbDir}`);
      return conn;
    } catch (fallbackError) {
      console.error(`[MongoDB] Failed to initialize embedded MongoDB engine: ${fallbackError.message}`);
      throw fallbackError;
    }
  }
}

export async function disconnectDB() {
  try {
    await mongoose.connection.close();
    if (embeddedServer) {
      await embeddedServer.stop();
      embeddedServer = null;
    }
    console.log('[MongoDB] Connection disconnected gracefully');
  } catch (error) {
    console.error(`[MongoDB] Disconnect error: ${error.message}`);
  }
}
