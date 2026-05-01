import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import api from '../api';
import toast from 'react-hot-toast';
import { UserPlus, Stethoscope, Phone, KeyRound, CheckCircle2, Upload, BadgeCheck } from 'lucide-react';

const MEDICAL_COUNCILS = [
  "Andhra Pradesh Medical Council", "Arunachal Pradesh Medical Council", "Assam Medical Council",
  "Bihar Medical Council", "Chhattisgarh Medical Council", "Delhi Medical Council",
  "Goa Medical Council", "Gujarat Medical Council", "Haryana Medical Council",
  "Himachal Pradesh Medical Council", "Jammu & Kashmir Medical Council", "Jharkhand Medical Council",
  "Karnataka Medical Council", "Kerala Medical Council", "Madhya Pradesh Medical Council",
  "Maharashtra Medical Council", "Manipur Medical Council", "Meghalaya Medical Council",
  "Mizoram Medical Council", "Nagaland Medical Council", "Orissa Council of Medical Registration",
  "Punjab Medical Council", "Rajasthan Medical Council", "Sikkim Medical Council",
  "Tamil Nadu Medical Council", "Telangana State Medical Council", "Tripura State Medical Council",
  "Uttar Pradesh Medical Council", "Uttarakhand Medical Council", "West Bengal Medical Council"
];

