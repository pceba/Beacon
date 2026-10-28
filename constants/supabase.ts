// Proyecto de Supabase de Beacon. Son valores públicos: la URL y la clave publishable
// van dentro de la app de todas formas, y la seguridad la da RLS en la base de datos.
// Están en el código, y no en .env, para que una actualización OTA nunca salga apuntando
// a otro proyecto por un .env antiguo en el ordenador que la publica.
export const SUPABASE_URL = 'https://agzjmwvqvyfvxkezbeid.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_BZr8x5QLTZzyR1QoXrdG4w_ZDfhQDRB';
