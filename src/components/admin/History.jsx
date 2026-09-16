import { useEffect, useMemo, useState } from 'react';
import { Download, FileText, MapPin, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useToast } from '../../contexts/ToastContext.jsx';
import {
  calcularResumenDia,
  minutosAHHMM,
  nombreDia,
  fechaISO
} from '../../lib/timeCalculations';
import { exportarReporteExcel, mapaUrl } from '../../lib/excelExport';
import EditFichajeModal from './EditFichajeModal.jsx';
import Spinner from '../shared/Spinner.jsx';

const TIPO_LABEL = {
  entrada: { texto: 'Entrada', cls: 'bg-emerald-100 text-emerald-700' },
  pausa: { texto: 'Pausa', cls: 'bg-amber-100 text-amber-700' },
  reanudacion: { texto: 'Reanudación', cls: 'bg-blue-100 text-blue-700' },
  salida: { texto: 'Salida', cls: 'bg-red-100 text-red-700' }
};

function hace8dias() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return fechaISO(d);
}

export default function History() {
  const toast = useToast();
  const [empleados, setEmpleados] = useState([]);
  const [empleadoFiltro, setEmpleadoFiltro] = useState('todos');
  const [desde, setDesde] = useState(hace8dias());
  const [hasta, setHasta] = useState(fechaISO());
  const [fichajes, setFichajes] = useState([]);
  const [justificaciones, setJustificaciones] = useState([]);
  const [tolerancia, setTolerancia] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [editando, setEditando] = useState(null);

  useEffect(() => {
    supabase
      .from('empleados')
      .select('id, nombre, horas_jornada, horarios_semanales')
      .order('nombre')
      .then(({ data }) => setEmpleados(data || []));
    supabase
      .from('configuracion')
      .select('minutos_tolerancia')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data }) => setTolerancia(data?.minutos_tolerancia || 0));
  }, []);

  async function cargar() {
    setCargando(true);
    const inicio = new Date(desde + 'T00:00:00').toISOString();
    const fin = new Date(hasta + 'T23:59:59').toISOString();

    let fichajesQ = supabase
      .from('fichajes')
      .select('id, empleado_id, tipo, fecha_hora, latitud, longitud, precision_m, editado_manualmente')
      .gte('fecha_hora', inicio)
      .lte('fecha_hora', fin)
      .order('fecha_hora', { ascending: true });
    let justifQ = supabase
      .from('justificaciones')
      .select('id, empleado_id, fecha_inicio, fecha_fin, tipo, observaciones')
      .lte('fecha_inicio', hasta)
      .gte('fecha_fin', desde);

    if (empleadoFiltro !== 'todos') {
      fichajesQ = fichajesQ.eq('empleado_id', empleadoFiltro);
      justifQ = justifQ.eq('empleado_id', empleadoFiltro);
    }

    const [{ data: f }, { data: j }] = await Promise.all([fichajesQ, justifQ]);
    setFichajes(f || []);
    setJustificaciones(j || []);
    setCargando(false);
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desde, hasta, empleadoFiltro]);

  const empleadosMostrados = useMemo(
    () => (empleadoFiltro === 'todos' ? empleados : empleados.filter((e) => e.id === empleadoFiltro)),
    [empleados, empleadoFiltro]
  );

  const dataPorEmpleado = useMemo(() => {
    return empleadosMostrados.map((emp) => {
      const propios = fichajes.filter((f) => f.empleado_id === emp.id);
      const justifsPropias = justificaciones.filter((j) => j.empleado_id === emp.id);

      const fechasSet = new Set([
        ...propios.map((f) => fechaISO(f.fecha_hora)),
        ...justifsPropias.flatMap((j) => diasEnRango(j.fecha_inicio, j.fecha_fin))
      ]);
      const fechas = [...fechasSet].sort((a, b) => (a < b ? 1 : -1));

      const dias = fechas.map((fecha) => {
        const fichajesDelDia = propios.filter((f) => fechaISO(f.fecha_hora) === fecha);
        const justif = justifsPropias.find((j) => fecha >= j.fecha_inicio && fecha <= j.fecha_fin);
        const horarioDia = emp.horarios_semanales?.[nombreDia(fecha + 'T00:00:00')];
        const resumen = calcularResumenDia({
          fichajesDelDia,
          horarioDia,
          fecha,
          toleranciaMin: tolerancia,
          tieneJustificacion: !!justif
        });
        return { fecha, fichajesDelDia, justif, resumen };
      });

      return { emp, dias, totalRegistros: propios.length };
    });
  }, [empleadosMostrados, fichajes, justificaciones, tolerancia]);

  async function eliminarFichaje(f) {
    if (!confirm('¿Eliminar este fichaje? Esta acción no se puede deshacer.')) return;
    await supabase.from('auditoria').insert({
      fichaje_id: f.id,
      accion: 'eliminacion',
      valores_anteriores: f,
      realizado_por: 'admin'
    });
    const { error } = await supabase.from('fichajes').delete().eq('id', f.id);
    if (error) {
      toast.error('No se pudo eliminar el fichaje.');
      return;
    }
    toast.success('Fichaje eliminado.');
    cargar();
  }

  function exportar() {
    const filas = [];
    dataPorEmpleado.forEach(({ emp, dias }) => {
      dias.forEach(({ fecha, fichajesDelDia, justif, resumen }) => {
        const entrada = fichajesDelDia.find((f) => f.tipo === 'entrada');
        const salida = [...fichajesDelDia].reverse().find((f) => f.tipo === 'salida');
        const pausas = fichajesDelDia.filter((f) => f.tipo === 'pausa' || f.tipo === 'reanudacion');
        const conCoords = fichajesDelDia.find((f) => f.latitud != null);

        filas.push({
          fecha,
          empleado: emp.nombre,
          entrada: entrada ? new Date(entrada.fecha_hora).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : null,
          pausas: pausas
            .map((p) => `${p.tipo}: ${new Date(p.fecha_hora).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`)
            .join(' / '),
          salida: salida ? new Date(salida.fecha_hora).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : null,
          coordenadas: conCoords ? `${conCoords.latitud.toFixed(4)}, ${conCoords.longitud.toFixed(4)}` : null,
          mapaUrl: conCoords ? mapaUrl(conCoords.latitud, conCoords.longitud) : null,
          trabajadoMin: resumen.trabajadoMin,
          extraMin: resumen.extraMin,
          pendienteMin: resumen.pendienteMin,
          balanceMin: resumen.balanceMin,
          justificacion: justif ? justif.tipo : null,
          tipoJustificacion: justif?.tipo
        });
      });
    });

    if (filas.length === 0) {
      toast.info('No hay datos para exportar en el período seleccionado.');
      return;
    }
    exportarReporteExcel(filas, `bcp-asistencia_${desde}_a_${hasta}.xlsx`);
    toast.success('Reporte exportado.');
  }

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Historial de Fichajes</h1>
          <p className="text-slate-500 text-sm mt-0.5">Período editable</p>
        </div>
        <button onClick={exportar} className="btn-primary flex items-center gap-2">
          <Download size={16} />
          Exportar Excel
        </button>
      </div>

      <div className="card mt-6 p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Empleado</label>
          <select
            value={empleadoFiltro}
            onChange={(e) => setEmpleadoFiltro(e.target.value)}
            className="input-field"
          >
            <option value="todos">Todos los empleados</option>
            {empleados.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Desde</label>
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="input-field" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Hasta</label>
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="input-field" />
        </div>
      </div>

      {cargando && <Spinner className="mt-6" />}

      {!cargando &&
        dataPorEmpleado.map(({ emp, dias, totalRegistros }) => (
          <div key={emp.id} className="card mt-6 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-100 text-brand-blue flex items-center justify-center font-semibold text-sm">
                  {emp.nombre.charAt(0).toUpperCase()}
                </div>
                <h3 className="font-semibold text-slate-900">{emp.nombre}</h3>
              </div>
              <span className="text-xs text-slate-400">{totalRegistros} registro(s)</span>
            </div>

            {dias.length === 0 && (
              <p className="text-sm text-slate-400 py-3">Sin actividad en el período.</p>
            )}

            <div className="divide-y divide-slate-100">
              {dias.map(({ fecha, fichajesDelDia, justif, resumen }) => (
                <div key={fecha} className="py-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-slate-700">{formatearFecha(fecha)}</p>
                    {justif && (
                      <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full capitalize">
                        {justif.tipo.replace('_', ' ')}
                      </span>
                    )}
                  </div>

                  {justif ? (
                    <p className="text-sm text-blue-700 bg-blue-50 rounded-lg px-3 py-2">
                      Licencia aprobada: <strong className="capitalize">{justif.tipo.replace('_', ' ')}</strong>.
                      No genera tiempo pendiente.
                    </p>
                  ) : (
                    <>
                      <div className="grid grid-cols-4 gap-2 mb-3">
                        <MiniStat label="Trabajado" value={minutosAHHMM(resumen.trabajadoMin)} />
                        <MiniStat label="Extras" value={minutosAHHMM(resumen.extraMin)} color="text-emerald-600" />
                        <MiniStat label="Pendiente" value={minutosAHHMM(resumen.pendienteMin)} color="text-red-600" />
                        <MiniStat
                          label="Balance"
                          value={(resumen.balanceMin >= 0 ? '+' : '') + minutosAHHMM(resumen.balanceMin)}
                          color={resumen.balanceMin >= 0 ? 'text-emerald-600' : 'text-red-600'}
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        {fichajesDelDia.map((f) => (
                          <div
                            key={f.id}
                            className="flex items-center justify-between text-sm bg-slate-50 rounded-lg px-3 py-2"
                          >
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TIPO_LABEL[f.tipo].cls}`}>
                                {TIPO_LABEL[f.tipo].texto}
                              </span>
                              <span className="text-slate-700">
                                {new Date(f.fecha_hora).toLocaleTimeString('es-AR', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                              {f.editado_manualmente && (
                                <span className="text-[10px] text-amber-600 font-medium">(editado)</span>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              {f.latitud != null && (
                                <a
                                  href={mapaUrl(f.latitud, f.longitud)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex items-center gap-1 text-xs text-brand-blue hover:underline"
                                >
                                  <MapPin size={13} /> Ver mapa
                                </a>
                              )}
                              <button onClick={() => setEditando(f)} className="text-slate-400 hover:text-brand-blue">
                                <Pencil size={14} />
                              </button>
                              <button onClick={() => eliminarFichaje(f)} className="text-slate-400 hover:text-red-600">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                        {fichajesDelDia.length === 0 && (
                          <p className="text-xs text-slate-400">Sin fichajes este día.</p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

      {!cargando && dataPorEmpleado.length === 0 && (
        <div className="card mt-6 p-10 text-center text-slate-400 flex flex-col items-center gap-2">
          <FileText size={28} />
          No hay datos para los filtros seleccionados.
        </div>
      )}

      {editando && (
        <EditFichajeModal
          fichaje={editando}
          onClose={() => setEditando(null)}
          onSaved={() => {
            setEditando(null);
            cargar();
          }}
        />
      )}
    </div>
  );
}

function MiniStat({ label, value, color = 'text-slate-800' }) {
  return (
    <div className="bg-slate-50 rounded-lg px-3 py-2 text-center">
      <p className="text-[10px] text-slate-400 uppercase font-medium">{label}</p>
      <p className={`text-sm font-semibold ${color}`}>{value}</p>
    </div>
  );
}

function diasEnRango(inicio, fin) {
  const dias = [];
  let cursor = new Date(inicio + 'T00:00:00');
  const finDate = new Date(fin + 'T00:00:00');
  while (cursor <= finDate) {
    dias.push(fechaISO(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dias;
}

function formatearFecha(fechaStr) {
  const texto = new Date(fechaStr + 'T00:00:00').toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
