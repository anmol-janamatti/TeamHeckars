import prisma from '../utils/prismaClient.js';
import { generateRecordHash } from '../services/hashingService.js';
import { encryptFile, decryptFile } from '../services/encryptionService.js';
import { success, error, created } from '../utils/apiResponse.js';

/**
 * POST /records/upload
 * Upload a new medical record with optional encrypted file attachment.
 * Requires doctor authentication.
 * Files are encrypted with AES-256-GCM before being stored in the database.
 */
export const handleUploadRecord = async (req, res, next) => {
  try {
    let { patientId, phoneNumber, diagnosis, medications, allergies, notes } = req.body;

    if ((!patientId && !phoneNumber) || !diagnosis) {
      return error(res, 'patientId or phoneNumber, and diagnosis are required.', 400);
    }

    if (phoneNumber && !phoneNumber.startsWith('+')) phoneNumber = '+91' + phoneNumber;

    // Resolve patient by phone number or ID
    const patient = phoneNumber
      ? await prisma.patient.findUnique({ where: { phoneNumber } })
      : await prisma.patient.findUnique({ where: { id: patientId } });

    if (!patient) {
      return error(res, 'Patient not found.', 404);
    }

    // Parse medications and allergies (accept JSON strings or arrays)
    const parsedMedications = typeof medications === 'string' ? JSON.parse(medications) : medications || [];
    const parsedAllergies = typeof allergies === 'string' ? JSON.parse(allergies) : allergies || [];

    // Handle file upload — encrypt and prepare for DB storage
    let fileData = {};
    if (req.file) {
      const { encryptedData, iv, authTag } = encryptFile(req.file.buffer);
      fileData = {
        encryptedFile: encryptedData,
        fileIv: iv,
        fileAuthTag: authTag,
        fileName: req.file.originalname,
        fileMimeType: req.file.mimetype,
        fileSize: req.file.size,
      };
      console.log(`🔐 File encrypted: ${req.file.originalname} (${(req.file.size / 1024).toFixed(1)} KB)`);
    }

    // Build the record data for hashing
    const recordData = {
      patientId: patient.id,
      diagnosis,
      medications: parsedMedications,
      allergies: parsedAllergies,
      notes: notes || '',
      fileName: req.file?.originalname || null,
      fileSize: req.file?.size || null,
      timestamp: new Date().toISOString(),
    };

    // Generate SHA-256 hash for integrity verification
    const hash = generateRecordHash(recordData);
    console.log(`🔒 Record hash generated: ${hash}`);

    // Save record to database
    const record = await prisma.medicalRecord.create({
      data: {
        patientId: patient.id,
        doctorId: req.doctor.id,
        diagnosis,
        medications: parsedMedications,
        allergies: parsedAllergies,
        notes: notes || null,
        hash,
        ...fileData,
      },
      include: {
        patient: {
          select: { id: true, name: true, phoneNumber: true },
        },
        doctor: {
          select: { id: true, name: true, hospitalName: true },
        },
      },
    });

    // Log the upload action
    await prisma.accessLog.create({
      data: {
        patientId: patient.id,
        doctorId: req.doctor.id,
        action: 'uploaded_record',
        details: `Uploaded record: ${diagnosis}`
      }
    });

    return created(res, 'Medical record uploaded successfully.', {
      record: {
        id: record.id,
        diagnosis: record.diagnosis,
        medications: record.medications,
        allergies: record.allergies,
        notes: record.notes,
        hasFile: !!record.encryptedFile,
        fileName: record.fileName,
        fileMimeType: record.fileMimeType,
        fileSize: record.fileSize,
        hash: record.hash,
        createdAt: record.createdAt,
        patient: record.patient,
        doctor: record.doctor,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /records/:patientId
 * Retrieve all medical records for a patient.
 * Requires authentication + consent.
 * Does NOT return file binary — use /records/file/:recordId for that.
 */
export const handleGetRecords = async (req, res, next) => {
  try {
    let { patientId } = req.params;

    // Resolve patient by phone number or UUID
    let patient;
    if (patientId.startsWith('+') || /^\d{10,}$/.test(patientId)) {
      if (!patientId.startsWith('+')) patientId = '+91' + patientId;
      patient = await prisma.patient.findUnique({ where: { phoneNumber: patientId } });
    } else {
      patient = await prisma.patient.findUnique({ where: { id: patientId } });
    }

    if (!patient) {
      return error(res, 'Patient not found.', 404);
    }

    const records = await prisma.medicalRecord.findMany({
      where: { patientId: patient.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        diagnosis: true,
        medications: true,
        allergies: true,
        notes: true,
        hash: true,
        createdAt: true,
        fileName: true,
        fileMimeType: true,
        fileSize: true,
        fileUrl: true,  // legacy field
        doctor: {
          select: { id: true, name: true, hospitalName: true },
        },
      },
    });

    // Add hasFile flag for frontend convenience
    const recordsWithFileFlag = records.map(rec => ({
      ...rec,
      hasFile: !!(rec.fileName),
    }));

    // Log access if doctor is viewing
    if (req.user?.role === 'doctor') {
      await prisma.accessLog.create({
        data: {
          patientId: patient.id,
          doctorId: req.user.id,
          action: 'viewed_records',
          details: `Viewed ${records.length} record(s)`
        }
      });
    }

    return success(res, `Found ${records.length} record(s) for patient.`, {
      patient: {
        id: patient.id,
        name: patient.name,
        phoneNumber: patient.phoneNumber,
        age: patient.age,
        gender: patient.gender,
      },
      records: recordsWithFileFlag,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /records/file/:recordId
 * Serve a decrypted file attachment for a medical record.
 * Requires authentication + consent.
 * Both doctors (with consent) and patients (own records) can access.
 */
export const handleGetFile = async (req, res, next) => {
  try {
    const { recordId } = req.params;

    const record = await prisma.medicalRecord.findUnique({
      where: { id: recordId },
      select: {
        encryptedFile: true,
        fileIv: true,
        fileAuthTag: true,
        fileName: true,
        fileMimeType: true,
        fileSize: true,
        patientId: true,
      },
    });

    if (!record) {
      return error(res, 'Record not found.', 404);
    }

    if (!record.encryptedFile) {
      return error(res, 'No file attached to this record.', 404);
    }

    // Decrypt the file
    const decryptedBuffer = decryptFile(
      record.encryptedFile,
      record.fileIv,
      record.fileAuthTag
    );

    // Log file download if doctor is accessing
    if (req.user?.role === 'doctor') {
      await prisma.accessLog.create({
        data: {
          patientId: record.patientId,
          doctorId: req.user.id,
          action: 'downloaded_file',
          details: `Downloaded file: ${record.fileName}`
        }
      });
    }

    // Set response headers
    res.set({
      'Content-Type': record.fileMimeType || 'application/octet-stream',
      'Content-Disposition': `inline; filename="${record.fileName || 'download'}"`,
      'Content-Length': decryptedBuffer.length,
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    });

    return res.send(decryptedBuffer);
  } catch (err) {
    if (err.message?.includes('Unsupported state') || err.code === 'ERR_OSSL_EVP_BAD_DECRYPT') {
      return error(res, 'File decryption failed. The file may be corrupted.', 500);
    }
    next(err);
  }
};
