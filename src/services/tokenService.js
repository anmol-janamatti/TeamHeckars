import jwt from 'jsonwebtoken';
import config from '../config/index.js';

/**
 * Generate a JWT for a doctor.
 */
export const signDoctorToken = (doctor) => {
  const payload = {
    id: doctor.id,
    email: doctor.email,
    hospitalName: doctor.hospitalName,
    role: 'doctor',
  };
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
};

/**
 * Generate a short-lived JWT for a patient (after OTP verification).
 */
export const signPatientToken = (patient) => {
  const payload = {
    id: patient.id,
    phoneNumber: patient.phoneNumber,
    role: 'patient',
  };
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.patientJwtExpiresIn });
};

/**
 * Verify and decode a JWT.
 */
export const verifyToken = (token) => {
  return jwt.verify(token, config.jwtSecret);
};
