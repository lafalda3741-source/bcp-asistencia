import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // eslint-disable-next-line no-console
  console.error(
    'Faltan las variables VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. ' +
      'Copiá .env.example a .env y completá tus credenciales de Supabase.'
  );
}

export const supabase = createClient(url, anonKey, {
  realtime: { params: { eventsPerSecond: 10 } }
});
