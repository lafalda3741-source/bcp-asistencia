import { useEffect, useMemo, useRef, useState } from 'react';
import { LogIn, Pause, Play, LogOut, MapPin, Timer, X, History, CalendarDays } from 'lucide-react';
import Logo from '../shared/Logo.jsx';
import InstallButton from '../shared/InstallButton.jsx';
import DailyComment from './DailyComment.jsx';
import EmployeeLicencias from './EmployeeLicencias.jsx';
import EmployeeHistory from './EmployeeHistory.jsx';
import { supabase } from '../../lib/supabaseClient';
import { obtenerUbicacion, MENSAJE_UBICACION_OBLIGATORIA } from '../../lib/geolocation';
import { estadoActual, contadorEnVivo, nombreDia, fechaISO } from '../../lib/timeCalculations';
import { useToast } from '../../contexts/ToastContext.jsx';

const ESTADO_LABEL = {
  sin_iniciar: { texto: 'Sin iniciar', color: 'bg-slate-200 text-slate-700' },
  trabajando: { texto: 'Trabajando', color: 'bg-emerald-100 text-emerald-700' },
  en_pausa: { texto: 'En pausa', color: 'bg-amber-100 text-amber-700' },
  finalizado: { texto: 'Jornada finalizada', color: 'bg-slate-800 text-white' }
};

