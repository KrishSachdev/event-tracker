// Entry point: connect to the database, then start listening for requests
import { config } from './config/env.js';
import { connectDB } from './config/db.js';
import { createApp } from './app.js';

async function start() {
  await connectDB();
  const app = createApp();
  app.listen(config.port, () => {
    console.log(`API running on ${config.serverUrl}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
