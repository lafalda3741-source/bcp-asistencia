import { Loader2 } from 'lucide-react';

export default function Spinner({ label = 'Cargando...', className = '' }) {
  return (
    <div className={`flex items-center justify-center gap-2 py-8 text-slate-500 ${className}`}>
      <Loader2 className="animate-spin" size={20} />
      <span className="text-sm">{label}</span>
    </div>
  );
}
