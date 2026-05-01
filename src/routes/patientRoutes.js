import { Router } from 'express';
import { handleCreatePatient, handleGetProfile } from '../controllers/authController.js';
import { requirePatientAuth } from '../middleware/authMiddleware.js';
import { generateQrToken } from '../services/qrService.js';
import { success } from '../utils/apiResponse.js';
import prisma from '../utils/prismaClient.js';

const router = Router();

// POST /patient/create
router.post('/create', handleCreatePatient);

// GET /patient/profile (requires patient JWT from OTP verification)
router.get('/profile', requirePatientAuth, handleGetProfile);

// GET /patient/qr-token (requires patient JWT)
router.get('/qr-token', requirePatientAuth, (req, res) => {
  const { token, expiresIn } = generateQrToken(req.patient.phoneNumber);
  return success(res, 'QR token generated', { token, expiresIn });
});

// GET /patient/access-logs (requires patient JWT)
router.get('/access-logs', requirePatientAuth, async (req, res, next) => {
  try {
    const logs = await prisma.accessLog.findMany({
      where: { patientId: req.patient.id },
      orderBy: { createdAt: 'desc' },
      include: {
        doctor: {
          select: {
            id: true,
            name: true,
            photoUrl: true,
            hospitalName: true,
            stateCouncil: true,
            registrationNumber: true,
            verified: true,
          }
        }
      }
    });
    return success(res, `Found ${logs.length} access log(s).`, logs);
  } catch (err) {
    next(err);
  }
});

export default router;
