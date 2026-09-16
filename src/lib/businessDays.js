import { fechaISO } from './timeCalculations';

/**
 * Calcula la fecha final de una justificación contando `cantidadDiasHabiles`
 * días hábiles (lunes a viernes) a partir de `fechaInicio` inclusive.
 * @param {string} fechaInicio 'YYYY-MM-DD'
 * @param {number} cantidadDiasHabiles
 * @returns {string} 'YYYY-MM-DD'
 */
export function calcularFechaFinHabil(fechaInicio, cantidadDiasHabiles) {
  const [y, m, d] = fechaInicio.split('-').map(Number);
  let fecha = new Date(y, m - 1, d);
  let contados = 0;

  if (cantidadDiasHabiles <= 0) return fechaISO(fecha);

  if (esDiaHabil(fecha)) contados = 1;

  while (contados < cantidadDiasHabiles) {
    fecha.setDate(fecha.getDate() + 1);
    if (esDiaHabil(fecha)) contados += 1;
  }

  return fechaISO(fecha);
}

export function esDiaHabil(fecha) {
  const dia = fecha.getDay(); // 0 = domingo, 6 = sábado
  return dia !== 0 && dia !== 6;
}

export function estaEnRango(fechaISOStr, inicioISOStr, finISOStr) {
  return fechaISOStr >= inicioISOStr && fechaISOStr <= finISOStr;
}
