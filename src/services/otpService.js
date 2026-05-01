import twilio from 'twilio';
import prisma from '../utils/prismaClient.js';
import config from '../config/index.js';

// ─── Twilio Client (lazy init) ───────────────────────────────
let twilioClient = null;

const getTwilioClient = () => {
  if (twilioClient) return twilioClient;

  if (config.twilioAccountSid && config.twilioAuthToken && config.twilioVerifyServiceSid) {
    twilioClient = twilio(config.twilioAccountSid, config.twilioAuthToken);
    console.log('📱 Twilio Verify connected');
    return twilioClient;
  }

  return null;
};

let twilioDisabled = false;

const isTwilioConfigured = () => {
  if (twilioDisabled) return false;
  return !!(
    config.twilioAccountSid &&
    config.twilioAccountSid.startsWith('AC') &&
    config.twilioAuthToken &&
    config.twilioVerifyServiceSid &&
    config.twilioVerifyServiceSid.startsWith('VA')
  );
};

// ─── Mock OTP helpers (fallback when Twilio not configured) ──

const generateMockOtp = () => {
  const digits = config.otpLength;
  const min = Math.pow(10, digits - 1);
  const max = Math.pow(10, digits) - 1;
  return String(Math.floor(min + Math.random() * (max - min + 1)));
};

// ─── Send OTP ────────────────────────────────────────────────

/**
 * Send OTP to a phone number.
 * Uses Twilio Verify if configured, otherwise falls back to mock.
 */
export const sendOtp = async (phoneNumber) => {
  // ─── Twilio Verify ─────────────────────────────────────
  if (isTwilioConfigured()) {
    const client = getTwilioClient();

    try {
      const verification = await client.verify.v2
        .services(config.twilioVerifyServiceSid)
        .verifications.create({
          to: phoneNumber,
          channel: 'sms',
        });

      console.log(`📱 [TWILIO] OTP sent to ${phoneNumber} — Status: ${verification.status}`);

      return {
        phoneNumber,
        status: verification.status,
        channel: 'sms',
        provider: 'twilio',
      };
    } catch (err) {
      console.error('❌ Twilio error:', err.message);
      console.log('⚠️ Twilio failed. Falling back to Local Mock OTP for this session...');
      twilioDisabled = true; // Disable Twilio for the rest of the session
      // Execution continues to the Mock Fallback below
    }
  }

  // ─── Mock Fallback ─────────────────────────────────────
  const otp = generateMockOtp();
  const expiresAt = new Date(Date.now() + config.otpExpiryMinutes * 60 * 1000);

  // Invalidate previous OTPs
  await prisma.otp.updateMany({
    where: { phoneNumber, verified: false },
    data: { verified: true },
  });

  // Store in DB
  const record = await prisma.otp.create({
    data: { phoneNumber, otp, expiresAt },
  });

  console.log(`\n📱 [MOCK SMS] OTP for ${phoneNumber}: ${otp} (expires in ${config.otpExpiryMinutes} min)\n`);

  return {
    id: record.id,
    phoneNumber,
    expiresAt,
    provider: 'mock',
  };
};

// ─── Verify OTP ──────────────────────────────────────────────

/**
 * Verify an OTP for a given phone number.
 * Uses Twilio Verify if configured, otherwise checks local DB.
 */
export const verifyOtp = async (phoneNumber, otpCode) => {
  // ─── Twilio Verify ─────────────────────────────────────
  if (isTwilioConfigured()) {
    const client = getTwilioClient();

    try {
      const verificationCheck = await client.verify.v2
        .services(config.twilioVerifyServiceSid)
        .verificationChecks.create({
          to: phoneNumber,
          code: otpCode,
        });

      console.log(`📱 [TWILIO] Verification for ${phoneNumber}: ${verificationCheck.status}`);

      return verificationCheck.status === 'approved';
    } catch (err) {
      console.error('❌ Twilio verification error:', err.message);
      return false;
    }
  }

  // ─── Mock Fallback ─────────────────────────────────────
  const record = await prisma.otp.findFirst({
    where: {
      phoneNumber,
      otp: otpCode,
      verified: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { id: 'desc' },
  });

  if (!record) return false;

  await prisma.otp.update({
    where: { id: record.id },
    data: { verified: true },
  });

  return true;
};
