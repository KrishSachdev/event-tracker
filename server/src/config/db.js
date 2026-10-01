import mongoose from 'mongoose';
import { config } from './env.js';

// Opens the MongoDB connection once, when the server starts
export async function connectDB() {
  await mongoose.connect(config.mongoUri);
  console.log('MongoDB connected');
}
