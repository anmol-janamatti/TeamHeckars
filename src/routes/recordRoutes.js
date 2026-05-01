import { Router } from 'express';
import multer from 'multer';
import { handleUploadRecord, handleGetRecords, handleGetFile, handleUpdateRecord, handleDeleteRecord } from '../controllers/recordController.js';
import { requireDoctorAuth, requireAuth } from '../middleware/authMiddleware.js';
import { requireConsent } from '../middleware/consentMiddleware.js';

// ─── Multer Configuration (Memory Storage — files never hit disk) ────
const storage = multer.memoryStorage();

const fileFilter = (_req, file, cb) => {
  const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF, PNG, and JPEG files are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

const router = Router();

// POST /records/upload (doctor auth + optional file upload)
router.post('/upload', requireDoctorAuth, upload.single('file'), handleUploadRecord);

// PUT /records/:id (doctor auth)
router.put('/:id', requireDoctorAuth, handleUpdateRecord);

// DELETE /records/:id (doctor auth)
router.delete('/:id', requireDoctorAuth, handleDeleteRecord);

// GET /records/file/:recordId (auth + consent required — serves decrypted file)
router.get('/file/:recordId', requireAuth, requireConsent, handleGetFile);

// GET /records/:patientId (auth + consent required)
router.get('/:patientId', requireAuth, requireConsent, handleGetRecords);

export default router;
