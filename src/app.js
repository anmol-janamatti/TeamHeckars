import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

import authRoutes from './routes/authRoutes.js';
import doctorRoutes from './routes/doctorRoutes.js';
import patientRoutes from './routes/patientRoutes.js';
import recordRoutes from './routes/recordRoutes.js';
import summaryRoutes from './routes/summaryRoutes.js';
import consentRoutes from './routes/consentRoutes.js';
import errorHandler from './middleware/errorHandler.js';

const app = express();

// ─── Global Middleware ───────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// ─── Note: File uploads are encrypted and stored in DB ───────
// Files are served via /api/records/file/:recordId (auth required)
app.use('/uploads', express.static('uploads'));

// ─── Health Check ────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({
    success: true,
    message: '🏥 HealthTech MVP — Unified Health Record Access System',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth/send-otp, /api/auth/verify-otp',
      patient: '/api/patient/create, /api/patient/profile',
      doctor: '/api/doctor/register, /api/doctor/login',
      records: '/api/records/upload, /api/records/:patientId',
      summary: '/api/summary/:patientId',
      consent: '/api/consent/search/:phone, /api/consent/request, /api/consent/verify',
    },
  });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── API Routes ──────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/doctor', doctorRoutes);
app.use('/api/patient', patientRoutes);
app.use('/api/records', recordRoutes);
app.use('/api/summary', summaryRoutes);
app.use('/api/consent', consentRoutes);

// ─── 404 Handler ─────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found.',
  });
});

// ─── Error Handler ───────────────────────────────────────────
app.use(errorHandler);

export default app;
