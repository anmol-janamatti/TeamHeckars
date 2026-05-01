import { Router } from 'express';
import { handleGetSummary } from '../controllers/summaryController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

// GET /summary/:patientId?type=emergency|detailed
router.get('/:patientId', requireAuth, handleGetSummary);

export default router;
