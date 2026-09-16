import { Routes, Route, Navigate } from 'react-router-dom';
import AdminApp from './pages/AdminApp.jsx';
import EmployeeApp from './pages/EmployeeApp.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AdminApp />} />
      <Route path="/empleado/:token" element={<EmployeeApp />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
