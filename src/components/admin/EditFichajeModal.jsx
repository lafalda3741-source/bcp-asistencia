import { useState } from 'react';
import { X, Save, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useToast } from '../../contexts/ToastContext.jsx';

function toLocalInputValue(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}

export default function EditFichajeModal({ fichaje, onClose, onSaved }) {
  const toast = useToast();
  const [fechaHora, setFechaHora] = useState(toLocalInputValue(fichaje.fecha_hora));
  const [motivo, setMotivo] = useState('');
  const [confirmando, setConfirmando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  async function confirmarGuardado() {
    if (!motivo.trim()) {
      toast.error('Indicá el motivo de la edición para el registro de auditoría.');
      return;
    }
    setGuardando(true);
    const nuevaFecha = new Date(fechaHora).toISOString();

    const { error: errAudit } = await supabase.from('auditoria').insert({
      fichaje_id: fichaje.id,
      accion: 'edicion',
      valores_anteriores: { fecha_hora: fichaje.fecha_hora },
      valores_nuevos: { fecha_hora: nuevaFecha, motivo },
      realizado_por: 'admin'
    });

    const { error } = await supabase
      .from('fichajes')
      .update({
        fecha_hora: nuevaFecha,
        editado_manualmente: true,
        editado_por: 'admin',
        editado_motivo: motivo
      })
      .eq('id', fichaje.id);

    setGuardando(false);
    if (error || errAudit) {
      toast.error('No se pudo guardar la edición.');
      return;
    }
    toast.success('Fichaje actualizado y auditado.');
    onSaved();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-lg text-slate-900">Editar fichaje</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-4">
          <p className="text-sm text-slate-500">
            Tipo: <span className="font-medium capitalize text-slate-800">{fichaje.tipo}</span>
          </p>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">
              Fecha y hora
            </label>
            <input
              type="datetime-local"
              value={fechaHora}
              onChange={(e) => setFechaHora(e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">
              Motivo de la edición *
            </label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={2}
              className="input-field"
              placeholder="Ej: olvido de fichaje, corrección de horario..."
            />
          </div>

          {!confirmando ? (
            <button
              onClick={() => setConfirmando(true)}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <Save size={16} />
              Guardar cambios
            </button>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle size={18} className="text-amber-600 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-800">
                  Vas a modificar un fichaje real. Esta acción queda registrada en auditoría.
                  ¿Confirmás?
                </p>
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => setConfirmando(false)} className="btn-secondary flex-1">
                  Cancelar
                </button>
                <button
                  onClick={confirmarGuardado}
                  disabled={guardando}
                  className="btn-primary flex-1"
                >
                  {guardando ? 'Guardando...' : 'Confirmar'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
