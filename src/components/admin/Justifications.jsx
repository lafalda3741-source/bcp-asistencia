import { useEffect, useState } from 'react';
import { Plus, Trash2, CalendarDays, CheckCircle2, XCircle, Clock3 } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { calcularFechaFinHabil } from '../../lib/businessDays';
import { useToast } from '../../contexts/ToastContext.jsx';
import Spinner from '../shared/Spinner.jsx';

const TIPOS = [
  { value: 'vacaciones', label: 'Vacaciones' },
  { value: 'licencia_medica', label: 'Licencia médica' },
  { value: 'feriado', label: 'Feriado' }
];

export default function Justifications() {
  const toast = useToast();
  const [empleados, setEmpleados] = useState([]);
  const [justificaciones, setJustificaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [form, setForm] = useState({
    empleado_id: '',
    fecha_inicio: '',
    cantidad_dias_habiles: 1,
    tipo: 'vacaciones',
    observaciones: ''
  });
  const [guardando, setGuardando] = useState(false);

  async function cargar() {
    setCargando(true);
    const [{ data: emp }, { data: just }] = await Promise.all([
      supabase.from('empleados').select('id, nombre').eq('activo', true).order('nombre'),
      supabase
        .from('justificaciones')
        .select('id, empleado_id, fecha_inicio, fecha_fin, cantidad_dias_habiles, tipo, observaciones, estado')
        .order('fecha_inicio', { ascending: false })
    ]);
    setEmpleados(emp || []);
    setJustificaciones(just || []);
    setCargando(false);
  }

  useEffect(() => {
    cargar();
  }, []);

  const fechaFinCalculada =
    form.fecha_inicio && form.cantidad_dias_habiles
      ? calcularFechaFinHabil(form.fecha_inicio, Number(form.cantidad_dias_habiles))
      : null;

  async function crear() {
    if (!form.empleado_id || !form.fecha_inicio) {
      toast.error('Seleccioná empleado y fecha inicial.');
      return;
    }
    setGuardando(true);
    const { error } = await supabase.from('justificaciones').insert({
      empleado_id: form.empleado_id,
      fecha_inicio: form.fecha_inicio,
      cantidad_dias_habiles: Number(form.cantidad_dias_habiles),
      fecha_fin: fechaFinCalculada,
      tipo: form.tipo,
      observaciones: form.observaciones || null,
      estado: 'aprobada',
      decidido_por: 'admin',
      decidido_en: new Date().toISOString()
    });
    setGuardando(false);
    if (error) {
      toast.error('No se pudo crear la justificación.');
      return;
    }
    toast.success('Justificación registrada.');
    setForm({ empleado_id: '', fecha_inicio: '', cantidad_dias_habiles: 1, tipo: 'vacaciones', observaciones: '' });
    cargar();
  }

  async function decidir(id, estado) {
    const { error } = await supabase
      .from('justificaciones')
      .update({ estado, decidido_por: 'admin', decidido_en: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      toast.error('No se pudo actualizar la solicitud.');
      return;
    }
    toast.success(estado === 'aprobada' ? 'Solicitud aprobada.' : 'Solicitud rechazada.');
    cargar();
  }

  async function eliminar(id) {
    if (!confirm('¿Eliminar esta justificación?')) return;
    const { error } = await supabase.from('justificaciones').delete().eq('id', id);
    if (error) {
      toast.error('No se pudo eliminar.');
      return;
    }
    toast.success('Justificación eliminada.');
    cargar();
  }

  function nombreDe(id) {
    return empleados.find((e) => e.id === id)?.nombre || 'Empleado eliminado';
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Justificaciones</h1>
      <p className="text-slate-500 text-sm mt-0.5">
        Vacaciones, licencias médicas y feriados. No generan tiempo pendiente.
      </p>

      <div className="card mt-6 p-5">
        <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Plus size={18} className="text-brand-blue" /> Nueva justificación
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <div className="lg:col-span-1">
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Empleado</label>
            <select
              value={form.empleado_id}
              onChange={(e) => setForm({ ...form, empleado_id: e.target.value })}
              className="input-field"
            >
              <option value="">Seleccionar...</option>
              {empleados.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Fecha inicial</label>
            <input
              type="date"
              value={form.fecha_inicio}
              onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Tipo</label>
            <select
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value })}
              className="input-field"
            >
              {TIPOS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Días hábiles</label>
            <select
              value={form.cantidad_dias_habiles}
              onChange={(e) => setForm({ ...form, cantidad_dias_habiles: e.target.value })}
              className="input-field"
            >
              {Array.from({ length: 30 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <button onClick={crear} disabled={guardando} className="btn-primary h-[42px]">
            {guardando ? 'Guardando...' : 'Registrar'}
          </button>
        </div>
        <input
          value={form.observaciones}
          onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
          placeholder="Observaciones (opcional)"
          className="input-field mt-3"
        />
        {fechaFinCalculada && (
          <p className="text-sm text-slate-500 mt-3 flex items-center gap-1.5">
            <CalendarDays size={15} />
            Fecha final calculada (excluyendo fines de semana):{' '}
            <strong className="text-slate-800">{formatear(fechaFinCalculada)}</strong>
          </p>
        )}
      </div>

      <div className="card mt-6 divide-y divide-slate-100">
        {cargando && <Spinner />}
        {!cargando && justificaciones.length === 0 && (
          <p className="text-center text-sm text-slate-400 py-8">No hay justificaciones registradas.</p>
        )}
        {!cargando &&
          justificaciones.map((j) => (
            <div key={j.id} className="flex items-center justify-between px-5 py-4 gap-3 flex-wrap">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-slate-800">{nombreDe(j.empleado_id)}</p>
                  <EstadoBadge estado={j.estado} />
                </div>
                <p className="text-xs text-slate-400 capitalize">
                  {j.tipo.replace('_', ' ')} · {formatear(j.fecha_inicio)} a {formatear(j.fecha_fin)} (
                  {j.cantidad_dias_habiles} días hábiles)
                </p>
                {j.observaciones && <p className="text-xs text-slate-400 mt-0.5">{j.observaciones}</p>}
              </div>
              <div className="flex items-center gap-3">
                {j.estado === 'pendiente' && (
                  <>
                    <button
                      onClick={() => decidir(j.id, 'aprobada')}
                      className="text-xs font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                    >
                      <CheckCircle2 size={14} /> Aprobar
                    </button>
                    <button
                      onClick={() => decidir(j.id, 'rechazada')}
                      className="text-xs font-medium text-red-600 hover:text-red-700 flex items-center gap-1"
                    >
                      <XCircle size={14} /> Rechazar
                    </button>
                  </>
                )}
                <button onClick={() => eliminar(j.id)} className="text-slate-400 hover:text-red-600">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

const ESTADO_UI = {
  pendiente: { texto: 'Pendiente', cls: 'bg-amber-100 text-amber-700', icon: Clock3 },
  aprobada: { texto: 'Aprobada', cls: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  rechazada: { texto: 'Rechazada', cls: 'bg-red-100 text-red-700', icon: XCircle }
};

function EstadoBadge({ estado }) {
  const e = ESTADO_UI[estado] || ESTADO_UI.aprobada;
  const Icon = e.icon;
  return (
    <span className={`flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${e.cls}`}>
      <Icon size={11} /> {e.texto}
    </span>
  );
}

function formatear(fechaISOStr) {
  return new Date(fechaISOStr + 'T00:00:00').toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}
