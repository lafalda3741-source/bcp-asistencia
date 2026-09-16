import { useState } from 'react';
import { hasAdminSession, clearAdminSession } from '../lib/authService';
import AdminLogin from '../components/admin/AdminLogin.jsx';
import Sidebar from '../components/admin/Sidebar.jsx';
import AdminHeader from '../components/admin/AdminHeader.jsx';
import Dashboard from '../components/admin/Dashboard.jsx';
import Employees from '../components/admin/Employees.jsx';
import History from '../components/admin/History.jsx';
import Justifications from '../components/admin/Justifications.jsx';
import Settings from '../components/admin/Settings.jsx';

const SECCIONES = {
  panel: Dashboard,
  empleados: Employees,
  historial: History,
  justificaciones: Justifications,
  configuracion: Settings
};

export default function AdminApp() {
  const [autenticado, setAutenticado] = useState(hasAdminSession());
  const [seccion, setSeccion] = useState('panel');

  if (!autenticado) {
    return <AdminLogin onSuccess={() => setAutenticado(true)} />;
  }

  const Seccion = SECCIONES[seccion] || Dashboard;

  function salir() {
    clearAdminSession();
    setAutenticado(false);
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar activo={seccion} onChange={setSeccion} onSalir={salir} />
      <div className="flex-1 min-w-0">
        <AdminHeader onSalir={salir} />
        <main className="p-6 max-w-6xl mx-auto">
          <Seccion />
        </main>
      </div>
    </div>
  );
}
