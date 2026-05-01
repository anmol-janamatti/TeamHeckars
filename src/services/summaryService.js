import config from '../config/index.js';
import { decryptFile } from './encryptionService.js';
import { PDFParse } from 'pdf-parse';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

/**
 * Build the system prompt for medical summarization.
 */
const buildSystemPrompt = (type, hasFiles) => {
  const fileContext = hasFiles
    ? '\nYou will also receive attached medical documents (lab reports, prescriptions, X-rays, scans). Analyze ALL attached files carefully and incorporate their findings into your summary. Reference specific values, readings, or observations from the documents.'
    : '';

  if (type === 'emergency') {
    return `You are an emergency medicine AI assistant. A doctor needs critical patient information IMMEDIATELY.
Analyze the patient's medical records${hasFiles ? ' and attached documents' : ''} and return a JSON object with ONLY the most critical, life-threatening information.
${fileContext}
Return EXACTLY this JSON structure (no markdown, no code fences, just raw JSON):
{
  "criticalAllergies": ["list of drug/food allergies that could cause anaphylaxis or severe reactions"],
  "activeMedications": ["list of current medications with dosages"],
  "recentDiagnoses": ["list of recent diagnoses, most critical first"],
  "riskFlags": ["drug interactions, contraindications, or conditions that affect emergency treatment"],
  "quickSummary": "One paragraph emergency overview of this patient",
  "emergencyNotes": "Critical warnings for the treating doctor"${hasFiles ? ',\n  "documentFindings": "Key findings from attached reports/scans that are clinically relevant"' : ''}
}

Be concise. Focus on what could KILL the patient or cause serious harm if missed.`;
  }

  return `You are a clinical AI assistant helping a doctor review a patient's complete medical history.
Analyze all medical records${hasFiles ? ' and attached documents' : ''} and provide a comprehensive clinical summary.
${fileContext}
Return EXACTLY this JSON structure (no markdown, no code fences, just raw JSON):
{
  "criticalAllergies": ["all known allergies"],
  "activeMedications": ["all current medications with dosages and purposes"],
  "recentDiagnoses": ["all diagnoses ordered by recency"],
  "chronicConditions": ["ongoing/chronic conditions"],
  "riskFlags": ["drug interactions, contraindications, genetic risks"],
  "surgicalHistory": ["past surgeries or procedures mentioned"],
  "quickSummary": "Comprehensive 2-3 paragraph clinical overview",
  "recommendations": "Clinical recommendations based on the records"${hasFiles ? ',\n  "documentFindings": "Detailed findings from all attached reports, lab values, imaging results"' : ''}
}`;
};

/**
 * Extract text content from an encrypted PDF.
 */
const extractPdfText = async (encryptedFile, fileIv, fileAuthTag) => {
  try {
    const decryptedBuffer = decryptFile(encryptedFile, fileIv, fileAuthTag);
    const parser = new PDFParse({ data: new Uint8Array(decryptedBuffer) });
    await parser.load();
    const pages = await parser.getText();
    const text = (Array.isArray(pages) ? pages.join('\n') : String(pages)).trim();

    if (text && text.length > 10) {
      return text.length > 3000 ? text.slice(0, 3000) + '...[truncated]' : text;
    }
    return null;
  } catch (err) {
    console.warn('⚠️  PDF text extraction failed:', err.message);
    return null;
  }
};

/**
 * Convert an encrypted image to a base64 data URL for the vision API.
 * @param {Buffer} encryptedFile - Encrypted file bytes
 * @param {string} fileIv - IV hex string
 * @param {string} fileAuthTag - Auth tag hex string
 * @param {string} mimeType - MIME type (image/jpeg, image/png)
 * @returns {string|null} Base64 data URL, or null on failure
 */
const decryptToBase64 = (encryptedFile, fileIv, fileAuthTag, mimeType) => {
  try {
    const decryptedBuffer = decryptFile(encryptedFile, fileIv, fileAuthTag);
    // Groq limit: 4MB for base64 images
    if (decryptedBuffer.length > 4 * 1024 * 1024) {
      console.warn('⚠️  Image too large for vision API (>4MB), skipping');
      return null;
    }
    return `data:${mimeType};base64,${decryptedBuffer.toString('base64')}`;
  } catch (err) {
    console.warn('⚠️  Image decryption failed:', err.message);
    return null;
  }
};

/**
 * Format medical records into a readable text block for the AI prompt.
 * Now includes extracted PDF text when available.
 */
const formatRecordsForPrompt = (records, patient, pdfTexts = {}) => {
  let text = `PATIENT: ${patient.name}, Age: ${patient.age || 'Unknown'}, Gender: ${patient.gender || 'Unknown'}\n`;
  text += `Phone: ${patient.phoneNumber}\n`;
  text += `Total Records: ${records.length}\n\n`;

  records.forEach((record, i) => {
    text += `--- RECORD ${i + 1} (${new Date(record.createdAt).toLocaleDateString()}) ---\n`;
    text += `Diagnosis: ${record.diagnosis}\n`;
    text += `Medications: ${JSON.stringify(record.medications)}\n`;
    text += `Allergies: ${JSON.stringify(record.allergies)}\n`;
    if (record.notes) text += `Notes: ${record.notes}\n`;
    if (record.doctor) text += `Doctor: ${record.doctor.name} (${record.doctor.hospitalName})\n`;

    // Include extracted PDF text
    if (pdfTexts[record.id]) {
      text += `\n📄 ATTACHED DOCUMENT (${record.fileName}):\n`;
      text += pdfTexts[record.id] + '\n';
    } else if (record.fileName && record.fileMimeType?.startsWith('image/')) {
      text += `🖼️  Attached image: ${record.fileName} (analyzed via vision)\n`;
    }

    text += '\n';
  });

  return text;
};

