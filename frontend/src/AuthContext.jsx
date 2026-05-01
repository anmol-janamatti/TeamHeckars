import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null); // 'doctor' | 'patient'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const savedRole = localStorage.getItem('role');
    const savedToken = localStorage.getItem('token');
    
    if (savedUser && savedRole && savedToken) {
      setUser(JSON.parse(savedUser));
      setRole(savedRole);
    } else {
      // Clear any corrupted partial state
      localStorage.removeItem('user');
      localStorage.removeItem('role');
      localStorage.removeItem('token');
      localStorage.removeItem('consentToken');
    }
    setLoading(false);
  }, []);

  const loginDoctor = (doctor, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(doctor));
    localStorage.setItem('role', 'doctor');
    setUser(doctor);
    setRole('doctor');
  };

  const loginPatient = (patient, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(patient));
    localStorage.setItem('role', 'patient');
    localStorage.setItem('consentToken', token);
    setUser(patient);
    setRole('patient');
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('role');
    localStorage.removeItem('consentToken');
    setUser(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, loginDoctor, loginPatient, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
