import { LayoutGrid, Users, History, ClipboardList, Settings, LogOut } from 'lucide-react';
import Logo from '../shared/Logo.jsx';

const ITEMS = [
  { id: 'panel', label: 'Panel', icon: LayoutGrid },
  { id: 'empleados', label: 'Empleados', icon: Users },
  { id: 'historial', label: 'Historial', icon: History },
  { id: 'justificaciones', label: 'Justificaciones', icon: ClipboardList },
  { id: 'configuracion', label: 'Configuración', icon: Settings }
];

export default function Sidebar({ activo, onChange, onSalir }) {
  return (
    <aside className="w-64 bg-navy-950 flex flex-col shrink-0 h-screen sticky top-0">
      <div className="px-5 py-5 border-b border-white/10">
        <Logo size={34} dark />
      </div>
      <nav className="flex-1 py-4 px-3 flex flex-col gap-1">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activo === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-brand-blue text-white'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon size={18} />
              {item.label}
            </button>
          );
        })}
      </nav>
      <div className="p-3 border-t border-white/10">
        <button
          onClick={onSalir}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
        >
          <LogOut size={18} />
          Salir
        </button>
        <p className="text-[11px] text-slate-500 mt-2 px-3">v1.0 · Datos en la nube (Supabase)</p>
      </div>
    </aside>
  );
}
