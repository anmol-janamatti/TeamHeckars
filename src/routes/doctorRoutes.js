import { Router } from 'express';
import multer from 'multer';
import { handleRegister, handleLogin, handleUploadCsv, handleOnboard, handleGetStats } from '../controllers/doctorController.js';
import { requireDoctorAuth } from '../middleware/authMiddleware.js';

const upload = multer({ dest: 'uploads/' });

const router = Router();

// POST /doctor/register (Legacy/Email)
router.post('/register', handleRegister);

// POST /doctor/login (Legacy/Email)
router.post('/login', handleLogin);

// POST /doctor/upload-csv (Upload Verification Dataset)
router.post('/upload-csv', upload.single('file'), handleUploadCsv);

// POST /doctor/onboard (New Flow: Phone OTP + Registration Number + Photo)
router.post('/onboard', upload.single('photo'), handleOnboard);

// GET /doctor/stats
router.get('/stats', requireDoctorAuth, handleGetStats);

export default router;
