import { Router } from 'express';
import { handleSendOtp, handleVerifyOtp } from '../controllers/authController.js';

const router = Router();

// POST /auth/send-otp
router.post('/send-otp', handleSendOtp);

// POST /auth/verify-otp
router.post('/verify-otp', handleVerifyOtp);

// POST /auth/verify-qr
// Called when a doctor scans a patient's QR code.
// Automatically bypasses OTP and generates a consentToken.
import { requireDoctorAuth } from '../middleware/authMiddleware.js';
import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

router.post('/verify-qr', requireDoctorAuth, async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, message: 'QR token required' });

    // Verify the short-lived token
    const { verifyQrToken } = await import('../services/qrService.js');
    const result = verifyQrToken(token);

    if (!result.valid) {
      return res.status(400).json({ success: false, message: result.error });
    }

    const phoneNumber = result.phoneNumber;

    // Look up the patient
    const patient = await prisma.patient.findUnique({
      where: { phoneNumber }
    });

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    // Generate consent bypass token directly
    const consentToken = jwt.sign({
      id: patient.id,
      phoneNumber: patient.phoneNumber,
      role: 'patient',
    }, config.jwtSecret, { expiresIn: config.patientJwtExpiresIn || '7d' });

    // Log the CRITICAL bypass action
    await prisma.accessLog.create({
      data: {
        patientId: patient.id,
        doctorId: req.doctor.id,
        action: 'CONSENT_BYPASS',
        details: 'Doctor accessed records directly via QR bypass.'
      }
    });

    return res.json({ 
      success: true, 
      message: 'QR Consent Bypass Active',
      data: { phoneNumber, consentToken }
    });
  } catch (err) {
    next(err);
  }
});

export default router;
