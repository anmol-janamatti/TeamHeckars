import prisma from '../utils/prismaClient.js';
import { sendOtp, verifyOtp } from '../services/otpService.js';
import { signPatientToken } from '../services/tokenService.js';
import { success, error, created } from '../utils/apiResponse.js';

/**
 * POST /auth/send-otp
 * Send a mock OTP to the given phone number.
 */
export const handleSendOtp = async (req, res, next) => {
  try {
    let { phoneNumber } = req.body;

    if (!phoneNumber) {
      return error(res, 'Phone number is required.', 400);
    }
    if (!phoneNumber.startsWith('+')) phoneNumber = '+91' + phoneNumber;

    const result = await sendOtp(phoneNumber);
    return success(res, 'OTP sent successfully (check server console for mock OTP).', result);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /auth/verify-otp
 * Verify OTP and return a patient JWT.
 * If the patient doesn't exist yet, returns a flag to create profile.
 */
export const handleVerifyOtp = async (req, res, next) => {
  try {
    let { phoneNumber, otp } = req.body;

    if (!phoneNumber || !otp) {
      return error(res, 'Phone number and OTP are required.', 400);
    }
    if (!phoneNumber.startsWith('+')) phoneNumber = '+91' + phoneNumber;

    const isValid = await verifyOtp(phoneNumber, otp);

    if (!isValid) {
      return error(res, 'Invalid or expired OTP.', 401);
    }

    // Check if patient exists
    let patient = await prisma.patient.findUnique({
      where: { phoneNumber },
    });

    if (!patient) {
      return success(res, 'OTP verified. Patient not found — please create profile.', {
        verified: true,
        patientExists: false,
        phoneNumber,
      });
    }

    // Generate patient token
    const token = signPatientToken(patient);

    return success(res, 'OTP verified successfully.', {
      verified: true,
      patientExists: true,
      token,
      patient: {
        id: patient.id,
        name: patient.name,
        phoneNumber: patient.phoneNumber,
        age: patient.age,
        gender: patient.gender,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /patient/create
 * Create a new patient profile.
 */
export const handleCreatePatient = async (req, res, next) => {
  try {
    let { name, phoneNumber, age, gender } = req.body;

    if (!name || !phoneNumber) {
      return error(res, 'Name and phone number are required.', 400);
    }
    if (!phoneNumber.startsWith('+')) phoneNumber = '+91' + phoneNumber;

    // Check if patient already exists
    const existing = await prisma.patient.findUnique({
      where: { phoneNumber },
    });

    if (existing) {
      return error(res, 'Patient with this phone number already exists.', 409);
    }

    const patient = await prisma.patient.create({
      data: { name, phoneNumber, age, gender },
    });

    const token = signPatientToken(patient);

    return created(res, 'Patient profile created successfully.', {
      token,
      patient: {
        id: patient.id,
        name: patient.name,
        phoneNumber: patient.phoneNumber,
        age: patient.age,
        gender: patient.gender,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /patient/profile
 * Get the authenticated patient's profile.
 * Requires patient JWT (obtained via OTP).
 */
export const handleGetProfile = async (req, res, next) => {
  try {
    const patient = await prisma.patient.findUnique({
      where: { id: req.patient.id },
      include: {
        _count: {
          select: { medicalRecords: true }
        },
        medicalRecords: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            diagnosis: true,
            createdAt: true,
            fileName: true,
            fileMimeType: true,
            fileSize: true,
            doctor: {
              select: {
                id: true,
                name: true,
                fatherName: true,
                hospitalName: true,
                stateCouncil: true,
                registrationNumber: true,
                verified: true,
                photoUrl: true,
              },
            },
          },
        },
      },
    });

    if (!patient) {
      return error(res, 'Patient not found.', 404);
    }

    return success(res, 'Patient profile retrieved.', patient);
  } catch (err) {
    next(err);
  }
};
