import { useState, useRef } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { Search, Shield, Phone, Lock, Send, ArrowRight, CheckCircle, Download, Paperclip } from 'lucide-react';

export default function PatientRecords() {
  const [phone, setPhone] = useState('');
  const [patient, setPatient] = useState(null);
  const [recordCount, setRecordCount] = useState(0);
  const [records, setRecords] = useState(null);
  const [loading, setLoading] = useState(false);

  // Consent state
  const [consentStep, setConsentStep] = useState('none'); // none | otp-sent | verified
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const otpRefs = useRef([]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!phone.trim()) return toast.error('Enter a phone number');
    setLoading(true);
    setPatient(null);
    setRecords(null);
    setConsentStep('none');
    try {
      const res = await api.searchPatient(phone.trim());
      setPatient(res.data.patient);
      setRecordCount(res.data.recordCount);
      toast.success('Patient found');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestConsent = async () => {
    setLoading(true);
    try {
      await api.requestConsent(patient.phoneNumber);
      setConsentStep('otp-sent');
      toast.success('OTP sent to patient');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (value.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) otpRefs.current[index - 1]?.focus();
  };

  const handleVerifyConsent = async (e) => {
    e.preventDefault();
    const otpCode = otp.join('');
    if (otpCode.length !== 6) return toast.error('Enter 6-digit OTP');
    setLoading(true);
    try {
      const res = await api.verifyConsent(patient.phoneNumber, otpCode);
      // Store consent token
      localStorage.setItem('consentToken', res.data.consentToken);
      localStorage.setItem('consentPatientPhone', patient.phoneNumber);
      setConsentStep('verified');
      toast.success('Consent granted');

      // Now fetch records
      const recRes = await api.getRecords(patient.phoneNumber);
      setRecords(recRes.data.records);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadFile = async (recordId, fileName) => {
    try {
      const res = await api.downloadFile(recordId);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || 'download';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleViewFile = async (recordId) => {
    try {
      const res = await api.downloadFile(recordId);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>Patient Records</h1>
        <p>Search patient by phone number, then request consent to view records</p>
      </div>

      {/* Search */}
      <div className="card" style={{ marginBottom: 20 }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Phone size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="form-input" placeholder="+919876543210" value={phone} onChange={e => setPhone(e.target.value)} style={{ paddingLeft: 34 }} />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            <Search size={14} /> Search
          </button>
        </form>
      </div>

      {/* Patient Profile (no consent needed) */}
      {patient && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 2 }}>{patient.name}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                {patient.phoneNumber} · Age {patient.age || '—'} · {patient.gender || '—'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className="badge badge-neutral">{recordCount} records</span>
              {consentStep === 'verified' && <span className="badge badge-green"><CheckCircle size={10} /> Consent granted</span>}
            </div>
          </div>
        </div>
      )}

      {/* Consent Flow */}
      {patient && consentStep === 'none' && (
        <div className="card" style={{ marginBottom: 20, textAlign: 'center', padding: 32 }}>
          <Lock size={24} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Patient Consent Required</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 20, maxWidth: 400, margin: '0 auto 20px' }}>
            To view or upload medical records, you need the patient&apos;s consent. An OTP will be sent to their phone.
          </p>
          <button className="btn btn-primary" onClick={handleRequestConsent} disabled={loading}>
            <Send size={14} /> {loading ? 'Sending...' : 'Request Consent OTP'}
          </button>
        </div>
      )}

      {/* OTP Entry */}
      {patient && consentStep === 'otp-sent' && (
        <div className="card" style={{ marginBottom: 20, maxWidth: 440, margin: '0 auto 20px' }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4, textAlign: 'center' }}>Enter Patient OTP</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: 12, textAlign: 'center', marginBottom: 16 }}>
            Ask the patient to share the 6-digit OTP sent to {patient.phoneNumber}
          </p>
          <form onSubmit={handleVerifyConsent}>
            <div className="otp-inputs">
              {otp.map((digit, i) => (
                <input key={i} ref={el => otpRefs.current[i] = el} type="text" maxLength={1} value={digit} onChange={e => handleOtpChange(i, e.target.value)} onKeyDown={e => handleOtpKeyDown(i, e)} autoFocus={i === 0} />
              ))}
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={loading} style={{ marginTop: 8 }}>
              <ArrowRight size={14} /> {loading ? 'Verifying...' : 'Verify & View Records'}
            </button>
          </form>
        </div>
      )}

      {/* Records Table (after consent) */}
      {records && (
        <>
          {records.length === 0 ? (
            <div className="empty-state"><p>No records found</p></div>
          ) : (
            <div className="card">
              <div className="table-container">
                <table>
                  <thead>
                    <tr><th>Date</th><th>Diagnosis</th><th>Doctor</th><th>Medications</th><th>Allergies</th><th>File</th><th>Hash</th></tr>
                  </thead>
                  <tbody>
                    {records.map(rec => (
                      <tr key={rec.id}>
                        <td style={{ whiteSpace: 'nowrap' }}>{new Date(rec.createdAt).toLocaleDateString()}</td>
                        <td style={{ fontWeight: 500, color: 'var(--text)' }}>{rec.diagnosis}</td>
                        <td>{rec.doctor?.name}<br/><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{rec.doctor?.hospitalName}</span></td>
                        <td><div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>{(rec.medications || []).map((m, i) => <span key={i} className="badge badge-blue">{m}</span>)}</div></td>
                        <td><div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>{(rec.allergies || []).map((a, i) => <span key={i} className="badge badge-red">{a}</span>)}</div></td>
                        <td>
                          {rec.hasFile ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <button className="btn btn-secondary btn-sm" onClick={() => handleViewFile(rec.id)} title="View file" style={{ padding: '4px 8px', fontSize: 11 }}>
                                <Paperclip size={12} /> View
                              </button>
                              <button className="btn btn-secondary btn-sm" onClick={() => handleDownloadFile(rec.id, rec.fileName)} title="Download file" style={{ padding: '4px 8px', fontSize: 11 }}>
                                <Download size={12} />
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>
                          )}
                        </td>
                        <td><div className="hash-display" title={rec.hash}><Shield size={10} style={{ display: 'inline', marginRight: 3 }} />{rec.hash?.slice(0, 12)}...</div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