export default function ClockScreen({ empleado, onCerrarSesion }) {
  const toast = useToast();
  const [fichajesHoy, setFichajesHoy] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [contador, setContador] = useState('00:00:00');
  const [pausasTxt, setPausasTxt] = useState('00:00');
  const [verHistorial, setVerHistorial] = useState(false);
  const lastClickRef = useRef(0);

  const hoy = fechaISO();
  const horarioHoy = empleado.horarios_semanales?.[nombreDia(hoy + 'T00:00:00')];

  useEffect(() => {
    let activo = true;
    async function cargar() {
      const inicio = new Date();
      inicio.setHours(0, 0, 0, 0);
      const { data, error } = await supabase
        .from('fichajes')
        .select('id, tipo, fecha_hora, latitud, longitud')
        .eq('empleado_id', empleado.id)
        .gte('fecha_hora', inicio.toISOString())
        .order('fecha_hora', { ascending: true });
      if (activo && !error) setFichajesHoy(data || []);
      setCargando(false);
    }
    cargar();

    const canal = supabase
      .channel(`fichajes-empleado-${empleado.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'fichajes', filter: `empleado_id=eq.${empleado.id}` },
        () => cargar()
      )
      .subscribe();

    return () => {
      activo = false;
      supabase.removeChannel(canal);
    };
  }, [empleado.id]);

  const estado = useMemo(() => estadoActual(fichajesHoy), [fichajesHoy]);

  useEffect(() => {
    function actualizar() {
      setContador(contadorEnVivo(fichajesHoy));
      setPausasTxt(calcularPausas(fichajesHoy));
    }
    actualizar();
    if (estado !== 'trabajando' && estado !== 'en_pausa') return;
    const int = setInterval(actualizar, 1000);
    return () => clearInterval(int);
  }, [fichajesHoy, estado]);

  async function registrar(tipo) {
    const ahora = Date.now();
    if (ahora - lastClickRef.current < 1500) return;
    lastClickRef.current = ahora;

    setProcesando(true);
    try {
      const ubicacion = await obtenerUbicacion();
      const { error } = await supabase.from('fichajes').insert({
        empleado_id: empleado.id,
        tipo,
        fecha_hora: new Date().toISOString(),
        latitud: ubicacion.latitud,
        longitud: ubicacion.longitud,
        precision_m: ubicacion.precision_m
      });
      if (error) throw error;
      toast.success(mensajeExito(tipo));
    } catch (e) {
      toast.error(e.message || MENSAJE_UBICACION_OBLIGATORIA);
    } finally {
      setProcesando(false);
    }
  }

  const { texto, color } = ESTADO_LABEL[estado];
  const puedeEntrada = estado === 'sin_iniciar';
  const puedePausar = estado === 'trabajando';
  const puedeReanudar = estado === 'en_pausa';
  const puedeSalir = estado === 'trabajando';

  if (verHistorial) {
    return <EmployeeHistory empleadoId={empleado.id} onClose={() => setVerHistorial(false)} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header
        className="px-5 pt-5 pb-8 rounded-b-[32px] flex flex-col items-center"
        style={{ background: 'linear-gradient(160deg, #0B1E3D 0%, #1568D4 100%)' }}
      >
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center shrink-0">
              <Logo size={26} showText={false} />
            </div>
            <span className="text-white font-semibold">{empleado.nombre}</span>
          </div>
          {onCerrarSesion && (
            <button onClick={onCerrarSesion} className="text-white/70 hover:text-white">
              <X size={22} />
            </button>
          )}
        </div>

        <p className="text-blue-100 text-sm mt-5 text-center">{formatearFechaLarga(new Date())}</p>
        {horarioHoy?.activo ? (
          <p className="flex items-center gap-1.5 text-blue-200 text-xs mt-1">
            <CalendarDays size={13} />
            Horario: {horarioHoy.entrada} - {horarioHoy.salida}
          </p>
        ) : (
          <p className="text-blue-200 text-xs mt-1">Día no laborable</p>
        )}
      </header>

      <main className="flex-1 flex flex-col items-center px-5 -mt-6 pb-10 max-w-md mx-auto w-full">
        <div className="card w-full p-7 flex flex-col items-center">
          <span className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
            <Timer size={14} /> Trabajado hoy
          </span>
          <p className="text-4xl font-mono font-bold text-slate-900 tabular-nums mt-2">{contador}</p>
          <p className="text-xs text-slate-400 mt-1.5">
            Pausas: <span className="text-brand-orange font-medium">{pausasTxt}</span>
          </p>
        </div>

        <span className={`mt-4 px-4 py-1.5 rounded-full text-sm font-medium ${color}`}>{texto}</span>

        <div className="w-full mt-6 flex items-center gap-2 text-xs text-slate-400 justify-center">
          <MapPin size={14} />
          Cada registro solicita tu ubicación de forma obligatoria
        </div>

        <div className="w-full mt-5 flex flex-col gap-3">
          <BotonAccion
            icon={LogIn}
            label="Registrar Entrada"
            activo={puedeEntrada}
            colorActivo="bg-brand-green hover:bg-emerald-700"
            onClick={() => registrar('entrada')}
            disabled={procesando || cargando || !puedeEntrada}
          />
          <div className="grid grid-cols-2 gap-3">
            <BotonAccion
              icon={Pause}
              label="Pausar"
              activo={puedePausar}
              colorActivo="bg-brand-orange hover:bg-orange-600"
              onClick={() => registrar('pausa')}
              disabled={procesando || !puedePausar}
            />
            <BotonAccion
              icon={Play}
              label="Reanudar"
              activo={puedeReanudar}
              colorActivo="bg-brand-blue hover:bg-blue-700"
              onClick={() => registrar('reanudacion')}
              disabled={procesando || !puedeReanudar}
            />
          </div>
          <BotonAccion
            icon={LogOut}
            label="Registrar Salida"
            activo={puedeSalir}
            colorActivo="bg-brand-red hover:bg-red-600"
            onClick={() => registrar('salida')}
            disabled={procesando || !puedeSalir}
          />
        </div>

        <div className="w-full mt-8 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <Timer size={16} className="text-slate-500" /> Fichajes de hoy
          </h2>
          <button
            onClick={() => setVerHistorial(true)}
            className="flex items-center gap-1.5 text-sm text-brand-blue font-medium"
          >
            <History size={15} /> Ver historial
          </button>
        </div>
        <div className="w-full mt-3">
          {fichajesHoy.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-3">Sin fichajes todavía.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {fichajesHoy.map((f) => (
                <div key={f.id} className="flex items-center justify-between bg-white rounded-lg border border-slate-200 px-3 py-2 text-sm">
                  <span className="capitalize font-medium text-slate-700">{f.tipo}</span>
                  <span className="text-slate-500">
                    {new Date(f.fecha_hora).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <DailyComment empleadoId={empleado.id} />
        <EmployeeLicencias empleadoId={empleado.id} />

        <InstallButton className="mt-8" />
      </main>
    </div>
  );
}

function BotonAccion({ icon: Icon, label, activo, colorActivo, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-2xl py-5 flex items-center justify-center gap-2.5 text-base font-semibold shadow-sm transition-colors ${
        activo ? `${colorActivo} text-white` : 'bg-slate-100 text-slate-400 cursor-not-allowed'
      }`}
    >
      <Icon size={20} />
      {label}
    </button>
  );
}

function calcularPausas(fichajesDelDia) {
  const ordenados = [...fichajesDelDia].sort((a, b) => new Date(a.fecha_hora) - new Date(b.fecha_hora));
  let totalMs = 0;
  let pausaInicio = null;
  for (const f of ordenados) {
    if (f.tipo === 'pausa') pausaInicio = new Date(f.fecha_hora);
    else if (f.tipo === 'reanudacion' && pausaInicio) {
      totalMs += new Date(f.fecha_hora) - pausaInicio;
      pausaInicio = null;
    }
  }
  if (pausaInicio) totalMs += new Date() - pausaInicio;
  const mins = Math.floor(totalMs / 60000);
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
}

function mensajeExito(tipo) {
  return {
    entrada: 'Entrada registrada correctamente.',
    pausa: 'Pausa registrada.',
    reanudacion: 'Reanudaste tu jornada.',
    salida: 'Salida registrada. ¡Buen trabajo!'
  }[tipo];
}

function formatearFechaLarga(fecha) {
  const t = fecha.toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  return t.charAt(0).toUpperCase() + t.slice(1);
}
