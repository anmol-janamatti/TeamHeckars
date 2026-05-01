import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import api from '../api';
import toast from 'react-hot-toast';
import { LogOut, Calendar, Building2, Stethoscope, Plus, Paperclip, QrCode, Eye, Upload, Download, Shield } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function PatientDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qrToken, setQrToken] = useState(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [accessLogs, setAccessLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('records');
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    api.getPatientProfile().then(res => setProfile(res.data)).catch(err => toast.error(err.message)).finally(() => setLoading(false));
    api.getAccessLogs().then(res => setAccessLogs(res.data)).catch(() => {});
  }, []);

  // Fetch dynamic QR token
  const fetchQrToken = async () => {
    try {
      setQrLoading(true);
      const res = await api.getQrToken();
      setQrToken(res.data.token);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setQrLoading(false);
    }
  };

  const handleDownloadFile = async (recordId, fileName) => {
    try {
      setDownloadingId(recordId);
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3000/api/records/file/${recordId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Download failed');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || 'medical-record';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success('File downloaded securely');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDownloadingId(null);
    }
  };

  // Refresh QR every 25 seconds
  useEffect(() => {
    fetchQrToken();
    const interval = setInterval(fetchQrToken, 25000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => { logout(); navigate('/'); };

  if (loading) return <div className="auth-container"><div className="loading-spinner"><div className="spinner" /></div></div>;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-secondary)' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 32px', borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Plus size={16} />
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700 }}>MedVault</h2>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Patient Portal</p>
          </div>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={handleLogout}><LogOut size={14} /> Sign Out</button>
      </header>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: 32 }} className="fade-in">
        
        {/* Dynamic QR Code Section */}
        <div className="card" style={{ marginBottom: 24, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)' }}>
            <QrCode size={16} />
            <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Your Access QR</span>
          </div>
          <div style={{ padding: 12, background: 'white', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', display: 'inline-block' }}>
            {qrToken ? (
              <QRCodeSVG value={qrToken} size={140} level="H" />
            ) : (
              <div style={{ width: 140, height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', borderRadius: 8 }}>
                <div className="spinner" style={{ width: 20, height: 20 }} />
              </div>
            )}
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 240, lineHeight: 1.4 }}>
            Show this to your doctor to grant access to your records. Auto-refreshes every 30 seconds.
          </p>
        </div>

        <div className="card" style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
            {profile?.name?.charAt(0) || '?'}
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 2 }}>{profile?.name}</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
              {profile?.phoneNumber} · Age {profile?.age || '—'} · {profile?.gender || '—'}
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 4 }}>
              ID: <code style={{ fontSize: 10 }}>{profile?.id}</code>
            </p>
          </div>
          <div style={{ display: 'flex', gap: 24 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{profile?._count?.medicalRecords || 0}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Records</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 700 }}>
                {(() => {
                  const uniqueDoctors = new Set(profile?.medicalRecords?.map(r => r.doctor?.id).filter(Boolean));
                  return uniqueDoctors.size;
                })()}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Doctors</div>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
          <button
            onClick={() => setActiveTab('records')}
            style={{ flex: 1, padding: '10px 16px', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', background: activeTab === 'records' ? 'var(--accent)' : 'var(--bg)', color: activeTab === 'records' ? '#fff' : 'var(--text-muted)', transition: 'all 0.2s', fontFamily: 'var(--font)' }}
          >
            Medical History ({profile?.medicalRecords?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            style={{ flex: 1, padding: '10px 16px', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', background: activeTab === 'logs' ? 'var(--accent)' : 'var(--bg)', color: activeTab === 'logs' ? '#fff' : 'var(--text-muted)', transition: 'all 0.2s', fontFamily: 'var(--font)' }}
          >
            <Shield size={12} style={{ marginRight: 4, verticalAlign: -1 }} />
            Access Logs ({accessLogs.length})
          </button>
        </div>

        {activeTab === 'records' && (
          <>
            {(!profile?.medicalRecords || profile.medicalRecords.length === 0) ? (
              <div className="empty-state"><p>No records yet</p></div>
            ) : (
              <div className="timeline">
                {profile.medicalRecords.map((rec, i) => {
                  const doc = rec.doctor;
                  const docPhoto = doc?.photoUrl ? `http://localhost:3000/${doc.photoUrl.replace(/\\/g, '/')}` : null;
                  const docInitials = doc?.name?.replace(/^Dr\.?\s*/i, '').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'DR';
                  return (
                    <div key={rec.id} className="timeline-item" style={{ animationDelay: `${i * 0.08}s` }}>
                      <div className="card">
                        <div className="timeline-date">
                          <Calendar size={11} />
                          {new Date(rec.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </div>
                        <div className="timeline-diagnosis">{rec.diagnosis}</div>
                        
                        {rec.fileName && (
                          <div style={{ marginTop: 12 }}>
                            <button
                              onClick={() => handleDownloadFile(rec.id, rec.fileName)}
                              disabled={downloadingId === rec.id}
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '6px 12px', background: 'var(--blue-bg)', color: 'var(--blue)', borderColor: 'var(--blue)', display: 'inline-flex', gap: 6 }}
                            >
                              {downloadingId === rec.id ? <div className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} /> : <Paperclip size={12} />}
                              {downloadingId === rec.id ? 'Decrypting...' : rec.fileName}
                            </button>
                          </div>
                        )}

                        {doc && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12, padding: '12px', background: 'var(--bg-subtle)', borderRadius: 8 }}>
                            {docPhoto ? (
                              <img src={docPhoto} alt={doc.name} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                            ) : (
                              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--primary-color)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, flexShrink: 0 }}>{docInitials}</div>
                            )}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: 13, fontWeight: 600 }}>Dr. {doc.name?.replace(/^Dr\.?\s*/i, '')}</span>
                                {doc.verified && (
                                  <span style={{ background: 'rgba(22,163,74,0.1)', color: '#16a34a', fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 10 }}>✓ Verified</span>
                                )}
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                                {doc.stateCouncil && <span>{doc.stateCouncil}</span>}
                                {doc.registrationNumber && <span> · Reg #{doc.registrationNumber}</span>}
                              </div>
                              {doc.hospitalName && (
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                  <Building2 size={10} /> {doc.hospitalName}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {activeTab === 'logs' && (
          <>
            {accessLogs.length === 0 ? (
              <div className="empty-state"><p>No access logs yet</p></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {accessLogs.map((log, i) => {
                  const doc = log.doctor;
                  const docPhoto = doc?.photoUrl ? `http://localhost:3000/${doc.photoUrl.replace(/\\/g, '/')}` : null;
                  const docInitials = doc?.name?.replace(/^Dr\.?\s*/i, '').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'DR';
                  const actionIcon = log.action === 'viewed_records' ? <Eye size={14} /> : log.action === 'uploaded_record' ? <Upload size={14} /> : <Download size={14} />;
                  const actionColor = log.action === 'viewed_records' ? '#3b82f6' : log.action === 'uploaded_record' ? '#16a34a' : '#f59e0b';
                  const actionLabel = log.action === 'viewed_records' ? 'Viewed Records' : log.action === 'uploaded_record' ? 'Uploaded Record' : 'Downloaded File';
                  return (
                    <div key={log.id} className="card fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: `${actionColor}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: actionColor, flexShrink: 0 }}>
                          {actionIcon}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>Dr. {doc?.name?.replace(/^Dr\.?\s*/i, '')}</span>
                            {doc?.verified && (
                              <span style={{ background: 'rgba(22,163,74,0.1)', color: '#16a34a', fontSize: 9, fontWeight: 600, padding: '1px 5px', borderRadius: 10 }}>✓</span>
                            )}
                            <span style={{ fontSize: 11, fontWeight: 500, color: actionColor, background: `${actionColor}10`, padding: '2px 8px', borderRadius: 10 }}>{actionLabel}</span>
                          </div>
                          {log.details && (
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{log.details}</div>
                          )}
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                            {doc?.hospitalName && <span>{doc.hospitalName} · </span>}
                            {new Date(log.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                        {docPhoto ? (
                          <img src={docPhoto} alt={doc?.name} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--primary-color)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>{docInitials}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
