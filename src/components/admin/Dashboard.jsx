import { useEffect, useMemo, useState } from 'react';
import { Users, PauseCircle, UserX, TrendingUp } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { estadoActual, fechaISO } from '../../lib/timeCalculations';
import Spinner from '../shared/Spinner.jsx';

export default function Dashboard() {
  const [empleados, setEmpleados] = useState([]);
  const [fichajesHoy, setFichajesHoy] = useState([]);
  const [justifsHoy, setJustifsHoy] = useState([]);
  const [cargando, setCargando] = useState(true);

  const hoy = fechaISO();

  async function cargar() {
    const inicio = new Date();
    inicio.setHours(0, 0, 0, 0);

    const [empRes, fichRes, justRes] = await Promise.all([
      supabase.from('empleados').select('id, nombre, activo').eq('activo', true),
      supabase
        .from('fichajes')
        .select('id, empleado_id, tipo, fecha_hora')
        .gte('fecha_hora', inicio.toISOString()),
      supabase
        .from('justificaciones')
        .select('empleado_id, fecha_inicio, fecha_fin')
        .lte('fecha_inicio', hoy)
        .gte('fecha_fin', hoy)
    ]);

    setEmpleados(empRes.data || []);
    setFichajesHoy(fichRes.data || []);
    setJustifsHoy(justRes.data || []);
    setCargando(false);
  }

  useEffect(() => {
    cargar();
    const canal = supabase
      .channel('dashboard-fichajes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fichajes' }, cargar)
      .subscribe();
    return () => supabase.removeChannel(canal);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resumen = useMemo(() => {
    const justificadosHoy = new Set(justifsHoy.map((j) => j.empleado_id));
    let trabajando = 0;
    let pausa = 0;
    let ausentes = 0;

    const actividad = empleados.map((emp) => {
      const propios = fichajesHoy.filter((f) => f.empleado_id === emp.id);
      const estado = justificadosHoy.has(emp.id) ? 'justificado' : estadoActual(propios);
      if (estado === 'trabajando') trabajando += 1;
      else if (estado === 'en_pausa') pausa += 1;
      else if (estado === 'sin_iniciar' || estado === 'justificado') ausentes += 1;
      const ultimo = [...propios].sort((a, b) => new Date(b.fecha_hora) - new Date(a.fecha_hora))[0];
      return { emp, estado, ultimaHora: ultimo?.fecha_hora };
    });

    return { trabajando, pausa, ausentes, actividad };
  }, [empleados, fichajesHoy, justifsHoy]);

  if (cargando) return <Spinner />;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">{formatearFechaLarga(new Date())}</h1>
      <p className="text-slate-500 text-sm mt-1">Resumen en tiempo real del estado de tu equipo</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
        <StatCard
          icon={Users}
          value={resumen.trabajando}
          label="Trabajando Ahora"
          from="from-emerald-500"
          to="to-emerald-600"
        />
        <StatCard
          icon={PauseCircle}
          value={resumen.pausa}
          label="En Pausa"
          from="from-amber-500"
          to="to-orange-500"
        />
        <StatCard
          icon={UserX}
          value={resumen.ausentes}
          label="Ausentes Hoy"
          from="from-red-500"
          to="to-rose-600"
        />
      </div>

      <div className="card mt-6 p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={18} className="text-brand-blue" />
          <h2 className="font-semibold text-slate-900">Actividad de Hoy</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {resumen.actividad.map(({ emp, estado }) => (
            <div key={emp.id} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-100 text-brand-blue flex items-center justify-center font-semibold text-sm">
                  {emp.nombre.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium text-slate-800">{emp.nombre}</span>
              </div>
              <EstadoBadge estado={estado} />
            </div>
          ))}
          {resumen.actividad.length === 0 && (
            <p className="text-sm text-slate-400 py-4 text-center">No hay empleados activos.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, value, label, from, to }) {
  return (
    <div className={`bg-gradient-to-br ${from} ${to} rounded-2xl p-6 text-white shadow-sm`}>
      <Icon size={22} />
      <p className="text-4xl font-bold mt-3">{value}</p>
      <p className="text-sm opacity-90 mt-0.5">{label}</p>
    </div>
  );
}

const ESTADOS = {
  trabajando: { texto: 'Trabajando', cls: 'bg-emerald-100 text-emerald-700' },
  en_pausa: { texto: 'En pausa', cls: 'bg-amber-100 text-amber-700' },
  finalizado: { texto: 'Finalizó', cls: 'bg-blue-100 text-blue-700' },
  sin_iniciar: { texto: 'Sin iniciar', cls: 'bg-slate-100 text-slate-500' },
  justificado: { texto: 'Justificado', cls: 'bg-purple-100 text-purple-700' }
};

function EstadoBadge({ estado }) {
  const e = ESTADOS[estado] || ESTADOS.sin_iniciar;
  return <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${e.cls}`}>{e.texto}</span>;
}

function formatearFechaLarga(fecha) {
  const texto = fecha.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
