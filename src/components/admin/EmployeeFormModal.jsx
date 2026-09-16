import { useState } from 'react';
import { X, Save } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { hashPin, isValidPinFormat } from '../../lib/pin';
import { useToast } from '../../contexts/ToastContext.jsx';

export default function EmployeeFormModal({ empleado, onClose, onSaved }) {
  const toast = useToast();
  const esEdicion = !!empleado;
  const [form, setForm] = useState({
    nombre: empleado?.nombre || '',
    legajo: empleado?.legajo || '',
    correo: empleado?.correo || '',
    telefono: empleado?.telefono || '',
    pin: '',
    horas_jornada: empleado?.horas_jornada || '08:00'
  });
  const [guardando, setGuardando] = useState(false);
  const [errores, setErrores] = useState({});

  function validar() {
    const err = {};
    if (!form.nombre.trim()) err.nombre = 'El nombre es obligatorio.';
    if (!esEdicion && !isValidPinFormat(form.pin)) err.pin = 'El PIN debe tener 4 dígitos.';
    if (esEdicion && form.pin && !isValidPinFormat(form.pin)) err.pin = 'El PIN debe tener 4 dígitos.';
    setErrores(err);
    return Object.keys(err).length === 0;
  }

  async function guardar() {
    if (!validar()) return;
    setGuardando(true);

    const payload = {
      nombre: form.nombre.trim(),
      legajo: form.legajo.trim() || null,
      correo: form.correo.trim() || null,
      telefono: form.telefono.trim() || null,
      horas_jornada: form.horas_jornada
    };
    if (form.pin) payload.pin_hash = hashPin(form.pin);

    let error;
    if (esEdicion) {
      ({ error } = await supabase.from('empleados').update(payload).eq('id', empleado.id));
    } else {
      ({ error } = await supabase.from('empleados').insert(payload));
    }

    setGuardando(false);
    if (error) {
      toast.error('No se pudo guardar el empleado.');
      return;
    }
    toast.success(esEdicion ? 'Empleado actualizado.' : 'Empleado creado.');
    onSaved();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-lg text-slate-900">
            {esEdicion ? 'Editar Empleado' : 'Nuevo Empleado'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-4">
          <Campo label="Nombre completo *" error={errores.nombre}>
            <input
              className="input-field"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            />
          </Campo>

          <div className="grid grid-cols-2 gap-3">
            <Campo label="Legajo / ID">
              <input
                className="input-field"
                placeholder="EMP-001"
                value={form.legajo}
                onChange={(e) => setForm({ ...form, legajo: e.target.value })}
              />
            </Campo>
            <Campo label={`PIN (4 dígitos) ${esEdicion ? '' : '*'}`} error={errores.pin}>
              <input
                className="input-field"
                inputMode="numeric"
                maxLength={4}
                placeholder={esEdicion ? 'Dejar vacío para no cambiar' : '1234'}
                value={form.pin}
                onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
              />
            </Campo>
          </div>

          <Campo label="Correo electrónico">
            <input
              type="email"
              className="input-field"
              value={form.correo}
              onChange={(e) => setForm({ ...form, correo: e.target.value })}
            />
          </Campo>

          <Campo label="Teléfono / WhatsApp">
            <input
              className="input-field"
              placeholder="+54 9 11 1234-5678"
              value={form.telefono}
              onChange={(e) => setForm({ ...form, telefono: e.target.value })}
            />
          </Campo>

          <Campo label="Horas de jornada (hh:mm)">
            <input
              className="input-field"
              placeholder="08:00"
              value={form.horas_jornada}
              onChange={(e) => setForm({ ...form, horas_jornada: e.target.value })}
            />
          </Campo>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button onClick={guardar} disabled={guardando} className="btn-primary flex items-center gap-2">
            <Save size={16} />
            {guardando ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Campo({ label, error, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
        {label}
      </label>
      {children}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}
