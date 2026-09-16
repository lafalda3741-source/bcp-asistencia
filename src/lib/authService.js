import { supabase } from './supabaseClient';

/**
 * Valida el PIN de un empleado contra su token de acceso.
 * Devuelve { ok: boolean, empleadoId?: string, nombre?: string, error?: string }
 */
export async function validarPinEmpleado(token, pin) {
  const { data, error } = await supabase.rpc('validar_pin_empleado', {
    p_token: token,
    p_pin: String(pin)
  });

  if (error) {
    return { ok: false, error: 'No se pudo validar el PIN. Intentá nuevamente.' };
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || !row.valido) {
    return { ok: false, error: 'PIN incorrecto.' };
  }
  return { ok: true, empleadoId: row.empleado_id, nombre: row.nombre };
}

/**
 * Valida el PIN de administrador.
 */
export async function validarPinAdmin(pin) {
  const { data, error } = await supabase.rpc('validar_pin_admin', { p_pin: String(pin) });
  if (error) {
    return { ok: false, error: 'No se pudo validar el PIN.' };
  }
  return { ok: !!data };
}

const ADMIN_SESSION_KEY = 'bcp_admin_session';
const EMPLEADO_SESSION_KEY = 'bcp_empleado_session';

export function setAdminSession() {
  sessionStorage.setItem(ADMIN_SESSION_KEY, '1');
}
export function hasAdminSession() {
  return sessionStorage.getItem(ADMIN_SESSION_KEY) === '1';
}
export function clearAdminSession() {
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
}

export function setEmpleadoSession(token, empleadoId, nombre) {
  sessionStorage.setItem(
    EMPLEADO_SESSION_KEY + ':' + token,
    JSON.stringify({ empleadoId, nombre })
  );
}
export function getEmpleadoSession(token) {
  const raw = sessionStorage.getItem(EMPLEADO_SESSION_KEY + ':' + token);
  return raw ? JSON.parse(raw) : null;
}
export function clearEmpleadoSession(token) {
  sessionStorage.removeItem(EMPLEADO_SESSION_KEY + ':' + token);
}
