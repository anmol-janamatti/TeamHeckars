import dotenv from 'dotenv';
import crypto from 'node:crypto';
dotenv.config();

// Auto-generate a stable dev encryption key if not provided
const defaultEncryptionKey = crypto.randomBytes(32).toString('hex');

const config = {
  // Server
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database
  databaseUrl: process.env.DATABASE_URL,

  // JWT
  jwtSecret: process.env.JWT_SECRET || 'default-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  patientJwtExpiresIn: process.env.PATIENT_JWT_EXPIRES_IN || '7d',

  // Twilio Verify (OTP)
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || '',
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || '',
  twilioVerifyServiceSid: process.env.TWILIO_VERIFY_SERVICE_SID || '',

  // Groq AI
  groqApiKey: process.env.GROQ_API_KEY || '',
  groqModel: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
  groqVisionModel: process.env.GROQ_VISION_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct',

  // OTP
  otpExpiryMinutes: 5,
  otpLength: 6,

  // File Encryption (AES-256-GCM)
  fileEncryptionKey: process.env.FILE_ENCRYPTION_KEY || defaultEncryptionKey,
};

export default config;
