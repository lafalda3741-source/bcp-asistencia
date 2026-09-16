import { useState } from 'react';
import { Delete, Lock, ShieldCheck } from 'lucide-react';
import Logo from '../shared/Logo.jsx';

export default function PinPad({ nombreEmpleado, onSubmit, loading, error }) {
  const [pin, setPin] = useState('');

  function actualizar(next) {
    setPin(next);
    if (next.length === 4) {
      onSubmit(next);
      setTimeout(() => setPin(''), 300);
    }
  }

  const press = (d) => {
    if (pin.length >= 4 || loading) return;
    actualizar(pin + d);
  };

  const del = () => setPin((p) => p.slice(0, -1));
  const confirmar = () => {
    if (pin.length === 4 && !loading) actualizar(pin);
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center px-6 py-10"
      style={{ background: 'linear-gradient(160deg, #0B1E3D 0%, #1568D4 100%)' }}
    >
      <div className="w-24 h-24 rounded-3xl bg-white shadow-lg flex items-center justify-center">
        <Logo size={56} showText={false} />
      </div>

      <h1 className="text-white text-2xl font-bold mt-5">
        {nombreEmpleado ? `Hola, ${nombreEmpleado.split(' ')[0]}` : 'Bienvenido'}
      </h1>
      <p className="text-blue-100 text-sm mt-1 text-center">BCP Asistencia · Ingresa tu PIN</p>

      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl mt-8 px-6 pt-8 pb-6">
        <div className="flex gap-3 justify-center mb-7">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border-2 transition-colors ${
                i < pin.length ? 'bg-brand-blue border-brand-blue' : 'border-slate-300'
              }`}
            />
          ))}
        </div>

        {error && <p className="text-red-500 text-sm text-center mb-4">{error}</p>}

        <div className="grid grid-cols-3 gap-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((n) => (
            <button
              key={n}
              onClick={() => press(n)}
              disabled={loading}
              className="h-16 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-2xl font-semibold transition-colors disabled:opacity-40"
            >
              {n}
            </button>
          ))}
          <button
            onClick={del}
            disabled={loading}
            className="h-16 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors disabled:opacity-40"
          >
            <Delete size={22} />
          </button>
          <button
            onClick={() => press('0')}
            disabled={loading}
            className="h-16 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-2xl font-semibold transition-colors disabled:opacity-40"
          >
            0
          </button>
          <button
            onClick={confirmar}
            disabled={loading || pin.length !== 4}
            className="h-16 rounded-2xl bg-brand-blue hover:bg-blue-700 text-white flex items-center justify-center transition-colors disabled:opacity-40"
          >
            <Lock size={22} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 text-blue-100 text-xs mt-6">
        <ShieldCheck size={15} />
        Acceso seguro y privado
      </div>
    </div>
  );
}
