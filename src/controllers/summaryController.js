import prisma from '../utils/prismaClient.js';
import { summarizeRecords } from '../services/summaryService.js';
import { success, error } from '../utils/apiResponse.js';

/**
 * GET /summary/:patientId
 * Generate an AI-powered emergency summary of a patient's medical records.
 * Query params:
 *   - type: 'emergency' (default) | 'detailed'
 */
export const handleGetSummary = async (req, res, next) => {
  try {
    let { patientId } = req.params;
    const type = req.query.type || 'emergency';

    if (!['emergency', 'detailed'].includes(type)) {
      return error(res, 'Invalid summary type. Use "emergency" or "detailed".', 400);
    }

    // Resolve patient by phone number or UUID
    let patient;
    if (patientId.startsWith('+') || /^\d{10,}$/.test(patientId)) {
      if (!patientId.startsWith('+')) patientId = '+91' + patientId;
      patient = await prisma.patient.findUnique({ where: { phoneNumber: patientId } });
    } else {
      patient = await prisma.patient.findUnique({ where: { id: patientId } });
    }

    if (!patient) {
      return error(res, 'Patient not found.', 404);
    }

    // Fetch all medical records with doctor info AND file data for AI analysis
    const records = await prisma.medicalRecord.findMany({
      where: { patientId: patient.id },
      orderBy: { createdAt: 'desc' },
      include: {
        doctor: {
          select: { name: true, hospitalName: true },
        },
      },
    });

    // Generate AI summary
    const summary = await summarizeRecords(records, patient, type);

    return success(res, `${type === 'emergency' ? 'Emergency' : 'Detailed'} summary generated.`, {
      patient: {
        id: patient.id,
        name: patient.name,
        age: patient.age,
        gender: patient.gender,
      },
      summaryType: type,
      recordCount: records.length,
      summary,
    });
  } catch (err) {
    next(err);
  }
};
