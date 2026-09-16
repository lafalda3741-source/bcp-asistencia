import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import {
  validarPinEmpleado,
  getEmpleadoSession,
  setEmpleadoSession,
  clearEmpleadoSession
} from '../lib/authService';
import PinPad from '../components/employee/PinPad.jsx';
import ClockScreen from '../components/employee/ClockScreen.jsx';
import Spinner from '../components/shared/Spinner.jsx';
import Logo from '../components/shared/Logo.jsx';

export default function EmployeeApp() {
  const { token } = useParams();
  const [empleadoBase, setEmpleadoBase] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [validado, setValidado] = useState(null); // { empleadoId, nombre }
  const [errorPin, setErrorPin] = useState('');
  const [validando, setValidando] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function cargar() {
      const { data, error } = await supabase
        .from('empleados')
        .select('id, nombre, activo, horas_jornada, horarios_semanales')
        .eq('token_acceso', token)
        .maybeSingle();

      if (error || !data || !data.activo) {
        setNotFound(true);
        setCargando(false);
        return;
      }
      setEmpleadoBase(data);

      const sesion = getEmpleadoSession(token);
      if (sesion) setValidado(sesion);
      setCargando(false);
    }
    cargar();
  }, [token]);

  async function handlePin(pin) {
    setValidando(true);
    setErrorPin('');
    const res = await validarPinEmpleado(token, pin);
    setValidando(false);
    if (!res.ok) {
      setErrorPin(res.error);
      return;
    }
    setEmpleadoSession(token, res.empleadoId, res.nombre);
    setValidado({ empleadoId: res.empleadoId, nombre: res.nombre });
  }

  if (cargando) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <Spinner label="Cargando..." className="text-slate-300" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-navy-950 flex flex-col items-center justify-center px-6 text-center">
        <Logo size={48} dark />
        <div className="mt-8 w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center">
          <AlertTriangle className="text-red-400" size={26} />
        </div>
        <p className="text-white font-semibold mt-4">Enlace no válido</p>
        <p className="text-slate-400 text-sm mt-1 max-w-xs">
          El enlace de acceso no existe o el empleado fue dado de baja. Consultá con tu
          administrador.
        </p>
      </div>
    );
  }

  if (!validado) {
    return (
      <PinPad
        nombreEmpleado={empleadoBase?.nombre}
        onSubmit={handlePin}
        loading={validando}
        error={errorPin}
      />
    );
  }

  return (
    <ClockScreen
      empleado={{
        id: validado.empleadoId,
        nombre: validado.nombre || empleadoBase.nombre,
        horarios_semanales: empleadoBase.horarios_semanales
      }}
      onCerrarSesion={() => {
        clearEmpleadoSession(token);
        setValidado(null);
      }}
    />
  );
}
