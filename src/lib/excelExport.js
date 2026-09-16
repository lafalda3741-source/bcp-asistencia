// Genera el reporte de asistencia en Excel (.xlsx) con formato de colores
// y enlaces clicables a Google Maps.
//
// Usamos "xlsx-js-style" (API compatible con SheetJS "xlsx", pero con
// soporte real de estilos de celda) porque la librería "xlsx" community
// edition ignora los estilos al guardar. El brief pide colores por fila
// (verde=extra, rojo/naranja=pendiente, gris/amarillo=justificación),
// lo cual requiere esta variante.
import XLSX from 'xlsx-js-style';
import { minutosAHHMM } from './timeCalculations';

const FILL_GREEN = { fgColor: { rgb: 'C6EFCE' } };
const FILL_RED = { fgColor: { rgb: 'FFC7CE' } };
const FILL_ORANGE = { fgColor: { rgb: 'FCE4D6' } };
const FILL_GRAY = { fgColor: { rgb: 'E7E6E6' } };
const FILL_YELLOW = { fgColor: { rgb: 'FFEB9C' } };
const FONT_LINK = { color: { rgb: '1155CC' }, underline: true };

const HEADERS = [
  'Fecha',
  'Empleado',
  'Entrada inicial',
  'Pausas',
  'Salida final',
  'Coordenadas',
  'Ver mapa',
  'Horas trabajadas',
  'Extras',
  'Pendiente',
  'Balance',
  'Justificación'
];

/**
 * @param {Array} filas - cada fila: {
 *   fecha, empleado, entrada, pausas, salida, coordenadas, mapaUrl,
 *   trabajadoMin, extraMin, pendienteMin, balanceMin, justificacion
 * }
 * @param {string} nombreArchivo
 */
export function exportarReporteExcel(filas, nombreArchivo = 'reporte-asistencia.xlsx') {
  const data = [HEADERS];

  filas.forEach((f) => {
    data.push([
      f.fecha,
      f.empleado,
      f.entrada || '-',
      f.pausas || '-',
      f.salida || '-',
      f.coordenadas || '-',
      f.mapaUrl || '',
      minutosAHHMM(f.trabajadoMin || 0),
      minutosAHHMM(f.extraMin || 0),
      minutosAHHMM(f.pendienteMin || 0),
      (f.balanceMin >= 0 ? '+' : '') + minutosAHHMM(f.balanceMin || 0),
      f.justificacion || '-'
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(data);

  // Encabezado en negrita
  for (let c = 0; c < HEADERS.length; c++) {
    const ref = XLSX.utils.encode_cell({ r: 0, c });
    if (ws[ref]) {
      ws[ref].s = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '15386A' } },
        alignment: { horizontal: 'center' }
      };
    }
  }

  filas.forEach((f, i) => {
    const rowIndex = i + 1;

    // Enlace clicable a Google Maps
    if (f.mapaUrl) {
      const ref = XLSX.utils.encode_cell({ r: rowIndex, c: 6 });
      ws[ref] = {
        t: 's',
        v: 'Ver mapa',
        l: { Target: f.mapaUrl },
        s: { font: FONT_LINK }
      };
    }

    // Color de fondo según tipo de fila
    let fill = null;
    if (f.justificacion && f.justificacion !== '-') {
      fill = f.tipoJustificacion === 'feriado' ? FILL_GRAY : FILL_YELLOW;
    } else if ((f.extraMin || 0) > 0) {
      fill = FILL_GREEN;
    } else if ((f.pendienteMin || 0) > 0) {
      fill = f.pendienteMin >= 60 ? FILL_RED : FILL_ORANGE;
    }

    if (fill) {
      for (let c = 0; c < HEADERS.length; c++) {
        if (c === 6) continue; // no pisar el estilo del link
        const ref = XLSX.utils.encode_cell({ r: rowIndex, c });
        if (!ws[ref]) ws[ref] = { t: 's', v: '' };
        ws[ref].s = { ...(ws[ref].s || {}), fill };
      }
    }
  });

  ws['!cols'] = [
    { wch: 12 }, { wch: 26 }, { wch: 14 }, { wch: 22 }, { wch: 14 },
    { wch: 22 }, { wch: 10 }, { wch: 14 }, { wch: 10 }, { wch: 12 },
    { wch: 10 }, { wch: 20 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Asistencia');
  XLSX.writeFile(wb, nombreArchivo);
}

export function mapaUrl(lat, lng) {
  if (lat == null || lng == null) return null;
  return `https://www.google.com/maps?q=${lat},${lng}`;
}
