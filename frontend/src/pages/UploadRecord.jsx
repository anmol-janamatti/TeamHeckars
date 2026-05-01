import { useState, useRef } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { Upload, Plus, X, Check, Phone, Lock, Send, ArrowRight, Search } from 'lucide-react';

export default function UploadRecord() {
  // Consent state
  const [consentStep, setConsentStep] = useState('search'); // search | otp-sent | consented
  const [searchPhone, setSearchPhone] = useState('');
  const [patient, setPatient] = useState(null);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const otpRefs = useRef([]);

  // Form state
  const [form, setForm] = useState({ diagnosis: '', notes: '' });
  const [medications, setMedications] = useState([]);
  const [allergies, setAllergies] = useState([]);
  const [medInput, setMedInput] = useState('');
  const [allergyInput, setAllergyInput] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const addMed = () => { if (medInput.trim()) { setMedications([...medications, medInput.trim()]); setMedInput(''); } };
  const addAllergy = () => { if (allergyInput.trim()) { setAllergies([...allergies, allergyInput.trim()]); setAllergyInput(''); } };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchPhone.trim()) return toast.error('Enter phone number');
    setLoading(true);
    try {
      const res = await api.searchPatient(searchPhone.trim());
      setPatient(res.data.patient);
      toast.success(`Found: ${res.data.patient.name}`);
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
      localStorage.setItem('consentToken', res.data.consentToken);
      setConsentStep('consented');
      toast.success('Consent granted — you can now upload records');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.diagnosis) return toast.error('Diagnosis required');
    setLoading(true);
    try {
      let res;
      if (file) {
        const fd = new FormData();
        fd.append('phoneNumber', patient.phoneNumber);
        fd.append('diagnosis', form.diagnosis);
        fd.append('medications', JSON.stringify(medications));
        fd.append('allergies', JSON.stringify(allergies));
        fd.append('notes', form.notes);
        fd.append('file', file);
        res = await api.uploadRecord(fd);
      } else {
        res = await api.uploadRecordJson({ phoneNumber: patient.phoneNumber, diagnosis: form.diagnosis, medications, allergies, notes: form.notes });
      }
      setResult(res.data.record);
      toast.success('Record uploaded');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Success state
  if (result) {
    return (
      <div className="fade-in">
        <div className="page-header"><h1>Record Uploaded</h1><p>Medical record stored securely</p></div>
        <div className="card" style={{ maxWidth: 560 }}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}><Check size={36} color="var(--green)" /></div>
          <div className="form-group"><label>Record ID</label><div className="hash-display">{result.id}</div></div>
          <div className="form-group"><label>Diagnosis</label><p>{result.diagnosis}</p></div>
          <div className="form-group"><label>SHA-256 Hash</label><div className="hash-display">{result.hash}</div></div>
          <div className="form-group"><label>Patient</label><p>{result.patient?.name} ({result.patient?.phoneNumber})</p></div>
          <button className="btn btn-secondary btn-block" onClick={() => { setResult(null); setForm({ diagnosis: '', notes: '' }); setMedications([]); setAllergies([]); setFile(null); setConsentStep('search'); setPatient(null); setSearchPhone(''); setOtp(['','','','','','']); localStorage.removeItem('consentToken'); }}>Upload for Another Patient</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="page-header"><h1>Upload Record</h1><p>Search patient, get consent, then upload</p></div>

      {/* Step 1: Search Patient */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Step 1 — Find Patient</h3>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Phone size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="form-input" placeholder="+919876543210" value={searchPhone} onChange={e => setSearchPhone(e.target.value)} style={{ paddingLeft: 34 }} disabled={consentStep !== 'search'} />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading || consentStep !== 'search'}>
            <Search size={14} /> Search
          </button>
        </form>
        {patient && (
          <div style={{ marginTop: 12, padding: '10px 12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: 13 }}>
            <strong>{patient.name}</strong> · {patient.phoneNumber} · Age {patient.age || '—'}
          </div>
        )}
      </div>

      {/* Step 2: Consent */}
      {patient && consentStep === 'search' && (
        <div className="card" style={{ marginBottom: 20, textAlign: 'center', padding: 32 }}>
          <Lock size={24} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
          <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>Step 2 — Patient Consent</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 20 }}>
            OTP will be sent to {patient.phoneNumber}
          </p>
          <button className="btn btn-primary" onClick={handleRequestConsent} disabled={loading}>
            <Send size={14} /> {loading ? 'Sending...' : 'Send Consent OTP'}
          </button>
        </div>
      )}

      {patient && consentStep === 'otp-sent' && (
        <div className="card" style={{ marginBottom: 20, maxWidth: 440, margin: '0 auto 20px' }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>Step 2 — Enter Patient OTP</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: 12, textAlign: 'center', marginBottom: 12 }}>Ask patient for the OTP sent to {patient.phoneNumber}</p>
          <form onSubmit={handleVerifyConsent}>
            <div className="otp-inputs">
              {otp.map((digit, i) => (
                <input key={i} ref={el => otpRefs.current[i] = el} type="text" maxLength={1} value={digit} onChange={e => handleOtpChange(i, e.target.value)} onKeyDown={e => handleOtpKeyDown(i, e)} autoFocus={i === 0} />
              ))}
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={loading} style={{ marginTop: 8 }}>
              <ArrowRight size={14} /> {loading ? 'Verifying...' : 'Verify Consent'}
            </button>
          </form>
        </div>
      )}

      {/* Step 3: Upload Form (after consent) */}
      {consentStep === 'consented' && (
        <div className="card" style={{ maxWidth: 640 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Step 3 — Medical Record</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group"><label>Diagnosis</label><input name="diagnosis" className="form-input" placeholder="e.g., Type 2 Diabetes" value={form.diagnosis} onChange={handleChange} required /></div>
            <div className="form-group">
              <label>Medications</label>
              <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                <input className="form-input" placeholder="e.g., Metformin 500mg" value={medInput} onChange={e => setMedInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addMed(); } }} />
                <button type="button" className="btn btn-secondary btn-sm" onClick={addMed}><Plus size={14} /></button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {medications.map((m, i) => <span key={i} className="badge badge-blue" style={{ cursor: 'pointer' }} onClick={() => setMedications(medications.filter((_, j) => j !== i))}>{m} <X size={10} /></span>)}
              </div>
            </div>
            <div className="form-group">
              <label>Allergies</label>
              <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                <input className="form-input" placeholder="e.g., Penicillin" value={allergyInput} onChange={e => setAllergyInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addAllergy(); } }} />
                <button type="button" className="btn btn-secondary btn-sm" onClick={addAllergy}><Plus size={14} /></button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {allergies.map((a, i) => <span key={i} className="badge badge-red" style={{ cursor: 'pointer' }} onClick={() => setAllergies(allergies.filter((_, j) => j !== i))}>{a} <X size={10} /></span>)}
              </div>
            </div>
            <div className="form-group"><label>Notes</label><textarea name="notes" className="form-input" placeholder="Clinical notes..." value={form.notes} onChange={handleChange} /></div>
            <div className="form-group"><label>Attachment (PDF, PNG, JPEG)</label><input type="file" className="form-input" accept=".pdf,.png,.jpg,.jpeg" onChange={e => setFile(e.target.files[0])} style={{ padding: 8 }} /></div>
            <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}><Upload size={16} /> {loading ? 'Uploading...' : 'Upload Record'}</button>
          </form>
        </div>
      )}
    </div>
  );
}
