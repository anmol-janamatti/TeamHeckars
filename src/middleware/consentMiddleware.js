import { verifyToken } from '../services/tokenService.js';
import { error } from '../utils/apiResponse.js';

/**
 * Consent Middleware:
 * - Patients: access their own records freely
 * - Doctors: MUST provide x-consent-token (obtained via patient OTP)
 */
export const requireConsent = (req, res, next) => {
  const consentToken = req.headers['x-consent-token'];

  // Patients access their own records
  if (req.patient || req.user?.role === 'patient') {
    return next();
  }

  // Doctors must have a valid consent token
  if (req.doctor || req.user?.role === 'doctor') {
    if (!consentToken) {
      return error(res, 'Patient consent required. Request OTP from patient first.', 403);
    }

    try {
      const decoded = verifyToken(consentToken);

      if (decoded.role !== 'patient') {
        return error(res, 'Invalid consent token.', 403);
      }

      req.consentPatientId = decoded.id;
      return next();
    } catch (err) {
      return error(res, 'Consent token expired. Request a new OTP from patient.', 403);
    }
  }

  return error(res, 'Authentication required.', 401);
};
