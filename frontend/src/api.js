const API_BASE = import.meta.env.VITE_API_URL || '/api';

const getHeaders = (isFormData = false) => {
  const headers = {};
  if (!isFormData) headers['Content-Type'] = 'application/json';

  const token = localStorage.getItem('token');
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const consentToken = localStorage.getItem('consentToken');
  if (consentToken) headers['x-consent-token'] = consentToken;

  return headers;
};

const handleResponse = async (res) => {
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Something went wrong');
  return data;
};

const api = {
  // Auth
  sendOtp: (phoneNumber) =>
    fetch(`${API_BASE}/auth/send-otp`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ phoneNumber }) }).then(handleResponse),

  verifyOtp: (phoneNumber, otp) =>
    fetch(`${API_BASE}/auth/verify-otp`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ phoneNumber, otp }) }).then(handleResponse),

  // Patient
  createPatient: (data) =>
    fetch(`${API_BASE}/patient/create`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) }).then(handleResponse),

  getPatientProfile: () =>
    fetch(`${API_BASE}/patient/profile`, { headers: getHeaders() }).then(handleResponse),

  getAccessLogs: () =>
    fetch(`${API_BASE}/patient/access-logs`, { headers: getHeaders() }).then(handleResponse),

  // Doctor
  registerDoctor: (data) =>
    fetch(`${API_BASE}/doctor/register`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) }).then(handleResponse),

  loginDoctor: (email, password) =>
    fetch(`${API_BASE}/doctor/login`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ email, password }) }).then(handleResponse),

  onboardDoctor: (formData) =>
    fetch(`${API_BASE}/doctor/onboard`, { method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }, body: formData }).then(handleResponse),

  getDoctorStats: () =>
    fetch(`${API_BASE}/doctor/stats`, { headers: getHeaders() }).then(handleResponse),

  // Consent
  searchPatient: (phone) =>
    fetch(`${API_BASE}/consent/search/${encodeURIComponent(phone)}`, { headers: getHeaders() }).then(handleResponse),

  requestConsent: (phoneNumber) =>
    fetch(`${API_BASE}/consent/request`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ phoneNumber }) }).then(handleResponse),

  verifyConsent: (phoneNumber, otp) =>
    fetch(`${API_BASE}/consent/verify`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ phoneNumber, otp }) }).then(handleResponse),

  // Records
  uploadRecord: (formData) =>
    fetch(`${API_BASE}/records/upload`, { method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, 'x-consent-token': localStorage.getItem('consentToken') || '' }, body: formData }).then(handleResponse),

  uploadRecordJson: (data) =>
    fetch(`${API_BASE}/records/upload`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) }).then(handleResponse),

  getRecords: (patientId) =>
    fetch(`${API_BASE}/records/${encodeURIComponent(patientId)}`, { headers: getHeaders() }).then(handleResponse),

  updateRecord: (id, data) =>
    fetch(`${API_BASE}/records/${encodeURIComponent(id)}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) }).then(handleResponse),

  deleteRecord: (id) =>
    fetch(`${API_BASE}/records/${encodeURIComponent(id)}`, { method: 'DELETE', headers: getHeaders() }).then(handleResponse),

  // Summary
  getSummary: (patientId, type = 'emergency') =>
    fetch(`${API_BASE}/summary/${encodeURIComponent(patientId)}?type=${type}`, { headers: getHeaders() }).then(handleResponse),

  // QR Codes
  getQrToken: () => fetch(`${API_BASE}/patient/qr-token`, { headers: getHeaders() }).then(handleResponse),
  verifyQr: (token) => fetch(`${API_BASE}/auth/verify-qr`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getHeaders() },
    body: JSON.stringify({ token }),
  }).then(handleResponse),

  // File Download (returns blob for rendering/downloading)
  getFileUrl: (recordId) => `${API_BASE}/records/file/${encodeURIComponent(recordId)}`,

  downloadFile: async (recordId) => {
    const res = await fetch(`${API_BASE}/records/file/${encodeURIComponent(recordId)}`, {
      headers: getHeaders(),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({ message: 'Download failed' }));
      throw new Error(data.message || 'Download failed');
    }
    return res;
  },
};

export default api;
