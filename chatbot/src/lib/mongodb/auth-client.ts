import { MongoClient } from 'mongodb';

// Separate MongoClient instance for Auth.js adapter (uses native driver, not Mongoose)
declare global {
  // eslint-disable-next-line no-var
  var _mongoAuthClient: MongoClient | undefined;
}

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

let client: MongoClient;

if (process.env.NODE_ENV === 'development') {
  // Reuse client across hot-reloads in dev
  if (!global._mongoAuthClient) {
    global._mongoAuthClient = new MongoClient(uri);
  }
  client = global._mongoAuthClient;
} else {
  client = new MongoClient(uri);
}

export default client;
