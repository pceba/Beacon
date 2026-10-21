// Periodo para acotar lecturas. `from` y `to` son inclusivos y van en el formato de la
// columna: 'yyyy-MM-dd' para columnas date, ISO para timestamptz.
export type Range = { from?: string; to?: string };
