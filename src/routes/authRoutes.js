import { Router } from 'express';
import { handleSendOtp, handleVerifyOtp } from '../controllers/authController.js';

const router = Router();

// POST /auth/send-otp
router.post('/send-otp', handleSendOtp);

// POST /auth/verify-otp
router.post('/verify-otp', handleVerifyOtp);

// POST /auth/verify-qr
// Called when a doctor scans a patient's QR code.
// Returns the phone number and automatically triggers an OTP.
router.post('/verify-qr', async (req, res, next) => {
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

    // Send OTP automatically since the doctor scanned them
    const { sendOtp } = await import('../services/otpService.js');
    await sendOtp(phoneNumber);

    return res.json({ 
      success: true, 
      message: 'QR valid. OTP sent to patient.',
      data: { phoneNumber }
    });
  } catch (err) {
    next(err);
  }
});

export default router;
