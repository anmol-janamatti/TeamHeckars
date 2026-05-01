import { useAuth } from '../AuthContext';
import { BadgeCheck, Phone, Mail, Building2, Hash, ShieldCheck, Clock, User, Users2 } from 'lucide-react';

export default function DoctorProfile() {
  const { user } = useAuth();
  const displayName = user?.name?.replace(/^Dr\.?\s*/i, '') || '';
  const initials = displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'DR';
  const photoUrl = user?.photoUrl ? `http://localhost:3000/${user.photoUrl.replace(/\\/g, '/')}` : null;

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>My Profile</h1>
        <p>Your professional credentials and account details</p>
      </div>

      {/* Profile Header Card */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 24, padding: 24, marginBottom: 20 }}>
        {photoUrl ? (
          <img src={photoUrl} alt="Profile" style={{
            width: 80, height: 80, borderRadius: '50%', objectFit: 'cover',
            border: '3px solid var(--primary-color)', flexShrink: 0
          }} />
        ) : (
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'var(--primary-color)', color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, fontWeight: 700, flexShrink: 0
          }}>{initials}</div>
        )}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h2 style={{ margin: 0, fontSize: 22 }}>Dr. {displayName}</h2>
            {user?.verified && <BadgeCheck size={20} style={{ color: 'var(--success-color)' }} />}
          </div>
          {user?.fatherName && (
            <p style={{ color: 'var(--text-muted)', margin: '2px 0 0', fontSize: 14 }}>
              S/D/W of {user.fatherName}
            </p>
          )}
          {user?.stateCouncil && (
            <p style={{ color: 'var(--primary-color)', margin: '6px 0 0', fontSize: 13, fontWeight: 500 }}>
              {user.stateCouncil}
            </p>
          )}
        </div>
        <div style={{
          padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600,
          background: user?.verified ? 'rgba(22, 163, 74, 0.1)' : 'rgba(245, 158, 11, 0.1)',
          color: user?.verified ? 'var(--success-color)' : '#f59e0b',
          border: `1px solid ${user?.verified ? 'rgba(22,163,74,0.2)' : 'rgba(245,158,11,0.2)'}`,
          whiteSpace: 'nowrap'
        }}>
          {user?.verified ? '✓ Verified' : '⏳ Pending'}
        </div>
      </div>

      {/* Details Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>

        {/* Medical Credentials */}
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldCheck size={16} style={{ color: 'var(--primary-color)' }} />
            Medical Credentials
          </h3>

          <DetailRow icon={<Hash size={15} />} label="Registration Number" value={user?.registrationNumber || 'N/A'} />
          <DetailRow icon={<Building2 size={15} />} label="State Council" value={user?.stateCouncil || 'N/A'} />
          <DetailRow icon={<ShieldCheck size={15} />} label="Verification Status"
            value={user?.verified ? 'Verified Practitioner' : 'Pending Verification'}
            valueColor={user?.verified ? 'var(--success-color)' : '#f59e0b'}
            last
          />
        </div>

        {/* Contact Information */}
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <User size={16} style={{ color: 'var(--primary-color)' }} />
            Contact Information
          </h3>

          <DetailRow icon={<Phone size={15} />} label="Phone" value={user?.phone || 'N/A'} />
          <DetailRow icon={<Mail size={15} />} label="Email" value={user?.email || 'N/A'} />
          <DetailRow icon={<Building2 size={15} />} label="Hospital / Clinic" value={user?.hospitalName || 'Not specified'} last />
        </div>
      </div>
    </div>
  );
}

function DetailRow({ icon, label, value, valueColor, last }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 0',
      borderBottom: last ? 'none' : '1px solid var(--border-color)'
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8,
        background: 'var(--bg-subtle)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--text-muted)', flexShrink: 0
      }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {label}
        </div>
        <div style={{ fontSize: 14, fontWeight: 500, color: valueColor || 'var(--text-main)', marginTop: 1, wordBreak: 'break-all' }}>
          {value}
        </div>
      </div>
    </div>
  );
}
