import crypto from 'node:crypto';

/**
 * Generate a SHA-256 hash of the given record data object.
 * Used to ensure medical record integrity.
 */
export const generateRecordHash = (recordData) => {
  const payload = JSON.stringify(recordData, Object.keys(recordData).sort());
  return crypto.createHash('sha256').update(payload).digest('hex');
};

/**
 * Verify that a record's data matches its stored hash.
 */
export const verifyRecordHash = (recordData, expectedHash) => {
  const computedHash = generateRecordHash(recordData);
  return computedHash === expectedHash;
};
