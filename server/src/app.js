// Builds the Express app: middleware, routes, and error handling
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config/env.js';
import apiRoutes from './routes/index.js';
import shareRedirectRoutes from './routes/shareRedirect.routes.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  // Only our React app is allowed to call the API from a browser
  app.use(cors({ origin: config.clientUrl }));
  // Lets us read JSON request bodies as req.body
  app.use(express.json());
  // Lets us read cookies as req.cookies (used to count unique share-link clicks)
  app.use(cookieParser());

  // Quick check that the server is alive
  app.get('/health', (req, res) => res.json({ ok: true }));

  // All JSON API routes live under /api
  app.use('/api', apiRoutes);

  // Short share links like http://localhost:5000/s/a1b2c3d4
  app.use('/s', shareRedirectRoutes);

  // These two must come last
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
