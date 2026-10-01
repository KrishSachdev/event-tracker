// Loads the values from server/.env into process.env
import 'dotenv/config';

// All settings in one place, so the rest of the code never reads process.env directly
export const config = {
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/event-tracker',
  ticketmasterKey: process.env.TICKETMASTER_API_KEY,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  serverUrl: process.env.SERVER_URL || 'http://localhost:5000',
  defaultCity: process.env.DEFAULT_CITY || 'New York',
  // Chat assistant (optional: the rest of the app works without it)
  geminiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-flash-latest',
};

// Stop immediately if the API key is missing, instead of failing on the first request
if (!config.ticketmasterKey) {
  console.error('Missing TICKETMASTER_API_KEY in server/.env');
  process.exit(1);
}

// The chat is optional, so just warn
if (!config.geminiKey || config.geminiKey === 'your_gemini_key_here') {
  config.geminiKey = '';
  console.warn('GEMINI_API_KEY is not set in server/.env, so the chat assistant is turned off.');
}
