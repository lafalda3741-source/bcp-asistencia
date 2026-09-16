import { useEffect, useState } from 'react';
import { ChevronLeft, MapPin } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { fechaISO } from '../../lib/timeCalculations';
import { mapaUrl } from '../../lib/excelExport';
import Spinner from '../shared/Spinner.jsx';

const TIPO_LABEL = {
  entrada: { texto: 'Entrada', cls: 'bg-emerald-100 text-emerald-700' },
  pausa: { texto: 'Pausa', cls: 'bg-amber-100 text-amber-700' },
  reanudacion: { texto: 'Reanudación', cls: 'bg-blue-100 text-blue-700' },
  salida: { texto: 'Salida', cls: 'bg-red-100 text-red-700' }
};

export default function EmployeeHistory({ empleadoId, onClose }) {
  const [fichajes, setFichajes] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const desde = new Date();
    desde.setDate(desde.getDate() - 14);
    supabase
      .from('fichajes')
      .select('id, tipo, fecha_hora, latitud, longitud')
      .eq('empleado_id', empleadoId)
      .gte('fecha_hora', desde.toISOString())
      .order('fecha_hora', { ascending: false })
      .then(({ data }) => {
        setFichajes(data || []);
        setCargando(false);
      });
  }, [empleadoId]);

  const porDia = {};
  fichajes.forEach((f) => {
    const key = fechaISO(f.fecha_hora);
    if (!porDia[key]) porDia[key] = [];
    porDia[key].push(f);
  });
  const dias = Object.keys(porDia).sort((a, b) => (a < b ? 1 : -1));

  return (
    <div className="fixed inset-0 bg-slate-50 z-50 overflow-y-auto">
      <header className="bg-navy-950 px-5 py-4 flex items-center gap-3 sticky top-0">
        <button onClick={onClose} className="text-white">
          <ChevronLeft size={22} />
        </button>
        <h1 className="text-white font-semibold">Mi historial</h1>
      </header>

      <main className="max-w-md mx-auto p-5">
        {cargando && <Spinner />}
        {!cargando && dias.length === 0 && (
          <p className="text-center text-sm text-slate-400 py-10">Todavía no tenés fichajes registrados.</p>
        )}
        {!cargando &&
          dias.map((dia) => (
            <div key={dia} className="card p-4 mb-3">
              <p className="text-sm font-medium text-slate-700 mb-2">{formatearFecha(dia)}</p>
              <div className="flex flex-col gap-1.5">
                {[...porDia[dia]].reverse().map((f) => (
                  <div key={f.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TIPO_LABEL[f.tipo].cls}`}>
                        {TIPO_LABEL[f.tipo].texto}
                      </span>
                      <span className="text-slate-700">
                        {new Date(f.fecha_hora).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {f.latitud != null && (
                      <a
                        href={mapaUrl(f.latitud, f.longitud)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-xs text-brand-blue"
                      >
                        <MapPin size={13} /> Mapa
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
      </main>
    </div>
  );
}

function formatearFecha(fechaStr) {
  const texto = new Date(fechaStr + 'T00:00:00').toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
