import crypto from 'node:crypto';
import config from '../config/index.js';

const QR_TOKEN_EXPIRY_SECONDS = 30; // QR refreshes every 30 seconds

/**
 * Generate a short-lived signed QR token for a patient.
 * Contains the patient's phone number, signed with HMAC-SHA256.
 * Valid for 30 seconds.
 *
 * @param {string} phoneNumber - Patient's phone number
 * @returns {{ token: string, expiresAt: number }}
 */
export const generateQrToken = (phoneNumber) => {
  const expiresAt = Math.floor(Date.now() / 1000) + QR_TOKEN_EXPIRY_SECONDS;

  const payload = JSON.stringify({ phone: phoneNumber, exp: expiresAt });
  const payloadBase64 = Buffer.from(payload).toString('base64url');

  // Sign with HMAC-SHA256 using the JWT secret
  const signature = crypto
    .createHmac('sha256', config.jwtSecret)
    .update(payloadBase64)
    .digest('base64url');

  const token = `${payloadBase64}.${signature}`;

  return { token, expiresAt, expiresIn: QR_TOKEN_EXPIRY_SECONDS };
};

/**
 * Verify a QR token and extract the phone number.
 *
 * @param {string} token - The QR token string (payload.signature)
 * @returns {{ valid: boolean, phoneNumber?: string, error?: string }}
 */
export const verifyQrToken = (token) => {
  if (!token || !token.includes('.')) {
    return { valid: false, error: 'Invalid QR code format.' };
  }

  const [payloadBase64, signature] = token.split('.');

  // Verify signature
  const expectedSig = crypto
    .createHmac('sha256', config.jwtSecret)
    .update(payloadBase64)
    .digest('base64url');

  if (signature !== expectedSig) {
    return { valid: false, error: 'Invalid QR code — signature mismatch.' };
  }

  // Decode payload
  try {
    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString());
    const now = Math.floor(Date.now() / 1000);

    if (payload.exp < now) {
      return { valid: false, error: 'QR code expired. Ask patient to show a fresh one.' };
    }

    if (!payload.phone) {
      return { valid: false, error: 'Invalid QR code — no phone number.' };
    }

    return { valid: true, phoneNumber: payload.phone };
  } catch (err) {
    return { valid: false, error: 'Malformed QR code.' };
  }
};
