import bcrypt from 'bcryptjs';

/**
 * Genera el hash bcrypt de un PIN de 4 dígitos.
 * Nunca guardar el PIN en texto plano: siempre pasar por acá antes
 * de escribir en `empleados.pin_hash` o `configuracion.pin_admin_hash`.
 */
export function hashPin(pin) {
  const salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync(String(pin), salt);
}

// NOTA DE SEGURIDAD: la *verificación* de un PIN (login) nunca se hace
// comparando bcrypt en el navegador contra un hash traído del servidor,
// porque eso obligaría a exponer `pin_hash` / `pin_admin_hash` al cliente.
// En su lugar, la verificación se delega siempre a las funciones RPC
// `validar_pin_empleado` y `validar_pin_admin` (ver src/lib/authService.js),
// que corren en Postgres con SECURITY DEFINER y solo devuelven
// verdadero/falso. `hashPin` de acá arriba se usa únicamente para
// GENERAR el hash cuando el admin crea o cambia un PIN.

export function isValidPinFormat(pin) {
  return /^\d{4}$/.test(String(pin || ''));
}
