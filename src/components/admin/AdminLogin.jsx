import { useState } from 'react';
import { Lock } from 'lucide-react';
import Logo from '../shared/Logo.jsx';
import { validarPinAdmin, setAdminSession } from '../../lib/authService';

export default function AdminLogin({ onSuccess }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (pin.length !== 4) {
      setError('El PIN debe tener 4 dígitos.');
      return;
    }
    setLoading(true);
    setError('');
    const res = await validarPinAdmin(pin);
    setLoading(false);
    if (!res.ok) {
      setError('PIN incorrecto.');
      setPin('');
      return;
    }
    setAdminSession();
    onSuccess();
  }

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col items-center justify-center px-6">
      <Logo size={52} dark />
      <form onSubmit={handleSubmit} className="mt-10 w-full max-w-xs flex flex-col items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">
          <Lock className="text-white" size={24} />
        </div>
        <p className="text-white font-semibold">Panel de Administrador</p>
        <input
          type="password"
          inputMode="numeric"
          maxLength={4}
          autoFocus
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
          placeholder="PIN de administrador"
          className="w-full text-center tracking-[0.5em] text-lg rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-blue"
        />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Verificando...' : 'Ingresar'}
        </button>
        <p className="text-slate-500 text-xs text-center">PIN inicial de demostración: 1234</p>
      </form>
    </div>
  );
}
