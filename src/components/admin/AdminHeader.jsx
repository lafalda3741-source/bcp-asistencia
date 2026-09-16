import { X } from 'lucide-react';
import Logo from '../shared/Logo.jsx';
import InstallButton from '../shared/InstallButton.jsx';

export default function AdminHeader({ onSalir }) {
  return (
    <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between sticky top-0 z-10">
      <Logo size={30} showText dark={false} />
      <div className="flex items-center gap-4">
        <InstallButton />
        <button
          onClick={onSalir}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
        >
          <X size={16} />
          Salir
        </button>
      </div>
    </header>
  );
}