export default function DoctorRegister() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [details, setDetails] = useState({ stateCouncil: '', registrationNumber: '', email: '', password: '' });
  const [photo, setPhoto] = useState(null);
  const [verifiedDoctor, setVerifiedDoctor] = useState(null);

  const otpRefs = useRef([]);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const { loginDoctor } = useAuth();

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (phone.length < 10) return toast.error('Enter a valid phone number');
    // TODO: Re-enable OTP for production
    // setLoading(true);
    // try {
    //   await api.sendOtp(phone);
    //   toast.success('OTP sent successfully');
    //   setStep(2);
    // } catch (err) {
    //   toast.error(err.message);
    // } finally {
    //   setLoading(false);
    // }
    toast.success('OTP bypassed for testing');
    setStep(3);
  };

  const handleOtpChange = (index, value) => {
    if (isNaN(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value !== '' && index < 5) otpRefs.current[index + 1].focus();
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const otpString = otp.join('');
    if (otpString.length !== 6) return toast.error('Enter complete OTP');
    setLoading(true);
    try {
      await api.verifyOtp(phone, otpString);
      toast.success('Phone verified');
      setStep(3);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDetailsChange = (e) => setDetails({ ...details, [e.target.name]: e.target.value });

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setPhoto(e.target.files[0]);
    }
  };

  const handleOnboard = async (e) => {
    e.preventDefault();
    if (!details.stateCouncil || !details.registrationNumber || !details.email || !details.password) {
      return toast.error('Please fill in all details');
    }

    if (details.password.length < 6) {
      return toast.error('Password must be at least 6 characters');
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('phone', phone);
      formData.append('state_council', details.stateCouncil);
      formData.append('registration_number', details.registrationNumber);
      formData.append('email', details.email);
      formData.append('password', details.password);
      if (photo) formData.append('photo', photo);

      const res = await api.onboardDoctor(formData);

      setVerifiedDoctor({
        name: res.data.doctor.name,
        fatherName: res.data.fatherName,
        verified: res.data.verified,
        token: res.data.token,
        doctorObj: res.data.doctor
      });

      setStep(4);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const finishOnboarding = () => {
    if (verifiedDoctor?.doctorObj && verifiedDoctor?.token) {
      loginDoctor(verifiedDoctor.doctorObj, verifiedDoctor.token);
      toast.success('Welcome to HealthTech!');
      navigate('/doctor/dashboard');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card fade-in">
        <div className="auth-logo">
          <div className="logo-icon"><Stethoscope size={22} /></div>
          <h1>Doctor Onboarding</h1>
          <p>Join the secure healthcare network</p>
        </div>

        <div className="auth-form">
          <div className="card">
            {step === 1 && (
              <form onSubmit={handleSendOtp} className="fade-in">
                <div className="form-group">
                  <label>Phone Number</label>
                  <div className="phone-input-wrapper">
                    <span className="phone-prefix">+91</span>
                    <input type="tel" className="form-input" placeholder="98765 43210" value={phone.replace('+91', '')} onChange={(e) => setPhone(e.target.value)} autoFocus required />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
                  <Phone size={16} /> {loading ? 'Sending...' : 'Send OTP'}
                </button>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={handleVerifyOtp} className="fade-in">
                <div className="form-group">
                  <label>Enter 6-digit OTP</label>
                  <div className="otp-container">
                    {otp.map((digit, i) => (
                      <input key={i} ref={el => otpRefs.current[i] = el} type="text" maxLength="1" className="otp-input" value={digit} onChange={(e) => handleOtpChange(i, e.target.value)} onKeyDown={(e) => { if (e.key === 'Backspace' && !otp[i] && i > 0) otpRefs.current[i - 1].focus() }} autoFocus={i === 0} required />
                    ))}
                  </div>
                  <p className="help-text" style={{ textAlign: 'center', marginTop: 12 }}>Sent to +91 {phone}</p>
                </div>
                <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
                  <KeyRound size={16} /> {loading ? 'Verifying...' : 'Verify OTP'}
                </button>
              </form>
            )}

            {step === 3 && (
              <form onSubmit={handleOnboard} className="fade-in">
                <div className="form-group">
                  <label>State Medical Council</label>
                  <select name="stateCouncil" className="form-input" value={details.stateCouncil} onChange={handleDetailsChange} required>
                    <option value="" disabled>Select your council...</option>
                    {MEDICAL_COUNCILS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label>Registration Number</label>
                  <input type="text" name="registrationNumber" className="form-input" placeholder="e.g. 10005" value={details.registrationNumber} onChange={handleDetailsChange} required />
                </div>

                <div className="form-group">
                  <label>Email Address</label>
                  <input type="email" name="email" className="form-input" placeholder="doctor@hospital.com" value={details.email} onChange={handleDetailsChange} required />
                </div>

                <div className="form-group">
                  <label>Create Password</label>
                  <input type="password" name="password" className="form-input" placeholder="Min. 6 characters" value={details.password} onChange={handleDetailsChange} required minLength={6} />
                </div>

                <div className="form-group">
                  <label>Profile Photo</label>
                  <div
                    className="file-upload-box"
                    onClick={() => fileInputRef.current?.click()}
                    style={{ border: '2px dashed var(--border-color)', borderRadius: 8, padding: 24, textAlign: 'center', cursor: 'pointer', background: 'var(--bg-subtle)' }}
                  >
                    <Upload size={24} style={{ color: 'var(--primary-color)', marginBottom: 8 }} />
                    <div style={{ fontWeight: 500 }}>{photo ? photo.name : 'Click to upload photo'}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>JPEG, PNG (Max 5MB)</div>
                  </div>
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" style={{ display: 'none' }} required />
                </div>

                <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
                  <BadgeCheck size={16} /> {loading ? 'Verifying Profile...' : 'Verify & Register'}
                </button>
              </form>
            )}

            {step === 4 && verifiedDoctor && (
              <div className="fade-in" style={{ textAlign: 'center', padding: '10px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: verifiedDoctor.verified ? 'var(--success-color)' : '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                    <CheckCircle2 size={32} />
                  </div>
                </div>
                <h2 style={{ marginBottom: 4, color: 'var(--text-main)' }}>
                  {verifiedDoctor.name !== 'Pending Verification' ? `Dr. ${verifiedDoctor.name}` : 'Verification Pending'}
                </h2>

                {verifiedDoctor.fatherName && (
                  <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>
                    S/D/W of {verifiedDoctor.fatherName}
                  </p>
                )}

                <div style={{ background: 'var(--bg-subtle)', padding: 12, borderRadius: 8, marginBottom: 24, fontSize: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Council:</span>
                    <span style={{ fontWeight: 500 }}>{details.stateCouncil}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Reg No:</span>
                    <span style={{ fontWeight: 500 }}>{details.registrationNumber}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Status:</span>
                    <span style={{ fontWeight: 600, color: verifiedDoctor.verified ? 'var(--success-color)' : '#f59e0b' }}>
                      {verifiedDoctor.verified ? 'Verified ✓' : 'Pending Review'}
                    </span>
                  </div>
                </div>

                <button onClick={finishOnboarding} className="btn btn-primary btn-block btn-lg">
                  Go to Dashboard
                </button>
              </div>
            )}
          </div>
        </div>

        {step < 4 && (
          <div className="auth-footer">
            Already registered? <Link to="/doctor/login">Sign in</Link>
            <br />
            <Link to="/" style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 8, display: 'inline-block' }}>Back to home</Link>
          </div>
        )}
      </div>
    </div>
  );
}
