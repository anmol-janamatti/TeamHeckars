import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { LayoutDashboard, LogOut, Users, Plus, ChevronRight } from 'lucide-react';

export default function DoctorLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/'); };
  const displayName = user?.name?.replace(/^Dr\.?\s*/i, '') || '';
  const initials = displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'DR';
  const photoUrl = user?.photoUrl ? `http://localhost:3000/${user.photoUrl.replace(/\\/g, '/')}` : null;

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <h2>LifeLink</h2>
          <p>Doctor Portal</p>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/doctor/dashboard" end><LayoutDashboard size={16} /> Dashboard</NavLink>
          <NavLink to="/doctor/workspace"><Users size={16} /> Patient Workspace</NavLink>
          <div style={{ flex: 1 }} />
          <button onClick={handleLogout}><LogOut size={16} /> Sign Out</button>
        </nav>
        <div className="sidebar-user" onClick={() => navigate('/doctor/profile')} style={{ cursor: 'pointer' }}>
          <div className="user-info">
            {photoUrl ? (
              <img src={photoUrl} alt="Profile" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <div className="avatar">{initials}</div>
            )}
            <div style={{ flex: 1 }}>
              <div className="user-name">Dr. {displayName}</div>
              <div className="user-role">{user?.hospitalName || user?.stateCouncil || 'Doctor'}</div>
            </div>
            <ChevronRight size={14} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
          </div>
        </div>
      </aside>
      <main className="main-content fade-in"><Outlet /></main>
    </div>
  );
}
