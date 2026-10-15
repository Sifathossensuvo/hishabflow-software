import mongoose from 'mongoose';
import { env } from './config/env.js';
import { createApp } from './app.js';

async function main() {
  await mongoose.connect(env.mongoUri);
  console.log('MongoDB connected');
  // Make sure indexes (including the unique SKU rule) exist.
  await mongoose.connection.syncIndexes?.().catch(() => {});
  const app = createApp();
  const server = app.listen(env.port, () => console.log(`HisabFlow API running on http://localhost:${env.port}`));
  const stop = () => server.close(() => mongoose.disconnect().then(() => process.exit(0)));
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}

main().catch((err) => {
  console.error('Could not start the server:', err.message);
  process.exit(1);
});
