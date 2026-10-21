import { LoggedExercise, normalizeExerciseName } from '../../utils/exerciseProgress';
import { CatalogGroup } from './catalog';

// Búsqueda del selector de ejercicios: sin tildes ni mayúsculas. Puro.

const ACCENTS: Record<string, string> = {
  á: 'a', à: 'a', â: 'a', ä: 'a',
  é: 'e', è: 'e', ê: 'e', ë: 'e',
  í: 'i', ì: 'i', î: 'i', ï: 'i',
  ó: 'o', ò: 'o', ô: 'o', ö: 'o',
  ú: 'u', ù: 'u', û: 'u', ü: 'u',
  ñ: 'n', ç: 'c',
};

// Hermes no garantiza String.normalize, así que se quitan las tildes a mano.
export const foldText = (text: string) =>
  normalizeExerciseName(text)
    .split('')
    .map((char) => ACCENTS[char] ?? char)
    .join('');

// Nombres de tu historial, del más reciente al más antiguo, sin repetir.
export const recentExerciseNames = (entries: LoggedExercise[], limit = 8): string[] => {
  const sorted = [...entries].sort((a, b) => b.performedAt.localeCompare(a.performedAt));
  const seen = new Set<string>();
  const names: string[] = [];
  for (const entry of sorted) {
    const key = normalizeExerciseName(entry.name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    names.push(entry.name.trim().replace(/\s+/g, ' '));
    if (names.length >= limit) break;
  }
  return names;
};

export type PickerRow =
  | { kind: 'header'; key: string; title: string }
  | { kind: 'item'; key: string; name: string }
  | { kind: 'create'; key: string; name: string };

const header = (title: string): PickerRow => ({ kind: 'header', key: `h:${title}`, title });

type Input = {
  query: string;
  recents: string[];
  catalog: readonly CatalogGroup[];
  // Elegidos que no están en ninguna lista (creados a mano): se muestran para poder quitarlos.
  selected?: string[];
};

export const buildPickerRows = ({ query, recents, catalog, selected = [] }: Input): PickerRow[] => {
  const needle = foldText(query);
  const all = [...recents, ...catalog.flatMap((group) => group.exercises)];

  if (!needle) {
    const rows: PickerRow[] = [];
    const listed = new Set(all.map(foldText));
    const extra = selected.filter((name) => !listed.has(foldText(name)));
    if (extra.length) rows.push(header('Nuevos'), ...extra.map((name): PickerRow => ({ kind: 'item', key: `n:${foldText(name)}`, name })));
    if (recents.length) rows.push(header('Recientes'), ...recents.map((name): PickerRow => ({ kind: 'item', key: `r:${foldText(name)}`, name })));
    catalog.forEach((group) => {
      rows.push(header(group.title), ...group.exercises.map((name): PickerRow => ({ kind: 'item', key: `c:${foldText(name)}`, name })));
    });
    return rows;
  }

  const seen = new Set<string>();
  const matches: PickerRow[] = [];
  [...selected, ...all].forEach((name) => {
    const key = foldText(name);
    if (seen.has(key) || !key.includes(needle)) return;
    seen.add(key);
    matches.push({ kind: 'item', key: `m:${key}`, name });
  });
  const typed = query.trim().replace(/\s+/g, ' ');
  if (seen.has(needle)) return matches;
  return [{ kind: 'create', key: `create:${needle}`, name: typed }, ...matches];
};

// Selección múltiple: tocar añade al final o quita (comparando sin tildes).
export const toggleSelection = (selected: string[], name: string): string[] => {
  const key = foldText(name);
  return selected.some((item) => foldText(item) === key) ? selected.filter((item) => foldText(item) !== key) : [...selected, name];
};

export const selectionIndex = (selected: string[], name: string) => {
  const key = foldText(name);
  return selected.findIndex((item) => foldText(item) === key);
};
