// Utilidades de cálculo de horas trabajadas, extras, pendiente y balance.
// Todas las duraciones se manejan en minutos internamente y se formatean
// a "hh:mm" (con signo cuando corresponde) para mostrar.

const DIAS_SEMANA = [
  'domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'
];

export function nombreDia(fecha) {
  return DIAS_SEMANA[new Date(fecha).getDay()];
}

export function minutosAHHMM(mins) {
  const signo = mins < 0 ? '-' : '';
  const abs = Math.round(Math.abs(mins));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${signo}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function hhmmAMinutos(hhmm) {
  if (!hhmm) return 0;
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Reconstruye los períodos trabajados (entrada->pausa, reanudacion->salida, etc.)
 * a partir de una lista de fichajes de UN empleado en UN día, ordenados por hora.
 * Devuelve { entrada, salida, periodos: [{inicio, fin}], pausas: [{inicio, fin}] }
 */
export function reconstruirJornada(fichajesDelDia) {
  const ordenados = [...fichajesDelDia].sort(
    (a, b) => new Date(a.fecha_hora) - new Date(b.fecha_hora)
  );

  const periodos = [];
  const pausas = [];
  let inicioActual = null;
  let pausaActual = null;
  let entrada = null;
  let salida = null;

  for (const f of ordenados) {
    const hora = new Date(f.fecha_hora);
    if (f.tipo === 'entrada') {
      if (!entrada) entrada = hora;
      inicioActual = hora;
    } else if (f.tipo === 'pausa') {
      if (inicioActual) {
        periodos.push({ inicio: inicioActual, fin: hora });
        inicioActual = null;
      }
      pausaActual = hora;
    } else if (f.tipo === 'reanudacion') {
      if (pausaActual) {
        pausas.push({ inicio: pausaActual, fin: hora });
        pausaActual = null;
      }
      inicioActual = hora;
    } else if (f.tipo === 'salida') {
      if (inicioActual) {
        periodos.push({ inicio: inicioActual, fin: hora });
        inicioActual = null;
      }
      salida = hora;
    }
  }

  // Si quedó un período abierto (todavía trabajando / en pausa), se deja
  // sin cerrar; el llamador decide si sumar hasta "ahora".
  return { entrada, salida, periodos, pausas, abiertoTrabajando: !!inicioActual, abiertoPausa: !!pausaActual };
}

/**
 * Calcula el resumen de un día para un empleado:
 * horas trabajadas netas, extras, pendiente y balance, respetando
 * horario planificado y tolerancia.
 *
 * @param {Array} fichajesDelDia
 * @param {Object} horarioDia - { activo, entrada: 'hh:mm', salida: 'hh:mm' }
 * @param {string} fecha - 'YYYY-MM-DD'
 * @param {number} toleranciaMin
 * @param {boolean} tieneJustificacion - si hay licencia/feriado aprobado ese día
 * @param {Date} ahora - momento actual (para jornadas en curso)
 */
export function calcularResumenDia({
  fichajesDelDia,
  horarioDia,
  fecha,
  toleranciaMin = 0,
  tieneJustificacion = false,
  ahora = new Date()
}) {
  if (tieneJustificacion) {
    return {
      trabajadoMin: 0,
      extraMin: 0,
      pendienteMin: 0,
      balanceMin: 0,
      puntual: true,
      justificado: true
    };
  }

  const { periodos, abiertoTrabajando, entrada } = reconstruirJornada(fichajesDelDia);
  const jornadaEnCurso = abiertoTrabajando;

  // Cerrar el período abierto "hasta ahora" solo si es el día de hoy
  const periodosCompletos = [...periodos];
  if (jornadaEnCurso) {
    // Buscamos el inicio del último período abierto reconstruyendo de nuevo
    // (reconstruirJornada ya no nos da el inicio abierto directamente,
    // así que lo hacemos de forma simple: usamos el fichaje sin cerrar).
    const ordenados = [...fichajesDelDia].sort(
      (a, b) => new Date(a.fecha_hora) - new Date(b.fecha_hora)
    );
    const ultimo = ordenados[ordenados.length - 1];
    if (ultimo && (ultimo.tipo === 'entrada' || ultimo.tipo === 'reanudacion')) {
      periodosCompletos.push({ inicio: new Date(ultimo.fecha_hora), fin: ahora });
    }
  }

  if (!horarioDia || !horarioDia.activo || !horarioDia.entrada || !horarioDia.salida) {
    // Día no laborable planificado: todo lo trabajado se considera extra,
    // no hay "pendiente" posible.
    const trabajadoMin = sumarMinutos(periodosCompletos);
    return {
      trabajadoMin,
      extraMin: trabajadoMin,
      pendienteMin: 0,
      balanceMin: trabajadoMin,
      puntual: true,
      justificado: false
    };
  }

  const [anio, mes, dia] = fecha.split('-').map(Number);
  const entradaPlanificada = new Date(anio, mes - 1, dia, ...horarioDia.entrada.split(':').map(Number));
  const salidaPlanificada = new Date(anio, mes - 1, dia, ...horarioDia.salida.split(':').map(Number));

  // Recortar cada período: lo que ocurre ANTES de la entrada planificada
  // no suma ni genera extras. Lo que ocurre DESPUÉS de la salida
  // planificada sí genera extras.
  let netoDentroDeJornada = 0; // trabajado entre entrada y salida planificadas
  let extraMin = 0;

  for (const p of periodosCompletos) {
    const inicio = p.inicio < entradaPlanificada ? entradaPlanificada : p.inicio;
    const fin = p.fin;
    if (fin <= entradaPlanificada) continue; // todo el período fue antes de entrar

    if (fin <= salidaPlanificada) {
      netoDentroDeJornada += (fin - inicio) / 60000;
    } else if (inicio >= salidaPlanificada) {
      extraMin += (fin - inicio) / 60000;
    } else {
      // el período cruza la salida planificada: parte normal + parte extra
      netoDentroDeJornada += (salidaPlanificada - inicio) / 60000;
      extraMin += (fin - salidaPlanificada) / 60000;
    }
  }

  const jornadaPlanificadaMin = (salidaPlanificada - entradaPlanificada) / 60000;
  const trabajadoMin = netoDentroDeJornada + extraMin;

  let pendienteMin = 0;
  if (jornadaEnCurso) {
    // Mientras la jornada está en curso no se marca pendiente todavía
    pendienteMin = 0;
  } else if (!entrada) {
    // Día laborable sin ningún fichaje: todo pendiente
    pendienteMin = jornadaPlanificadaMin;
  } else {
    pendienteMin = Math.max(0, jornadaPlanificadaMin - netoDentroDeJornada);
  }

  const balanceMin = extraMin - pendienteMin;

  // Puntualidad con tolerancia
  let puntual = true;
  if (entrada) {
    const limitePuntualidad = new Date(entradaPlanificada.getTime() + toleranciaMin * 60000);
    puntual = entrada <= limitePuntualidad;
  }

  return { trabajadoMin, extraMin, pendienteMin, balanceMin, puntual, justificado: false, jornadaEnCurso };
}

function sumarMinutos(periodos) {
  return periodos.reduce((acc, p) => acc + (p.fin - p.inicio) / 60000, 0);
}

/**
 * Calcula el contador en vivo (hh:mm:ss) de una jornada en curso.
 */
export function contadorEnVivo(fichajesDelDia, ahora = new Date()) {
  const { periodos, abiertoTrabajando } = reconstruirJornada(fichajesDelDia);
  let totalMs = periodos.reduce((acc, p) => acc + (p.fin - p.inicio), 0);

  if (abiertoTrabajando) {
    const ordenados = [...fichajesDelDia].sort(
      (a, b) => new Date(a.fecha_hora) - new Date(b.fecha_hora)
    );
    const ultimo = ordenados[ordenados.length - 1];
    totalMs += ahora - new Date(ultimo.fecha_hora);
  }

  const totalSeg = Math.max(0, Math.floor(totalMs / 1000));
  const h = String(Math.floor(totalSeg / 3600)).padStart(2, '0');
  const m = String(Math.floor((totalSeg % 3600) / 60)).padStart(2, '0');
  const s = String(totalSeg % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

/**
 * Determina el estado actual del empleado a partir de sus fichajes de hoy.
 * 'sin_iniciar' | 'trabajando' | 'en_pausa' | 'finalizado'
 */
export function estadoActual(fichajesDelDia) {
  if (!fichajesDelDia || fichajesDelDia.length === 0) return 'sin_iniciar';
  const ordenados = [...fichajesDelDia].sort(
    (a, b) => new Date(a.fecha_hora) - new Date(b.fecha_hora)
  );
  const ultimo = ordenados[ordenados.length - 1];
  if (ultimo.tipo === 'entrada' || ultimo.tipo === 'reanudacion') return 'trabajando';
  if (ultimo.tipo === 'pausa') return 'en_pausa';
  if (ultimo.tipo === 'salida') return 'finalizado';
  return 'sin_iniciar';
}

/**
 * Próxima acción disponible según el estado actual.
 */
export function proximaAccion(estado) {
  return {
    sin_iniciar: 'entrada',
    trabajando: 'pausa_o_salida',
    en_pausa: 'reanudacion',
    finalizado: 'finalizado'
  }[estado];
}

export function fechaISO(date = new Date()) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export { DIAS_SEMANA };
