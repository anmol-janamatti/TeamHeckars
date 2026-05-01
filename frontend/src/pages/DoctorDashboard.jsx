import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import api from '../api';
import { Users, FileText, Brain, BadgeCheck, Clock, QrCode, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function DoctorDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ patientsTreated: 0, recordsUploaded: 0 });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.getDoctorStats();
        setStats(res.data);
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      } finally {
        setLoadingStats(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>Welcome, Dr. {(user?.name?.replace(/^Dr\.?\s*/i, '') || '').split(' ')[0]}</h1>
        <p>{user?.hospitalName || 'HealthTech Provider Dashboard'}</p>
      </div>

      {/* Live Counters */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ textAlign: 'center', padding: '24px 16px' }}>
          <Users size={28} style={{ color: 'var(--primary-color)', marginBottom: 8 }} />
          <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--text-main)', lineHeight: 1 }}>
            {loadingStats ? '…' : stats.patientsTreated}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>Patients Treated</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '24px 16px' }}>
          <FileText size={28} style={{ color: '#8b5cf6', marginBottom: 8 }} />
          <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--text-main)', lineHeight: 1 }}>
            {loadingStats ? '…' : stats.recordsUploaded}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>Records Uploaded</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 24 }}>

        {/* Verification Badge */}
        <div className="card" style={{ borderLeft: user?.verified ? '4px solid var(--success-color)' : '4px solid #f59e0b', background: 'var(--bg-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            {user?.verified ? <BadgeCheck size={24} style={{ color: 'var(--success-color)' }} /> : <Clock size={24} style={{ color: '#f59e0b' }} />}
            <h3 style={{ fontSize: 16, margin: 0 }}>Practitioner Status</h3>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0, lineHeight: 1.5 }}>
            {user?.verified
              ? `You are a verified practitioner under the ${user.stateCouncil}. Your registration number (${user.registrationNumber}) has been authenticated.`
              : 'Your medical credentials are currently under review. Some features may be restricted.'}
          </p>
        </div>

        {/* AI Capabilities */}
        <div className="card" style={{ borderLeft: '4px solid var(--primary-color)', background: 'var(--bg-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <Brain size={24} style={{ color: 'var(--primary-color)' }} />
            <h3 style={{ fontSize: 16, margin: 0 }}>Groq AI Assistant</h3>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0, lineHeight: 1.5 }}>
            Powered by Groq's ultra-fast LPU inference for instant medical record summarization, anomaly detection, and clinical risk analysis.
          </p>
        </div>

        {/* Quick Scan Action */}
        <Link to="/doctor/workspace" className="card" style={{ borderLeft: '4px solid #8b5cf6', background: 'var(--bg-subtle)', textDecoration: 'none', display: 'flex', flexDirection: 'column', justifyContent: 'center', transition: 'transform 0.2s', cursor: 'pointer' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseOut={e => e.currentTarget.style.transform = 'none'}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <QrCode size={24} style={{ color: '#8b5cf6' }} />
            <h3 style={{ fontSize: 16, margin: 0, color: 'var(--text-main)' }}>Scan Patient QR</h3>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0, lineHeight: 1.5 }}>
            Instantly request secure clinical consent and access health records directly from a patient's mobile device.
          </p>
        </Link>
      </div>

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <ShieldCheck size={20} style={{ color: 'var(--text-muted)' }} />
          <h3 style={{ fontSize: 16, margin: 0 }}>Clinical Workspace</h3>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20 }}>
          Manage your active patient sessions, review AI-generated summaries, and upload new medical documents to the secure vault.
        </p>
        <Link to="/doctor/workspace" className="btn btn-primary">
          <Users size={16} /> Enter Patient Workspace
        </Link>
      </div>
    </div>
  );
}
