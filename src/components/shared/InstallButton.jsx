import { Download } from 'lucide-react';
import { usePwaInstall } from '../../lib/usePwaInstall';

export default function InstallButton({ className = '' }) {
  const { canInstall, promptInstall } = usePwaInstall();
  if (!canInstall) return null;

  return (
    <button
      onClick={promptInstall}
      className={`inline-flex items-center gap-2 rounded-lg bg-brand-green px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors ${className}`}
    >
      <Download size={16} />
      Instalar BCP Asistencia
    </button>
  );
}
