import { verifyToken } from '../services/tokenService.js';
import { error } from '../utils/apiResponse.js';

/**
 * Middleware: Require a valid doctor JWT.
 * Attaches decoded doctor payload to req.doctor.
 */
export const requireDoctorAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return error(res, 'Access denied. No token provided.', 401);
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyToken(token);

    if (decoded.role !== 'doctor') {
      return error(res, 'Access denied. Doctor authentication required.', 403);
    }

    req.doctor = decoded;
    next();
  } catch (err) {
    return error(res, 'Invalid or expired token.', 401);
  }
};

/**
 * Middleware: Require a valid patient JWT.
 * Attaches decoded patient payload to req.patient.
 */
export const requirePatientAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return error(res, 'Access denied. No token provided.', 401);
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyToken(token);

    if (decoded.role !== 'patient') {
      return error(res, 'Access denied. Patient authentication required.', 403);
    }

    req.patient = decoded;
    next();
  } catch (err) {
    return error(res, 'Invalid or expired token.', 401);
  }
};

/**
 * Middleware: Require any valid JWT (doctor or patient).
 * Attaches decoded payload to req.user.
 */
export const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return error(res, 'Access denied. No token provided.', 401);
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    return error(res, 'Invalid or expired token.', 401);
  }
};
