import bcrypt from 'bcryptjs';
import prisma from '../utils/prismaClient.js';
import { signDoctorToken } from '../services/tokenService.js';
import { success, error, created } from '../utils/apiResponse.js';
import { verifyDoctor, importDoctorsCsv } from '../services/doctorVerificationService.js';

const SALT_ROUNDS = 12;

/**
 * POST /doctor/register
 * Register a new doctor account.
 */
export const handleRegister = async (req, res, next) => {
  try {
    const { name, hospitalName, email, password } = req.body;

    if (!name || !hospitalName || !email || !password) {
      return error(res, 'All fields are required: name, hospitalName, email, password.', 400);
    }

    if (password.length < 6) {
      return error(res, 'Password must be at least 6 characters.', 400);
    }

    // Check if doctor already exists
    const existing = await prisma.doctor.findUnique({
      where: { email },
    });

    if (existing) {
      return error(res, 'A doctor with this email already exists.', 409);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const doctor = await prisma.doctor.create({
      data: {
        name,
        hospitalName,
        email,
        password: hashedPassword,
      },
    });

    const token = signDoctorToken(doctor);

    return created(res, 'Doctor registered successfully.', {
      token,
      doctor: {
        id: doctor.id,
        name: doctor.name,
        hospitalName: doctor.hospitalName,
        email: doctor.email,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /doctor/login
 * Authenticate a doctor and return a JWT.
 */
export const handleLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return error(res, 'Email and password are required.', 400);
    }

    const doctor = await prisma.doctor.findUnique({
      where: { email },
    });

    if (!doctor) {
      return error(res, 'Invalid email or password.', 401);
    }

    const isPasswordValid = await bcrypt.compare(password, doctor.password);

    if (!isPasswordValid) {
      return error(res, 'Invalid email or password.', 401);
    }

    const token = signDoctorToken(doctor);

    return success(res, 'Login successful.', {
      token,
      doctor: {
        id: doctor.id,
        name: doctor.name,
        fatherName: doctor.fatherName,
        phone: doctor.phone,
        email: doctor.email,
        registrationNumber: doctor.registrationNumber,
        stateCouncil: doctor.stateCouncil,
        verified: doctor.verified,
        photoUrl: doctor.photoUrl,
        hospitalName: doctor.hospitalName,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /doctor/upload-csv
 * Uploads and parses the doctor verification CSV dataset.
 */
export const handleUploadCsv = async (req, res, next) => {
  try {
    if (!req.file) {
      return error(res, 'No CSV file uploaded.', 400);
    }

    const result = await importDoctorsCsv(req.file.path);
    return success(res, `CSV imported successfully. ${result.count} records added.`, result);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /doctor/onboard
 * Onboard a doctor using phone (OTP already handled), state_council, registration_number
 */
export const handleOnboard = async (req, res, next) => {
  try {
    const { phone, state_council, registration_number, name, email, password } = req.body;

    if (!phone || !state_council || !registration_number || !email || !password) {
      return error(res, 'Phone, state_council, registration_number, email, and password are required.', 400);
    }

    // Verify against local dataset
    const verificationResult = await verifyDoctor({
      registration_number,
      state_council,
      name
    });

    let doctorName = name || 'Pending Verification';
    let isVerified = false;
    let fatherName = null;
    let photoUrl = req.file ? req.file.path : null;

    if (verificationResult.verified && verificationResult.doctor) {
      // Auto-fill name from DB if found
      doctorName = verificationResult.doctor.name;
      fatherName = verificationResult.doctor.fatherName;
      isVerified = true;
    }

    // Check if email already exists
    const existingEmail = await prisma.doctor.findUnique({
      where: { email }
    });
    
    if (existingEmail && existingEmail.phone !== phone) {
      return error(res, 'A doctor with this email already exists.', 409);
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Upsert or create doctor record
    let doctor = await prisma.doctor.findUnique({
      where: { phone }
    });

    if (doctor) {
       // Update existing doctor
       doctor = await prisma.doctor.update({
         where: { phone },
         data: {
           name: doctorName,
           fatherName,
           registrationNumber: registration_number,
           stateCouncil: state_council,
           email,
           password: hashedPassword,
           verified: isVerified,
           photoUrl: photoUrl || undefined
         }
       });
    } else {
       // Create new doctor
       doctor = await prisma.doctor.create({
         data: {
           name: doctorName,
           fatherName,
           phone,
           email,
           password: hashedPassword,
           registrationNumber: registration_number,
           stateCouncil: state_council,
           verified: isVerified,
           photoUrl
         }
       });
    }

    const token = signDoctorToken(doctor);

    return success(res, isVerified ? 'Doctor verified and onboarded successfully.' : 'Doctor onboarding pending verification.', {
      token,
      verified: isVerified,
      fatherName,
      doctor: {
        id: doctor.id,
        name: doctor.name,
        fatherName: doctor.fatherName,
        phone: doctor.phone,
        email: doctor.email,
        registrationNumber: doctor.registrationNumber,
        stateCouncil: doctor.stateCouncil,
        verified: doctor.verified,
        photoUrl: doctor.photoUrl,
        hospitalName: doctor.hospitalName,
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /doctor/stats
 * Retrieves statistics for the doctor dashboard.
 */
export const handleGetStats = async (req, res, next) => {
  try {
    const doctorId = req.doctor.id;

    // Get unique patients treated (based on records uploaded by this doctor)
    const uniquePatients = await prisma.medicalRecord.groupBy({
      by: ['patientId'],
      where: { doctorId }
    });

    // Get total records uploaded by this doctor
    const totalRecords = await prisma.medicalRecord.count({
      where: { doctorId }
    });

    return success(res, 'Stats retrieved', {
      patientsTreated: uniquePatients.length,
      recordsUploaded: totalRecords
    });
  } catch (err) {
    next(err);
  }
};
