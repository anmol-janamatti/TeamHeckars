import fs from 'fs';
import csvParser from 'csv-parser';
import prisma from '../utils/prismaClient.js';

/**
 * Normalizes a registration number (keeps only digits).
 */
const normalizeRegNumber = (regNum) => {
  if (!regNum) return '';
  return regNum.toString().replace(/\D/g, '');
};

/**
 * Normalizes a doctor's name (lowercase, removes 'dr.').
 */
const normalizeName = (name) => {
  if (!name) return '';
  let cleanName = name.toLowerCase().trim();
  if (cleanName.startsWith('dr.')) {
    cleanName = cleanName.substring(3).trim();
  } else if (cleanName.startsWith('dr ')) {
    cleanName = cleanName.substring(3).trim();
  }
  return cleanName;
};

/**
 * Verifies a doctor against the verified_doctors dataset.
 * 
 * @param {Object} params 
 * @param {string} params.registration_number
 * @param {string} params.state_council
 * @param {string} params.name (optional, if we are doing strict name checking)
 * @returns {Promise<{verified: boolean, doctor?: any}>}
 */
export const verifyDoctor = async ({ registration_number, state_council, name }) => {
  try {
    const regNum = normalizeRegNumber(registration_number);
    if (!regNum || !state_council) {
      return { verified: false };
    }

    const stateCouncilTrimmed = state_council.trim();

    // Find the doctor in our verified dataset
    const verifiedRecord = await prisma.verifiedDoctor.findFirst({
      where: {
        registrationNumber: regNum,
        stateCouncil: {
          equals: stateCouncilTrimmed,
          mode: 'insensitive'
        }
      }
    });

    if (!verifiedRecord) {
      return { verified: false };
    }

    // If a name was provided, we do a partial match check
    if (name) {
      const inputName = normalizeName(name);
      const recordName = normalizeName(verifiedRecord.name);

      if (!recordName.includes(inputName) && !inputName.includes(recordName)) {
         // Name mismatch
         return { verified: false };
      }
    }

    return { verified: true, doctor: verifiedRecord };
  } catch (error) {
    console.error('Doctor verification error:', error);
    return { verified: false };
  }
};

/**
 * Parses and imports a CSV file into the verified_doctors table.
 * 
 * @param {string} filePath - Absolute path to the CSV file.
 * @returns {Promise<{success: boolean, count: number, errors: any[]}>}
 */
export const importDoctorsCsv = (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];
    const errors = [];

    fs.createReadStream(filePath)
      .pipe(csvParser({
        mapHeaders: ({ header }) => header.toLowerCase().replace(/[^a-z0-9]/g, '')
      }))
      .on('data', (data) => {
        try {
          const regNumRaw = data.registrationnumber || '';
          const stateCouncilRaw = data.statemedicalcouncils || data.statecouncil || '';
          const nameRaw = data.name || '';
          const fatherNameRaw = data.fathername || '';

          const regNum = normalizeRegNumber(regNumRaw);
          const stateCouncil = stateCouncilRaw.trim();
          const name = nameRaw.trim();
          const fatherName = fatherNameRaw.trim();

          if (regNum && stateCouncil && name) {
            results.push({
              registrationNumber: regNum,
              stateCouncil: stateCouncil,
              name: name,
              fatherName: fatherName || null
            });
          } else {
            errors.push(`Missing required fields for row: ${JSON.stringify(data)}`);
          }
        } catch (err) {
          errors.push(`Error parsing row: ${err.message}`);
        }
      })
      .on('end', async () => {
        try {
          // Bulk insert (upsert not natively supported in createMany, so we might need to handle duplicates)
          // For simplicity, we just clear and insert, or use createMany with skipDuplicates.
          
          let count = 0;
          if (results.length > 0) {
            const insertResult = await prisma.verifiedDoctor.createMany({
              data: results,
              skipDuplicates: true
            });
            count = insertResult.count;
          }

          // Optionally delete the file after processing
          fs.unlinkSync(filePath);

          resolve({ success: true, count, errors });
        } catch (err) {
          reject(err);
        }
      })
      .on('error', (err) => {
        reject(err);
      });
  });
};
