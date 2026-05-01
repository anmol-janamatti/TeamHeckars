import { Router } from 'express';
import prisma from '../utils/prismaClient.js';
import { sendOtp, verifyOtp } from '../services/otpService.js';
import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import { requireDoctorAuth } from '../middleware/authMiddleware.js';
import { success, error } from '../utils/apiResponse.js';

const router = Router();

/**
 * GET /consent/search/:phone
 * Doctor searches for a patient by phone — returns basic profile only.
 * No consent needed.
 */
router.get('/search/:phone', requireDoctorAuth, async (req, res, next) => {
  try {
    let { phone } = req.params;
    if (!phone.startsWith('+')) phone = '+91' + phone;

    const patient = await prisma.patient.findUnique({
      where: { phoneNumber: phone },
      select: { id: true, name: true, phoneNumber: true, age: true, gender: true, createdAt: true },
    });

    if (!patient) {
      return error(res, 'Patient not found.', 404);
    }

    // Count records (don't reveal content)
    const recordCount = await prisma.medicalRecord.count({
      where: { patientId: patient.id },
    });

    return success(res, 'Patient found.', { patient, recordCount });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /consent/request
 * Doctor requests consent — sends OTP to patient's phone.
 */
router.post('/request', requireDoctorAuth, async (req, res, next) => {
  try {
    let { phoneNumber } = req.body;

    if (!phoneNumber) {
      return error(res, 'phoneNumber is required.', 400);
    }
    if (!phoneNumber.startsWith('+')) phoneNumber = '+91' + phoneNumber;

    const patient = await prisma.patient.findUnique({
      where: { phoneNumber },
    });

    if (!patient) {
      return error(res, 'Patient not found.', 404);
    }

    const result = await sendOtp(phoneNumber);
    return success(res, 'Consent OTP sent to patient.', { phoneNumber, ...result });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /consent/verify
 * Doctor submits OTP given by patient — returns consent token.
 */
router.post('/verify', requireDoctorAuth, async (req, res, next) => {
  try {
    let { phoneNumber, otp } = req.body;

    if (!phoneNumber || !otp) {
      return error(res, 'phoneNumber and otp are required.', 400);
    }
    if (!phoneNumber.startsWith('+')) phoneNumber = '+91' + phoneNumber;

    const patient = await prisma.patient.findUnique({
      where: { phoneNumber },
    });

    if (!patient) {
      return error(res, 'Patient not found.', 404);
    }

    const isValid = await verifyOtp(phoneNumber, otp);
    if (!isValid) {
      return error(res, 'Invalid or expired OTP.', 401);
    }

    // Generate a consent token (patient JWT valid for 1 hour)
    const consentToken = jwt.sign({
      id: patient.id,
      phoneNumber: patient.phoneNumber,
      role: 'patient',
    }, config.jwtSecret, { expiresIn: '1h' });

    return success(res, 'Consent granted.', {
      consentToken,
      patient: {
        id: patient.id,
        name: patient.name,
        phoneNumber: patient.phoneNumber,
      },
      expiresIn: '1 hour',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
