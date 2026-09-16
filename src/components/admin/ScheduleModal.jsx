import { useState } from 'react';
import { X, Save } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useToast } from '../../contexts/ToastContext.jsx';

const DIAS = [
  ['lunes', 'Lunes'],
  ['martes', 'Martes'],
  ['miercoles', 'Miércoles'],
  ['jueves', 'Jueves'],
  ['viernes', 'Viernes'],
  ['sabado', 'Sábado'],
  ['domingo', 'Domingo']
];

export default function ScheduleModal({ empleado, onClose, onSaved }) {
  const toast = useToast();
  const [horarios, setHorarios] = useState(() => JSON.parse(JSON.stringify(empleado.horarios_semanales)));
  const [guardando, setGuardando] = useState(false);

  function toggleDia(dia) {
    setHorarios((prev) => ({
      ...prev,
      [dia]: {
        ...prev[dia],
        activo: !prev[dia].activo,
        entrada: !prev[dia].activo ? prev[dia].entrada || '08:00' : prev[dia].entrada,
        salida: !prev[dia].activo ? prev[dia].salida || '16:00' : prev[dia].salida
      }
    }));
  }

  function setHora(dia, campo, valor) {
    setHorarios((prev) => ({ ...prev, [dia]: { ...prev[dia], [campo]: valor } }));
  }

  async function guardar() {
    setGuardando(true);
    const { error } = await supabase
      .from('empleados')
      .update({ horarios_semanales: horarios })
      .eq('id', empleado.id);
    setGuardando(false);
    if (error) {
      toast.error('No se pudieron guardar los horarios.');
      return;
    }
    toast.success('Horarios actualizados.');
    onSaved({ ...empleado, horarios_semanales: horarios });
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-lg text-slate-900">Horarios · {empleado.nombre}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-3">
          {DIAS.map(([key, label]) => {
            const dia = horarios[key] || { activo: false };
            return (
              <div
                key={key}
                className="flex items-center justify-between gap-3 bg-slate-50 rounded-xl px-4 py-3"
              >
                <label className="flex items-center gap-3 cursor-pointer">
                  <Switch checked={dia.activo} onChange={() => toggleDia(key)} />
                  <span className={`text-sm font-medium ${dia.activo ? 'text-slate-800' : 'text-slate-400'}`}>
                    {label}
                  </span>
                </label>
                {dia.activo ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={dia.entrada || '08:00'}
                      onChange={(e) => setHora(key, 'entrada', e.target.value)}
                      className="text-sm rounded-lg border border-slate-300 px-2 py-1.5"
                    />
                    <span className="text-slate-400">×</span>
                    <input
                      type="time"
                      value={dia.salida || '16:00'}
                      onChange={(e) => setHora(key, 'salida', e.target.value)}
                      className="text-sm rounded-lg border border-slate-300 px-2 py-1.5"
                    />
                  </div>
                ) : (
                  <span className="text-sm text-slate-400">No trabaja</span>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button onClick={guardar} disabled={guardando} className="btn-primary flex items-center gap-2">
            <Save size={16} />
            {guardando ? 'Guardando...' : 'Guardar horarios'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Switch({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`w-11 h-6 rounded-full transition-colors relative ${
        checked ? 'bg-brand-blue' : 'bg-slate-300'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
          checked ? 'translate-x-5' : ''
        }`}
      />
    </button>
  );
}
