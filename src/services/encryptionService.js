import crypto from 'node:crypto';
import config from '../config/index.js';

const ALGORITHM = 'aes-256-gcm';

/**
 * Get the 32-byte encryption key from config (hex string → Buffer).
 */
const getKey = () => {
  const keyHex = config.fileEncryptionKey;
  if (!keyHex || keyHex.length < 64) {
    throw new Error('FILE_ENCRYPTION_KEY must be a 64-character hex string (32 bytes).');
  }
  return Buffer.from(keyHex, 'hex');
};

/**
 * Encrypt a file buffer using AES-256-GCM.
 * @param {Buffer} buffer - The raw file buffer.
 * @returns {{ encryptedData: Buffer, iv: string, authTag: string }}
 */
export const encryptFile = (buffer) => {
  const key = getKey();
  const iv = crypto.randomBytes(16); // 128-bit IV
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    encryptedData: encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
  };
};

/**
 * Decrypt an encrypted file buffer using AES-256-GCM.
 * @param {Buffer} encryptedData - The encrypted file buffer.
 * @param {string} ivHex - The initialization vector (hex string).
 * @param {string} authTagHex - The GCM authentication tag (hex string).
 * @returns {Buffer} - The decrypted file buffer.
 */
export const decryptFile = (encryptedData, ivHex, authTagHex) => {
  const key = getKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
  return decrypted;
};