/**
 * Generate a fallback summary when the AI API is unavailable.
 */
const generateFallbackSummary = (records, patient) => {
  const allMedications = [...new Set(records.flatMap((r) => r.medications || []))];
  const allAllergies = [...new Set(records.flatMap((r) => r.allergies || []))];
  const allDiagnoses = records.map((r) => r.diagnosis).filter(Boolean);

  return {
    criticalAllergies: allAllergies,
    activeMedications: allMedications,
    recentDiagnoses: allDiagnoses,
    riskFlags: ['⚠️ AI summarization unavailable — this is a raw aggregation of records'],
    quickSummary: `Patient ${patient.name} has ${records.length} medical record(s) on file. Manual review recommended.`,
    emergencyNotes: 'AI service unavailable. Please review records manually.',
    _fallback: true,
  };
};

/**
 * Summarize a patient's medical records using Groq AI.
 * Now supports PDF text extraction and image vision analysis.
 *
 * @param {Array} records - Array of MedicalRecord objects (with doctor + file fields)
 * @param {Object} patient - Patient object
 * @param {string} type - 'emergency' or 'detailed'
 * @returns {Object} Structured summary JSON
 */
export const summarizeRecords = async (records, patient, type = 'emergency') => {
  if (!records || records.length === 0) {
    return {
      criticalAllergies: [],
      activeMedications: [],
      recentDiagnoses: [],
      riskFlags: [],
      quickSummary: 'No medical records found for this patient.',
      emergencyNotes: 'No records available.',
    };
  }

  if (!config.groqApiKey) {
    console.warn('⚠️  GROQ_API_KEY not set — returning fallback summary');
    return generateFallbackSummary(records, patient);
  }

  // ─── Process attached files ────────────────────────────────
  const pdfTexts = {};       // recordId → extracted text
  const imageContents = [];  // { recordId, base64Url, fileName }
  let hasFiles = false;

  for (const record of records) {
    if (!record.encryptedFile || !record.fileIv || !record.fileAuthTag) continue;
    hasFiles = true;

    if (record.fileMimeType === 'application/pdf') {
      // Extract text from PDF
      const text = await extractPdfText(record.encryptedFile, record.fileIv, record.fileAuthTag);
      if (text) {
        pdfTexts[record.id] = text;
        console.log(`📄 Extracted ${text.length} chars from PDF: ${record.fileName}`);
      }
    } else if (record.fileMimeType?.startsWith('image/')) {
      // Prepare image for vision API (max 5 images)
      if (imageContents.length < 5) {
        const base64Url = decryptToBase64(record.encryptedFile, record.fileIv, record.fileAuthTag, record.fileMimeType);
        if (base64Url) {
          imageContents.push({ recordId: record.id, base64Url, fileName: record.fileName });
          console.log(`🖼️  Prepared image for vision: ${record.fileName}`);
        }
      }
    }
  }

  const hasPdfText = Object.keys(pdfTexts).length > 0;
  const hasImages = imageContents.length > 0;
  const useVisionModel = hasImages;

  console.log(`🤖 AI Summary: ${records.length} records, ${Object.keys(pdfTexts).length} PDFs extracted, ${imageContents.length} images → ${useVisionModel ? 'Vision model' : 'Text model'}`);

  // ─── Build prompt ──────────────────────────────────────────
  const systemPrompt = buildSystemPrompt(type, hasFiles);
  const userText = formatRecordsForPrompt(records, patient, pdfTexts);

  // ─── Build messages ────────────────────────────────────────
  const messages = [
    { role: 'system', content: systemPrompt },
  ];

  if (useVisionModel) {
    // Multi-modal message: text + images
    const userContent = [
      { type: 'text', text: userText },
    ];

    // Add each image
    for (const img of imageContents) {
      userContent.push({
        type: 'image_url',
        image_url: { url: img.base64Url },
      });
      userContent.push({
        type: 'text',
        text: `[Above image is: ${img.fileName}]`,
      });
    }

    messages.push({ role: 'user', content: userContent });
  } else {
    // Text-only message
    messages.push({ role: 'user', content: userText });
  }

  // ─── Call Groq API ─────────────────────────────────────────
  const model = useVisionModel ? config.groqVisionModel : config.groqModel;

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.groqApiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.2,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error(`❌ Groq API error (${response.status}):`, errBody);
      return generateFallbackSummary(records, patient);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error('❌ Groq returned empty content');
      return generateFallbackSummary(records, patient);
    }

    const summary = JSON.parse(content);
    summary._model = model;
    summary._type = type;
    summary._filesAnalyzed = {
      pdfsExtracted: Object.keys(pdfTexts).length,
      imagesAnalyzed: imageContents.length,
    };
    return summary;
  } catch (err) {
    console.error('❌ AI summarization failed:', err.message);
    return generateFallbackSummary(records, patient);
  }
};
