import { useEffect, useState } from 'react';
import { CalendarClock, Plus, X, CheckCircle2, XCircle, Clock3 } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { calcularFechaFinHabil } from '../../lib/businessDays';
import { useToast } from '../../contexts/ToastContext.jsx';

const TIPOS = [
  { value: 'vacaciones', label: 'Vacaciones' },
  { value: 'licencia_medica', label: 'Licencia médica' },
  { value: 'feriado', label: 'Feriado' }
];

const ESTADO_UI = {
  pendiente: { texto: 'Pendiente', cls: 'bg-amber-100 text-amber-700', icon: Clock3 },
  aprobada: { texto: 'Aprobada', cls: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  rechazada: { texto: 'Rechazada', cls: 'bg-red-100 text-red-700', icon: XCircle }
};

const DISMISSED_KEY = 'bcp_licencia_banner_dismissed';

export default function EmployeeLicencias({ empleadoId }) {
  const toast = useToast();
  const [licencias, setLicencias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [bannerDescartado, setBannerDescartado] = useState(false);
  const [form, setForm] = useState({ tipo: 'vacaciones', fecha_inicio: '', dias: 1, observaciones: '' });
  const [enviando, setEnviando] = useState(false);

  async function cargar() {
    setCargando(true);
    const { data } = await supabase
      .from('justificaciones')
      .select('id, fecha_inicio, fecha_fin, cantidad_dias_habiles, tipo, observaciones, estado, decidido_en')
      .eq('empleado_id', empleadoId)
      .order('fecha_inicio', { ascending: false });
    setLicencias(data || []);
    setCargando(false);
  }

  useEffect(() => {
    cargar();
  }, [empleadoId]);

  // Banner: última licencia decidida (aprobada/rechazada) reciente y no descartada.
  const ultimaDecidida = licencias.find((l) => l.estado !== 'pendiente' && l.decidido_en);
  const dismissKey = ultimaDecidida ? `${DISMISSED_KEY}:${ultimaDecidida.id}` : null;
  useEffect(() => {
    if (dismissKey) setBannerDescartado(sessionStorage.getItem(dismissKey) === '1');
  }, [dismissKey]);

  function descartarBanner() {
    if (dismissKey) sessionStorage.setItem(dismissKey, '1');
    setBannerDescartado(true);
  }

  const fechaFinCalc =
    form.fecha_inicio && form.dias ? calcularFechaFinHabil(form.fecha_inicio, Number(form.dias)) : null;

  async function enviarSolicitud() {
    if (!form.fecha_inicio) {
      toast.error('Elegí una fecha de inicio.');
      return;
    }
    setEnviando(true);
    const { error } = await supabase.from('justificaciones').insert({
      empleado_id: empleadoId,
      fecha_inicio: form.fecha_inicio,
      cantidad_dias_habiles: Number(form.dias),
      fecha_fin: fechaFinCalc,
      tipo: form.tipo,
      observaciones: form.observaciones || null,
      estado: 'pendiente'
    });
    setEnviando(false);
    if (error) {
      toast.error('No se pudo enviar la solicitud.');
      return;
    }
    toast.success('Solicitud enviada. Quedó pendiente de aprobación.');
    setMostrarForm(false);
    setForm({ tipo: 'vacaciones', fecha_inicio: '', dias: 1, observaciones: '' });
    cargar();
  }

  return (
    <div className="w-full mt-6">
      {ultimaDecidida && !bannerDescartado && (
        <div
          className={`rounded-xl p-4 mb-4 flex items-start gap-3 ${
            ultimaDecidida.estado === 'rechazada' ? 'bg-red-50 border border-red-200' : 'bg-emerald-50 border border-emerald-200'
          }`}
        >
          {ultimaDecidida.estado === 'rechazada' ? (
            <XCircle className="text-red-500 shrink-0" size={20} />
          ) : (
            <CheckCircle2 className="text-emerald-500 shrink-0" size={20} />
          )}
          <div className="flex-1">
            <p className={`font-semibold text-sm ${ultimaDecidida.estado === 'rechazada' ? 'text-red-700' : 'text-emerald-700'}`}>
              Licencia {ultimaDecidida.estado === 'rechazada' ? 'rechazada' : 'aprobada'}
            </p>
            <p className="text-xs text-slate-500 mt-0.5 capitalize">
              {ultimaDecidida.tipo.replace('_', ' ')} · {formatear(ultimaDecidida.fecha_inicio)} →{' '}
              {formatear(ultimaDecidida.fecha_fin)}
            </p>
          </div>
          <button onClick={descartarBanner} className="text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>
      )}

      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="flex items-center gap-2 font-semibold text-slate-800 text-sm">
            <CalendarClock size={16} className="text-slate-500" />
            Licencias
          </h2>
          <button
            onClick={() => setMostrarForm((v) => !v)}
            className="flex items-center gap-1 text-xs font-medium text-brand-blue"
          >
            <Plus size={14} /> Nueva solicitud
          </button>
        </div>

        {mostrarForm && (
          <div className="bg-slate-50 rounded-xl p-4 mb-4 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <select
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                className="input-field text-sm"
              >
                {TIPOS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <select
                value={form.dias}
                onChange={(e) => setForm({ ...form, dias: e.target.value })}
                className="input-field text-sm"
              >
                {Array.from({ length: 15 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n} día(s) hábil(es)
                  </option>
                ))}
              </select>
            </div>
            <input
              type="date"
              value={form.fecha_inicio}
              onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })}
              className="input-field text-sm"
            />
            <input
              value={form.observaciones}
              onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
              placeholder="Observaciones (opcional)"
              className="input-field text-sm"
            />
            {fechaFinCalc && (
              <p className="text-xs text-slate-500">
                Fecha final estimada: <strong>{formatear(fechaFinCalc)}</strong>
              </p>
            )}
            <button
              onClick={enviarSolicitud}
              disabled={enviando}
              className="btn-primary w-full text-sm"
            >
              {enviando ? 'Enviando...' : 'Enviar solicitud'}
            </button>
          </div>
        )}

        {cargando ? (
          <p className="text-xs text-slate-400 text-center py-3">Cargando...</p>
        ) : licencias.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-3">No tenés licencias registradas.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {licencias.map((l) => {
              const est = ESTADO_UI[l.estado] || ESTADO_UI.aprobada;
              const Icon = est.icon;
              return (
                <div key={l.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-slate-800 capitalize">{l.tipo.replace('_', ' ')}</p>
                    <p className="text-xs text-slate-400">
                      {formatear(l.fecha_inicio)} → {formatear(l.fecha_fin)} · {l.cantidad_dias_habiles} días
                    </p>
                  </div>
                  <span className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${est.cls}`}>
                    <Icon size={12} /> {est.texto}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function formatear(fechaISOStr) {
  return new Date(fechaISOStr + 'T00:00:00').toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}
