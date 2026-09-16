import { useEffect, useState } from 'react';
import { Save, Clock, Lock, Building2 } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { hashPin, isValidPinFormat } from '../../lib/pin';
import { validarPinAdmin } from '../../lib/authService';
import { useToast } from '../../contexts/ToastContext.jsx';
import Spinner from '../shared/Spinner.jsx';

export default function Settings() {
  const toast = useToast();
  const [config, setConfig] = useState(null);
  const [tolerancia, setTolerancia] = useState(10);
  const [nombreEmpresa, setNombreEmpresa] = useState('');
  const [guardandoTolerancia, setGuardandoTolerancia] = useState(false);
  const [guardandoEmpresa, setGuardandoEmpresa] = useState(false);

  const [pinActual, setPinActual] = useState('');
  const [pinNuevo, setPinNuevo] = useState('');
  const [pinConfirmar, setPinConfirmar] = useState('');
  const [cambiandoPin, setCambiandoPin] = useState(false);

  useEffect(() => {
    supabase
      .from('configuracion')
      .select('minutos_tolerancia, nombre_empresa')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data }) => {
        setConfig(data);
        setTolerancia(data?.minutos_tolerancia ?? 10);
        setNombreEmpresa(data?.nombre_empresa ?? 'BCP Asistencia');
      });
  }, []);

  async function guardarTolerancia() {
    setGuardandoTolerancia(true);
    const { error } = await supabase
      .from('configuracion')
      .update({ minutos_tolerancia: Number(tolerancia) })
      .eq('id', 1);
    setGuardandoTolerancia(false);
    if (error) return toast.error('No se pudo guardar.');
    toast.success('Tolerancia actualizada.');
  }

  async function guardarEmpresa() {
    setGuardandoEmpresa(true);
    const { error } = await supabase
      .from('configuracion')
      .update({ nombre_empresa: nombreEmpresa })
      .eq('id', 1);
    setGuardandoEmpresa(false);
    if (error) return toast.error('No se pudo guardar.');
    toast.success('Nombre de empresa actualizado.');
  }

  async function cambiarPin() {
    if (!isValidPinFormat(pinActual) || !isValidPinFormat(pinNuevo) || !isValidPinFormat(pinConfirmar)) {
      toast.error('Todos los PIN deben tener 4 dígitos.');
      return;
    }
    if (pinNuevo !== pinConfirmar) {
      toast.error('El nuevo PIN y su confirmación no coinciden.');
      return;
    }
    setCambiandoPin(true);
    const check = await validarPinAdmin(pinActual);
    if (!check.ok) {
      setCambiandoPin(false);
      toast.error('El PIN actual es incorrecto.');
      return;
    }
    const { error } = await supabase
      .from('configuracion')
      .update({ pin_admin_hash: hashPin(pinNuevo) })
      .eq('id', 1);
    setCambiandoPin(false);
    if (error) return toast.error('No se pudo cambiar el PIN.');
    toast.success('PIN de administrador actualizado.');
    setPinActual('');
    setPinNuevo('');
    setPinConfirmar('');
  }

  if (!config) return <Spinner />;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900">Configuración</h1>

      <div className="card mt-6 p-5">
        <h2 className="font-semibold text-slate-900 mb-1 flex items-center gap-2">
          <Building2 size={18} className="text-brand-blue" /> Empresa
        </h2>
        <p className="text-sm text-slate-500 mb-4">Nombre visible en el panel y la vista de empleados.</p>
        <div className="flex gap-3">
          <input
            value={nombreEmpresa}
            onChange={(e) => setNombreEmpresa(e.target.value)}
            className="input-field"
          />
          <button onClick={guardarEmpresa} disabled={guardandoEmpresa} className="btn-primary shrink-0">
            <Save size={16} />
          </button>
        </div>
      </div>

      <div className="card mt-6 p-5">
        <h2 className="font-semibold text-slate-900 mb-1 flex items-center gap-2">
          <Clock size={18} className="text-brand-blue" /> Margen de Tolerancia
        </h2>
        <p className="text-sm text-slate-500 mb-4">
          Minutos de margen para considerar un fichaje de entrada como puntual.
        </p>
        <div className="flex gap-3 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Minutos</label>
            <input
              type="number"
              min={0}
              value={tolerancia}
              onChange={(e) => setTolerancia(e.target.value)}
              className="input-field w-32"
            />
          </div>
          <button onClick={guardarTolerancia} disabled={guardandoTolerancia} className="btn-primary flex items-center gap-2">
            <Save size={16} />
            Guardar
          </button>
        </div>
      </div>

      <div className="card mt-6 p-5">
        <h2 className="font-semibold text-slate-900 mb-1 flex items-center gap-2">
          <Lock size={18} className="text-brand-blue" /> Cambiar PIN de Administrador
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
          <Campo label="PIN actual">
            <input
              inputMode="numeric"
              maxLength={4}
              value={pinActual}
              onChange={(e) => setPinActual(e.target.value.replace(/\D/g, '').slice(0, 4))}
              className="input-field"
            />
          </Campo>
          <Campo label="Nuevo PIN">
            <input
              inputMode="numeric"
              maxLength={4}
              placeholder="4 dígitos"
              value={pinNuevo}
              onChange={(e) => setPinNuevo(e.target.value.replace(/\D/g, '').slice(0, 4))}
              className="input-field"
            />
          </Campo>
          <Campo label="Confirmar PIN">
            <input
              inputMode="numeric"
              maxLength={4}
              placeholder="Repetir"
              value={pinConfirmar}
              onChange={(e) => setPinConfirmar(e.target.value.replace(/\D/g, '').slice(0, 4))}
              className="input-field"
            />
          </Campo>
        </div>
        <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mt-3">
          Si olvidás tu PIN no vas a poder acceder al panel. Guardalo en un lugar seguro.
        </p>
        <button onClick={cambiarPin} disabled={cambiandoPin} className="btn-primary mt-3 flex items-center gap-2">
          <Save size={16} />
          {cambiandoPin ? 'Cambiando...' : 'Cambiar PIN'}
        </button>
      </div>
    </div>
  );
}

function Campo({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">{label}</label>
      {children}
    </div>
  );
}
