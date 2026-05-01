import { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import api from '../api';
import toast from 'react-hot-toast';
import { LogIn, Stethoscope } from 'lucide-react';

export default function DoctorLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginDoctor, user, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0e27' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (user && role === 'doctor') return <Navigate to="/doctor/dashboard" replace />;
  if (user && role === 'patient') return <Navigate to="/patient/dashboard" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.loginDoctor(email, password);
      loginDoctor(res.data.doctor, res.data.token);
      toast.success(`Welcome, ${res.data.doctor.name}`);
      navigate('/doctor/dashboard');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card fade-in">
        <div className="auth-logo">
          <div className="logo-icon"><Stethoscope size={22} /></div>
          <h1>Doctor Login</h1>
          <p>Access patient records and insights</p>
        </div>
        <div className="auth-form">
          <div className="card">
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Email</label>
                <input type="email" className="form-input" placeholder="doctor@hospital.com" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input type="password" className="form-input" placeholder="Enter password" value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
              <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
                <LogIn size={16} />
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          </div>
        </div>
        <div className="auth-footer">
          Don&apos;t have an account? <Link to="/doctor/register">Register</Link>
          <br />
          <Link to="/" style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 8, display: 'inline-block' }}>Back to home</Link>
        </div>
      </div>
    </div>
  );
}
