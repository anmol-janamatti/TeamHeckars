import { useState } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { Brain, AlertTriangle, Pill, ShieldAlert, Search, FileText, Phone } from 'lucide-react';

export default function AISummary() {
  const [phone, setPhone] = useState('');
  const [type, setType] = useState('emergency');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!phone.trim()) return toast.error('Enter a phone number');
    setLoading(true);
    setData(null);
    try {
      const res = await api.getSummary(phone.trim(), type);
      setData(res.data);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const s = data?.summary;

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>AI Summary</h1>
        <p>Instant clinical insights from patient records</p>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <form onSubmit={handleGenerate}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Patient Phone Number</label>
              <div style={{ position: 'relative' }}>
                <Phone size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input className="form-input" placeholder="+919876543210" value={phone} onChange={e => setPhone(e.target.value)} style={{ paddingLeft: 34 }} />
              </div>
            </div>
            <div className="toggle-group">
              <button type="button" className={`toggle-btn ${type === 'emergency' ? 'active' : ''}`} onClick={() => setType('emergency')}>Emergency</button>
              <button type="button" className={`toggle-btn ${type === 'detailed' ? 'active' : ''}`} onClick={() => setType('detailed')}>Detailed</button>
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <Brain size={14} /> {loading ? 'Generating...' : 'Generate'}
            </button>
          </div>
        </form>
      </div>

      {loading && (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Analyzing patient data...</p>
        </div>
      )}

      {data && s && (
        <div className="fade-in">
          <div className="card" style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 2 }}>{data.patient.name}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Age {data.patient.age || '—'} · {data.patient.gender || '—'} · {data.recordCount} records</p>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <span className="badge badge-neutral">{data.summaryType}</span>
              {s._model && <span className="badge badge-neutral">{s._model}</span>}
              {s._fallback && <span className="badge badge-yellow">Fallback</span>}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="card">
              <div className="summary-section">
                <h3><AlertTriangle size={12} /> Critical Allergies</h3>
                <div className="summary-badges">
                  {(s.criticalAllergies || []).length === 0 ? <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>None</span>
                    : s.criticalAllergies.map((a, i) => <span key={i} className="badge badge-red">{a}</span>)}
                </div>
              </div>
            </div>
            <div className="card">
              <div className="summary-section">
                <h3><Pill size={12} /> Active Medications</h3>
                <div className="summary-badges">
                  {(s.activeMedications || []).length === 0 ? <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>None</span>
                    : s.activeMedications.map((m, i) => <span key={i} className="badge badge-blue">{m}</span>)}
                </div>
              </div>
            </div>
            <div className="card">
              <div className="summary-section">
                <h3><FileText size={12} /> Diagnoses</h3>
                <div className="summary-badges">
                  {(s.recentDiagnoses || []).map((d, i) => <span key={i} className="badge badge-neutral">{d}</span>)}
                </div>
              </div>
            </div>
            <div className="card">
              <div className="summary-section">
                <h3><ShieldAlert size={12} /> Risk Flags</h3>
                {(s.riskFlags || []).length === 0 ? <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>None</span>
                  : s.riskFlags.map((r, i) => <div key={i} className="risk-flag"><AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />{r}</div>)}
              </div>
            </div>
          </div>

          <div className="card" style={{ marginTop: 16 }}>
            <div className="summary-section">
              <h3><Search size={12} /> Summary</h3>
              <div className="summary-text">{s.quickSummary}</div>
            </div>
          </div>

          {s.emergencyNotes && (
            <div className="card" style={{ marginTop: 16 }}>
              <div className="summary-section">
                <h3><AlertTriangle size={12} /> Emergency Notes</h3>
                <div className="summary-text" style={{ background: 'var(--red-bg)', borderColor: '#fecaca' }}>{s.emergencyNotes}</div>
              </div>
            </div>
          )}

          {s.recommendations && (
            <div className="card" style={{ marginTop: 16 }}>
              <div className="summary-section">
                <h3>Recommendations</h3>
                <div className="summary-text">{s.recommendations}</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
