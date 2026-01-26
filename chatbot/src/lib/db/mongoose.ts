import mongoose from 'mongoose';

/**
 * MongoDB connection utility using Mongoose
 * Handles connection caching and proper TypeScript typing
 */

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

const MONGODB_URI = process.env.MONGODB_URI || '';

if (!MONGODB_URI && process.env.NODE_ENV === 'production') {
  throw new Error('Please define the MONGODB_URI environment variable');
}

let cached: MongooseCache = global.mongooseCache || {
  conn: null,
  promise: null,
};

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

export async function connectToMongoDB(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    if (MONGODB_URI) {
      // Suppress deprecation warnings
      mongoose.set('strictQuery', false);
      cached.promise = mongoose.connect(MONGODB_URI, opts);
    } else {
      // In development without MongoDB URI, return a mock connection
      console.warn('MongoDB URI not configured. Database features will be unavailable.');
      cached.promise = Promise.resolve(mongoose);
    }
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    throw error;
  }

  return cached.conn;
}

export default mongoose;
