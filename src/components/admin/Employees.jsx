import { useEffect, useMemo, useState } from 'react';
import { Search, Plus, Clock, MessageCircle, Link2, Pencil, Trash2, Check } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useToast } from '../../contexts/ToastContext.jsx';
import EmployeeFormModal from './EmployeeFormModal.jsx';
import ScheduleModal from './ScheduleModal.jsx';
import Spinner from '../shared/Spinner.jsx';

export default function Employees() {
  const toast = useToast();
  const [empleados, setEmpleados] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [modalForm, setModalForm] = useState(null); // null | {} | empleado
  const [modalHorario, setModalHorario] = useState(null);
  const [copiadoId, setCopiadoId] = useState(null);

  async function cargar() {
    setCargando(true);
    const { data, error } = await supabase
      .from('empleados')
      .select('id, nombre, legajo, correo, telefono, token_acceso, horas_jornada, horarios_semanales, activo')
      .order('nombre');
    if (!error) setEmpleados(data || []);
    setCargando(false);
  }

  useEffect(() => {
    cargar();
  }, []);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return empleados;
    return empleados.filter(
      (e) =>
        e.nombre.toLowerCase().includes(q) ||
        (e.legajo || '').toLowerCase().includes(q) ||
        (e.correo || '').toLowerCase().includes(q)
    );
  }, [empleados, busqueda]);

  function enlaceEmpleado(token) {
    const base = "https://vercel.app";
    return `${base}/empleado/${token}`;
  }

  async function copiarEnlace(emp) {
    try {
      await navigator.clipboard.writeText(enlaceEmpleado(emp.token_acceso));
      setCopiadoId(emp.id);
      toast.success('Enlace copiado al portapapeles.');
      setTimeout(() => setCopiadoId(null), 2000);
    } catch {
      toast.error('No se pudo copiar el enlace.');
    }
  }

  function whatsappUrl(emp) {
    const link = enlaceEmpleado(emp.token_acceso);
    const texto = encodeURIComponent(
      `Hola ${emp.nombre}, este es tu enlace personal para fichar en BCP Asistencia: ${link}`
    );
    const numero = (emp.telefono || '').replace(/\D/g, '');
    return `https://wa.me/${numero}?text=${texto}`;
  }

  async function eliminar(emp) {
    if (!confirm(`¿Eliminar a ${emp.nombre}? Esta acción no se puede deshacer.`)) return;
    const { error } = await supabase.from('empleados').delete().eq('id', emp.id);
    if (error) {
      toast.error('No se pudo eliminar el empleado.');
      return;
    }
    toast.success('Empleado eliminado.');
    cargar();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Empleados</h1>
          <p className="text-slate-500 text-sm mt-0.5">{empleados.length} empleado(s) registrado(s)</p>
        </div>
        <button onClick={() => setModalForm({})} className="btn-primary flex items-center gap-2">
          <Plus size={18} />
          Nuevo Empleado
        </button>
      </div>

      <div className="relative mt-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre, legajo o correo..."
          className="input-field pl-11"
        />
      </div>

      <div className="card mt-6 divide-y divide-slate-100">
        {cargando && <Spinner />}
        {!cargando && filtrados.length === 0 && (
          <p className="text-center text-sm text-slate-400 py-8">No se encontraron empleados.</p>
        )}
        {!cargando &&
          filtrados.map((emp) => (
            <div key={emp.id} className="flex items-center justify-between px-5 py-4 gap-4 flex-wrap">
              <div className="flex items-center gap-3 min-w-[220px]">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-brand-blue flex items-center justify-center font-semibold">
                  {emp.nombre.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-slate-900 text-sm">{emp.nombre}</p>
                  <p className="text-xs text-slate-400">
                    {emp.legajo || 'Sin legajo'} · {emp.horas_jornada} hs
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm">
                <button
                  onClick={() => setModalHorario(emp)}
                  className="flex items-center gap-1.5 text-slate-500 hover:text-brand-blue"
                >
                  <Clock size={16} /> Horarios
                </button>
                <a
                  href={whatsappUrl(emp)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-emerald-600 hover:text-emerald-700"
                >
                  <MessageCircle size={16} /> WhatsApp
                </a>
                <button
                  onClick={() => copiarEnlace(emp)}
                  className="flex items-center gap-1.5 text-slate-500 hover:text-brand-blue"
                >
                  {copiadoId === emp.id ? <Check size={16} /> : <Link2 size={16} />}
                  Enlace
                </button>
                <button
                  onClick={() => setModalForm(emp)}
                  className="text-slate-400 hover:text-brand-blue"
                  title="Editar"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => eliminar(emp)}
                  className="text-slate-400 hover:text-red-600"
                  title="Eliminar"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
      </div>

      {modalForm !== null && (
        <EmployeeFormModal
          empleado={modalForm.id ? modalForm : null}
          onClose={() => setModalForm(null)}
          onSaved={() => {
            setModalForm(null);
            cargar();
          }}
        />
      )}

      {modalHorario && (
        <ScheduleModal
          empleado={modalHorario}
          onClose={() => setModalHorario(null)}
          onSaved={() => {
            setModalHorario(null);
            cargar();
          }}
        />
      )}
    </div>
  );
}
