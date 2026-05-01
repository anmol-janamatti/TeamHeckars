import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api';
import toast from 'react-hot-toast';
import { Search, Shield, Phone, Lock, Send, ArrowRight, CheckCircle, FileText, Upload, Brain, Calendar, Building2, Stethoscope, AlertTriangle, Pill, ShieldAlert, Plus, X, Download, Paperclip, QrCode } from 'lucide-react';

export default function PatientWorkspace() {
  const [searchParams, setSearchParams] = useSearchParams();
  const phoneParam = searchParams.get('phone') || '';

  const [phone, setPhone] = useState(phoneParam);
  const [patient, setPatient] = useState(null);
  const [recordCount, setRecordCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Consent
  const [consentStep, setConsentStep] = useState('none'); // none | otp-sent | verified
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const otpRefs = useRef([]);

  // Workspace state
  const [activeTab, setActiveTab] = useState('records'); // records | upload | summary
  const [recordsData, setRecordsData] = useState(null);
  
  // AI Summary State
  const [summaryType, setSummaryType] = useState('emergency');
  const [summaryData, setSummaryData] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Upload State
  const [uploadForm, setUploadForm] = useState({ diagnosis: '', notes: '' });
  const [medications, setMedications] = useState([]);
  const [allergies, setAllergies] = useState([]);
  const [medInput, setMedInput] = useState('');
  const [allergyInput, setAllergyInput] = useState('');
  const [file, setFile] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);

  // Scanner State
  const [showScanner, setShowScanner] = useState(false);
  const scannerRef = useRef(null);

  useEffect(() => {
    if (phoneParam) {
      handleSearch(null, phoneParam);
    }
  }, []);

  const handleScanSuccess = async (decodedText) => {
    try {
      setShowScanner(false);
      if (scannerRef.current) scannerRef.current.clear();
      
      const res = await api.verifyQr(decodedText);
      const scannedPhone = res.data.phoneNumber;
      setPhone(scannedPhone);
      toast.success(res.message); // "QR valid. OTP sent."
      
      // Look up patient
      const pRes = await api.searchPatient(scannedPhone);
      setPatient(pRes.data.patient);
      setRecordCount(pRes.data.recordCount);
      setSearchParams({ phone: scannedPhone });
      
      // Auto-move to consent step since OTP is already sent
      setConsentStep('verify');
    } catch (err) {
      toast.error(err.message || 'Invalid QR code');
    }
  };

  const toggleScanner = async () => {
    if (showScanner) {
      setShowScanner(false);
      if (scannerRef.current) scannerRef.current.clear();
    } else {
      setShowScanner(true);
      // Initialize scanner after render
      setTimeout(async () => {
        const { Html5QrcodeScanner } = await import('html5-qrcode');
        const scanner = new Html5QrcodeScanner('reader', { fps: 10, qrbox: { width: 250, height: 250 } }, false);
        scannerRef.current = scanner;
        scanner.render(handleScanSuccess, () => {});
      }, 100);
    }
  };

  const handleSearch = async (e, forcePhone = null) => {
    if (e) e.preventDefault();
    const searchVal = forcePhone || phone;
    if (!searchVal.trim()) return toast.error('Enter a phone number');
    setLoading(true);
    setPatient(null);
    setConsentStep('none');
    setRecordsData(null);
    setSummaryData(null);
    try {
      const res = await api.searchPatient(searchVal.trim());
      setPatient(res.data.patient);
      setRecordCount(res.data.recordCount);
      setSearchParams({ phone: searchVal.trim() });
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

  const handleVerifyConsent = async (e) => {
    e.preventDefault();
    const otpCode = otp.join('');
    if (otpCode.length !== 6) return toast.error('Enter 6-digit OTP');
    setLoading(true);
    try {
      const res = await api.verifyConsent(patient.phoneNumber, otpCode);
      localStorage.setItem('consentToken', res.data.consentToken);
      setConsentStep('verified');
      toast.success('Workspace Unlocked');
      fetchRecords(); // load initial data
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await api.getRecords(patient.phoneNumber);
      setRecordsData(res.data.records);
    } catch (err) {
      toast.error('Failed to load records: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSummary = async () => {
    setSummaryLoading(true);
    try {
      const res = await api.getSummary(patient.phoneNumber, summaryType);
      setSummaryData(res.data);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadForm.diagnosis) return toast.error('Diagnosis required');
    setUploadLoading(true);
    try {
      if (file) {
        const fd = new FormData();
        fd.append('phoneNumber', patient.phoneNumber);
        fd.append('diagnosis', uploadForm.diagnosis);
        fd.append('medications', JSON.stringify(medications));
        fd.append('allergies', JSON.stringify(allergies));
        fd.append('notes', uploadForm.notes);
        fd.append('file', file);
        await api.uploadRecord(fd);
      } else {
        await api.uploadRecordJson({ phoneNumber: patient.phoneNumber, diagnosis: uploadForm.diagnosis, medications, allergies, notes: uploadForm.notes });
      }
      toast.success('Record uploaded successfully');
      setUploadForm({ diagnosis: '', notes: '' });
      setMedications([]);
      setAllergies([]);
      setFile(null);
      fetchRecords(); // refresh records list
      setActiveTab('records');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploadLoading(false);
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
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="page-header" style={{ marginBottom: 16 }}>
        <h1>Patient Workspace</h1>
        <p>Unlock patient data to view records, upload, and generate AI summaries</p>
      </div>

      {/* Top Bar: Search & Profile */}
      <div className="card" style={{ marginBottom: 16, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <form onSubmit={e => handleSearch(e)} style={{ display: 'flex', gap: 8, flex: 1, minWidth: 280 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Phone size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="form-input" placeholder="+919876543210" value={phone} onChange={e => setPhone(e.target.value)} style={{ paddingLeft: 34 }} />
          </div>
          <button type="submit" className="btn btn-secondary" disabled={loading}><Search size={14} /></button>
          <button type="button" className="btn btn-secondary" onClick={toggleScanner} title="Scan Patient QR Code">
            <QrCode size={14} />
          </button>
        </form>

      </div>

      {showScanner && (
        <div className="card fade-in" style={{ marginBottom: 16, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600 }}>Scan Patient QR Code</h3>
            <button className="btn btn-secondary btn-sm" onClick={toggleScanner}><X size={14} /></button>
          </div>
          <div id="reader" style={{ width: '100%', maxWidth: 400, margin: '0 auto', overflow: 'hidden', borderRadius: 8 }}></div>
        </div>
      )}

      {/* Main Content Area */}
      <div style={{ display: 'flex', flex: 1, gap: 16, minHeight: 0 }}>
        {/* LEFT COLUMN: Consent & Patient Info */}
        <div style={{ width: 320, display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          {patient && (
            <div className="card">
              <h3 style={{ fontSize: 14, fontWeight: 600 }}>{patient.name}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: 12, marginBottom: 12 }}>{patient.phoneNumber} · Age {patient.age || '—'} · {patient.gender || '—'}</p>
              {consentStep === 'verified' ? (
                <span className="badge badge-green"><CheckCircle size={10} /> Workspace Unlocked</span>
              ) : (
                <span className="badge badge-neutral"><Lock size={10} /> Locked</span>
              )}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Interactive Areas (Consent / Workspace) */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

          {patient && consentStep === 'none' && (
            <div className="card fade-in" style={{ textAlign: 'center', padding: '64px 32px', margin: 'auto', maxWidth: 400 }}>
              <Lock size={32} style={{ color: 'var(--text-muted)', marginBottom: 16, margin: '0 auto' }} />
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Consent Required</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 24 }}>
            An OTP is required to unlock this patient's medical records, upload new files, or generate AI summaries.
          </p>
          <button className="btn btn-primary" onClick={handleRequestConsent} disabled={loading}>
            <Send size={14} /> {loading ? 'Sending OTP...' : 'Send OTP to Patient'}
          </button>
        </div>
      )}

      {patient && consentStep === 'otp-sent' && (
        <div className="card fade-in" style={{ textAlign: 'center', padding: '48px 32px', margin: 'auto', maxWidth: 400 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Enter Patient OTP</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 24 }}>
            Please enter the 6-digit OTP sent to {patient.phoneNumber}
          </p>
          <form onSubmit={handleVerifyConsent}>
            <div className="otp-inputs" style={{ justifyContent: 'center', marginBottom: 24 }}>
              {otp.map((digit, i) => (
                <input key={i} ref={el => otpRefs.current[i] = el} type="text" maxLength={1} value={digit} onChange={e => handleOtpChange(i, e.target.value)} onKeyDown={e => handleOtpKeyDown(i, e)} autoFocus={i === 0} />
              ))}
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              <ArrowRight size={14} /> {loading ? 'Unlocking...' : 'Unlock Workspace'}
            </button>
          </form>
        </div>
      )}

      {patient && consentStep === 'verified' && (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          {/* Tabs Navigation */}
          <div style={{ display: 'flex', gap: 2, marginBottom: 16, borderBottom: '1px solid var(--border)' }}>
            <button className={`tab-btn ${activeTab === 'records' ? 'active' : ''}`} onClick={() => setActiveTab('records')}><FileText size={14} /> Medical Records</button>
            <button className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`} onClick={() => setActiveTab('summary')}><Brain size={14} /> AI Summary</button>
            <button className={`tab-btn ${activeTab === 'upload' ? 'active' : ''}`} onClick={() => setActiveTab('upload')}><Upload size={14} /> Upload Record</button>
          </div>

          {/* TAB: Records */}
          {activeTab === 'records' && (
            <div className="card fade-in" style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600 }}>History ({recordsData?.length || 0})</h3>
                <button className="btn btn-secondary btn-sm" onClick={fetchRecords} disabled={loading}>Refresh</button>
              </div>
              
              {!recordsData ? <div className="spinner" style={{ margin: '32px auto' }} /> : recordsData.length === 0 ? (
                <div className="empty-state"><p>No records found</p></div>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr><th>Date</th><th>Diagnosis</th><th>Doctor</th><th>Medications</th><th>Allergies</th><th>File</th><th>Integrity</th></tr>
                    </thead>
                    <tbody>
                      {recordsData.map(rec => (
                        <tr key={rec.id}>
                          <td style={{ whiteSpace: 'nowrap' }}>{new Date(rec.createdAt).toLocaleDateString()}</td>
                          <td style={{ fontWeight: 500 }}>{rec.diagnosis}</td>
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
              )}
            </div>
          )}

          {/* TAB: AI Summary */}
          {activeTab === 'summary' && (
            <div className="fade-in">
              <div className="card" style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
                <div className="toggle-group" style={{ margin: 0 }}>
                  <button className={`toggle-btn ${summaryType === 'emergency' ? 'active' : ''}`} onClick={() => setSummaryType('emergency')}>Emergency</button>
                  <button className={`toggle-btn ${summaryType === 'detailed' ? 'active' : ''}`} onClick={() => setSummaryType('detailed')}>Detailed</button>
                </div>
                <button className="btn btn-primary" onClick={handleGenerateSummary} disabled={summaryLoading}>
                  <Brain size={14} /> {summaryLoading ? 'Generating...' : 'Generate AI Summary'}
                </button>
              </div>

              {summaryLoading && (
                <div className="card" style={{ textAlign: 'center', padding: 48 }}>
                  <div className="spinner" style={{ margin: '0 auto 12px' }} />
                  <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Analyzing patient records...</p>
                </div>
              )}

              {summaryData && !summaryLoading && (
                <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {summaryData.summary.emergencyNotes && (
                    <div className="card" style={{ gridColumn: '1 / -1', borderLeft: '4px solid var(--red)' }}>
                      <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--red)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}><AlertTriangle size={14} /> EMERGENCY NOTES</h3>
                      <p style={{ fontSize: 13, lineHeight: 1.5, color: '#b91c1c' }}>{summaryData.summary.emergencyNotes}</p>
                    </div>
                  )}

                  <div className="card">
                    <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--text-muted)' }}><Pill size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }}/> ACTIVE MEDICATIONS</h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {(summaryData.summary.activeMedications || []).length === 0 ? <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>None recorded</span> : summaryData.summary.activeMedications.map((m, i) => <span key={i} className="badge badge-blue">{m}</span>)}
                    </div>
                  </div>

                  <div className="card">
                    <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--text-muted)' }}><ShieldAlert size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }}/> CRITICAL ALLERGIES</h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {(summaryData.summary.criticalAllergies || []).length === 0 ? <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>None recorded</span> : summaryData.summary.criticalAllergies.map((a, i) => <span key={i} className="badge badge-red">{a}</span>)}
                    </div>
                  </div>

                  <div className="card" style={{ gridColumn: '1 / -1' }}>
                    <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text-muted)' }}>AI SUMMARY</h3>
                    <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text)' }}>{summaryData.summary.quickSummary}</p>
                  </div>

                  {summaryData.summary.documentFindings && (
                    <div className="card" style={{ gridColumn: '1 / -1', borderLeft: '4px solid var(--accent)' }}>
                      <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 6 }}><FileText size={14} /> DOCUMENT FINDINGS</h3>
                      <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text)' }}>{summaryData.summary.documentFindings}</p>
                    </div>
                  )}

                  {summaryData.summary._filesAnalyzed && (summaryData.summary._filesAnalyzed.pdfsExtracted > 0 || summaryData.summary._filesAnalyzed.imagesAnalyzed > 0) && (
                    <div style={{ gridColumn: '1 / -1', fontSize: 11, color: 'var(--text-muted)', textAlign: 'right' }}>
                      📎 Files analyzed: {summaryData.summary._filesAnalyzed.pdfsExtracted} PDF(s), {summaryData.summary._filesAnalyzed.imagesAnalyzed} image(s) · Model: {summaryData.summary._model}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB: Upload */}
          {activeTab === 'upload' && (
            <div className="card fade-in" style={{ maxWidth: 640 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Upload New Record</h3>
              <form onSubmit={handleUpload}>
                <div className="form-group"><label>Diagnosis</label><input className="form-input" value={uploadForm.diagnosis} onChange={e => setUploadForm({...uploadForm, diagnosis: e.target.value})} required /></div>
                <div className="form-group">
                  <label>Medications</label>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                    <input className="form-input" value={medInput} onChange={e => setMedInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if(medInput.trim()){ setMedications([...medications, medInput.trim()]); setMedInput(''); } } }} />
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => { if(medInput.trim()){ setMedications([...medications, medInput.trim()]); setMedInput(''); } }}><Plus size={14} /></button>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {medications.map((m, i) => <span key={i} className="badge badge-blue" style={{ cursor: 'pointer' }} onClick={() => setMedications(medications.filter((_, j) => j !== i))}>{m} <X size={10} /></span>)}
                  </div>
                </div>
                <div className="form-group">
                  <label>Allergies</label>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                    <input className="form-input" value={allergyInput} onChange={e => setAllergyInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if(allergyInput.trim()){ setAllergies([...allergies, allergyInput.trim()]); setAllergyInput(''); } } }} />
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => { if(allergyInput.trim()){ setAllergies([...allergies, allergyInput.trim()]); setAllergyInput(''); } }}><Plus size={14} /></button>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {allergies.map((a, i) => <span key={i} className="badge badge-red" style={{ cursor: 'pointer' }} onClick={() => setAllergies(allergies.filter((_, j) => j !== i))}>{a} <X size={10} /></span>)}
                  </div>
                </div>
                <div className="form-group"><label>Notes</label><textarea className="form-input" value={uploadForm.notes} onChange={e => setUploadForm({...uploadForm, notes: e.target.value})} /></div>
                <div className="form-group"><label>Attachment</label><input type="file" className="form-input" accept=".pdf,.png,.jpg,.jpeg" onChange={e => setFile(e.target.files[0])} style={{ padding: 8 }} /></div>
                <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={uploadLoading}><Upload size={16} /> {uploadLoading ? 'Uploading...' : 'Submit Record'}</button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  </div>
</div>
  );
}
