export const MENSAJE_UBICACION_OBLIGATORIA =
  'La ubicación es obligatoria para registrar la asistencia.';

/**
 * Pide la ubicación actual. Rechaza siempre con el mensaje obligatorio
 * del brief si el usuario la niega, falla o expira (timeout).
 */
export function obtenerUbicacion({ timeout = 10000 } = {}) {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error(MENSAJE_UBICACION_OBLIGATORIA));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitud: pos.coords.latitude,
          longitud: pos.coords.longitude,
          precision_m: pos.coords.accuracy
        });
      },
      () => {
        reject(new Error(MENSAJE_UBICACION_OBLIGATORIA));
      },
      { enableHighAccuracy: true, timeout, maximumAge: 0 }
    );
  });
}
