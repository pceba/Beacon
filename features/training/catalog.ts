// Catálogo de ejercicios del selector, por grupos (DESIGN.md §7.3).

export type CatalogGroup = { title: string; exercises: readonly string[] };

export const EXERCISE_CATALOG: readonly CatalogGroup[] = [
  {
    title: 'Pierna',
    exercises: [
      'Sentadilla',
      'Peso muerto',
      'Peso muerto rumano',
      'Prensa de piernas',
      'Zancadas',
      'Hip thrust',
      'Sentadilla búlgara',
      'Extensión de cuádriceps',
      'Curl femoral',
      'Elevación de gemelos',
    ],
  },
  {
    title: 'Empuje',
    exercises: ['Press banca', 'Press inclinado', 'Press militar', 'Press con mancuernas', 'Aperturas', 'Elevaciones laterales', 'Extensión de tríceps'],
  },
  {
    title: 'Tirón',
    exercises: ['Remo con barra', 'Remo con mancuerna', 'Jalón al pecho', 'Remo en polea', 'Face pull', 'Curl de bíceps', 'Curl martillo'],
  },
  {
    title: 'Core',
    exercises: ['Plancha', 'Abdominales', 'Elevación de piernas', 'Rueda abdominal', 'Russian twist'],
  },
  {
    title: 'Calistenia',
    exercises: ['Dominadas', 'Fondos', 'Flexiones', 'Dominadas supinas', 'Burpees'],
  },
];
