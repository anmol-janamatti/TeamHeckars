import { useState, useRef } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import api from '../api';
import toast from 'react-hot-toast';
import { Smartphone, ArrowRight, User } from 'lucide-react';

export default function PatientLogin() {
  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [regForm, setRegForm] = useState({ name: '', age: '', gender: '' });
  const [loading, setLoading] = useState(false);
  const otpRefs = useRef([]);
  const { loginPatient, user, role, loading: authLoading } = useAuth();
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

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.sendOtp(phone);
      toast.success('OTP sent');
      setStep('otp');
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

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const otpCode = otp.join('');
    if (otpCode.length !== 6) return toast.error('Enter 6-digit OTP');
    setLoading(true);
    try {
      const res = await api.verifyOtp(phone, otpCode);
      if (res.data.patientExists) {
        loginPatient(res.data.patient, res.data.token);
        toast.success(`Welcome, ${res.data.patient.name}`);
        navigate('/patient/dashboard');
      } else {
        toast.success('Verified. Create your profile.');
        setStep('register');
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.createPatient({ ...regForm, phoneNumber: phone, age: parseInt(regForm.age) || null });
      loginPatient(res.data.patient, res.data.token);
      toast.success('Profile created');
      navigate('/patient/dashboard');
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
          <div className="logo-icon"><User size={22} /></div>
          <h1>Patient Portal</h1>
          <p>{step === 'phone' ? 'Enter your phone number' : step === 'otp' ? 'Enter the OTP sent to your phone' : 'Create your profile'}</p>
        </div>
        <div className="auth-form">
          <div className="card">
            {step === 'phone' && (
              <form onSubmit={handleSendOtp}>
                <div className="form-group">
                  <label>Phone Number</label>
                  <input className="form-input" placeholder="+91 98765 43210" value={phone} onChange={e => setPhone(e.target.value)} required />
                </div>
                <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
                  <Smartphone size={16} />
                  {loading ? 'Sending...' : 'Send OTP'}
                </button>
              </form>
            )}
            {step === 'otp' && (
              <form onSubmit={handleVerifyOtp}>
                <div className="otp-inputs">
                  {otp.map((digit, i) => (
                    <input key={i} ref={el => otpRefs.current[i] = el} type="text" maxLength={1} value={digit} onChange={e => handleOtpChange(i, e.target.value)} onKeyDown={e => handleOtpKeyDown(i, e)} autoFocus={i === 0} />
                  ))}
                </div>
                <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
                  Sent to <strong style={{ color: 'var(--text)' }}>{phone}</strong>
                  {' · '}
                  <button type="button" onClick={() => setStep('phone')} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontFamily: 'var(--font)', fontSize: 12, fontWeight: 500 }}>Change</button>
                </p>
                <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
                  <ArrowRight size={16} />
                  {loading ? 'Verifying...' : 'Verify'}
                </button>
              </form>
            )}
            {step === 'register' && (
              <form onSubmit={handleRegister}>
                <div className="form-group">
                  <label>Full Name</label>
                  <input className="form-input" placeholder="Your full name" value={regForm.name} onChange={e => setRegForm({ ...regForm, name: e.target.value })} required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Age</label>
                    <input type="number" className="form-input" placeholder="25" value={regForm.age} onChange={e => setRegForm({ ...regForm, age: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Gender</label>
                    <select className="form-input" value={regForm.gender} onChange={e => setRegForm({ ...regForm, gender: e.target.value })}>
                      <option value="">Select</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
                <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Profile'}
                </button>
              </form>
            )}
          </div>
        </div>
        <div className="auth-footer">
          <Link to="/" style={{ color: 'var(--text-muted)', fontSize: 12 }}>Back to home</Link>
        </div>
      </div>
    </div>
  );
}
