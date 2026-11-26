export type Columna = [string, string]; // [título, clave]

/** CSV para Excel en español: separador ';', coma decimal y BOM para que respete tildes. */
export function aCsv(columnas: Columna[], filas: object[]): string {
  const celda = (v: unknown): string => {
    if (v === null || v === undefined) { return ''; }
    let s = typeof v === 'number' ? String(v).replace('.', ',') : String(v);
    // Texto que Excel interpretaría como fórmula (nombres de sector o cliente los escriben usuarios): se antepone '.
    if (typeof v !== 'number' && /^[=+\-@\t\r]/.test(s)) { s = '\'' + s; }
    return /[;"\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const lineas = [columnas.map((c: Columna) => celda(c[0])).join(';')]
    .concat(filas.map((f: object) => columnas.map((c: Columna) => celda((f as { [clave: string]: unknown })[c[1]])).join(';')));
  return '﻿' + lineas.join('\r\n');
}

/** Descarga las filas como CSV (nombre sin extensión). */
export function descargarCsv(nombre: string, columnas: Columna[], filas: object[]): void {
  const blob = new Blob([aCsv(columnas, filas)], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nombre + '.csv';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000); // revocar en el mismo tick puede cortar la descarga
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export interface Variacion {
  pct: number;
  vs: string; // nombre del mes anterior, ej. "octubre"
}

/**
 * Variación % del último punto contra el anterior (puntos ordenados por período 'YYYY-MM').
 * null si faltan puntos, si el mes anterior no es el inmediatamente previo o si el valor anterior es 0 (no hay base).
 */
export function variacionMensual<T extends { periodo: string }>(puntos: T[], valor: (p: T) => number): Variacion | null {
  if (puntos.length < 2) { return null; }
  const actual = puntos[puntos.length - 1];
  const previo = puntos[puntos.length - 2];
  const [a, m] = actual.periodo.split('-').map(Number);
  const esperado = m === 1 ? (a - 1) + '-12' : a + '-' + String(m - 1).padStart(2, '0');
  const base = valor(previo);
  if (previo.periodo !== esperado || !base) { return null; }
  // Con base negativa (pérdida) se divide por su valor absoluto: pasar de -100 a -50 es mejora (+50 %).
  return { pct: (valor(actual) - base) / Math.abs(base) * 100, vs: MESES[Number(previo.periodo.split('-')[1]) - 1] };
}
