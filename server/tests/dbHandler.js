import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongod = null;

export async function connectTestDB() {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
  return uri;
}

export async function closeTestDB() {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongod) {
    await mongod.stop();
  }
}

export async function clearTestDB() {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
}

