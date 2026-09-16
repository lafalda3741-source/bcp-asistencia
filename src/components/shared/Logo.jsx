export default function Logo({ size = 36, showText = true, dark = true }) {
  return (
    <div className="flex items-center gap-2.5">
      <svg width={size} height={size} viewBox="0 0 128 128" className="shrink-0">
        <rect width="128" height="128" rx="28" fill="#0B1E3D" />
        <circle cx="64" cy="64" r="42" fill="none" stroke="#1568D4" strokeWidth="7" />
        <path
          d="M64 34 L64 64 L86 78"
          fill="none"
          stroke="#1BA672"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="64" cy="64" r="5.5" fill="#FFFFFF" />
      </svg>
      {showText && (
        <div className="leading-tight">
          <p className={`font-bold text-[15px] ${dark ? 'text-white' : 'text-slate-900'}`}>
            BCP Asistencia
          </p>
          <p className={`text-[11px] ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
            Control de Fichaje
          </p>
        </div>
      )}
    </div>
  );
}
