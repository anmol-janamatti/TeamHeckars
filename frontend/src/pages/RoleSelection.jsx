import { useNavigate, Navigate } from 'react-router-dom';
import { Stethoscope, User, Plus } from 'lucide-react';
import { useAuth } from '../AuthContext';

export default function RoleSelection() {
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0e27' }}>
        <div className="spinner" />
      </div>
    );
  }

  // Auto-redirect logged-in users to their dashboard
  if (user && role === 'doctor') return <Navigate to="/doctor/dashboard" replace />;
  if (user && role === 'patient') return <Navigate to="/patient/dashboard" replace />;

  return (
    <div className="role-selection">
      <div className="role-container fade-in">
        <div className="auth-logo">
        </div>
        <h1>LifeLink</h1>
        <p>Unified Health Record Access System</p>

        <div className="role-cards">
          <div className="role-card" onClick={() => navigate('/doctor/login')}>
            <div className="role-icon">
              <Stethoscope size={22} />
            </div>
            <h3>Doctor</h3>
            <p>Access patient records, upload reports, and get AI-powered summaries</p>
          </div>

          <div className="role-card" onClick={() => navigate('/patient/login')}>
            <div className="role-icon">
              <User size={22} />
            </div>
            <h3>Patient</h3>
            <p>Verify via OTP to view your medical history and records</p>
          </div>
        </div>
      </div>
    </div>
  );
}
