import { useEffect, useState } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { fechaISO } from '../../lib/timeCalculations';
import { useToast } from '../../contexts/ToastContext.jsx';

export default function DailyComment({ empleadoId }) {
  const toast = useToast();
  const [texto, setTexto] = useState('');
  const [guardando, setGuardando] = useState(false);
  const hoy = fechaISO();

  useEffect(() => {
    let activo = true;
    supabase
      .from('comentarios_diarios')
      .select('comentario')
      .eq('empleado_id', empleadoId)
      .eq('fecha', hoy)
      .maybeSingle()
      .then(({ data }) => {
        if (activo && data) setTexto(data.comentario || '');
      });
    return () => {
      activo = false;
    };
  }, [empleadoId, hoy]);

  async function guardar() {
    setGuardando(true);
    const { error } = await supabase
      .from('comentarios_diarios')
      .upsert(
        { empleado_id: empleadoId, fecha: hoy, comentario: texto },
        { onConflict: 'empleado_id,fecha' }
      );
    setGuardando(false);
    if (error) {
      toast.error('No se pudo guardar el comentario.');
      return;
    }
    toast.success('Comentario guardado.');
  }

  return (
    <div className="card w-full mt-6 p-5">
      <h2 className="flex items-center gap-2 font-semibold text-slate-800 text-sm mb-3">
        <MessageSquare size={16} className="text-slate-500" />
        Comentario del día
      </h2>
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={3}
        placeholder="Escribe un comentario o nota sobre tu jornada (se incluye en el Excel)..."
        className="input-field resize-none"
      />
      <button
        onClick={guardar}
        disabled={guardando}
        className="btn-primary w-full mt-3 flex items-center justify-center gap-2"
      >
        <Send size={16} />
        {guardando ? 'Guardando...' : 'Guardar comentario'}
      </button>
    </div>
  );
}
