import { rawSupabase } from '../lib/supabase';

const human = (error: { message?: string } | null, fallback: string) => {
  const message = error?.message?.toLowerCase() ?? '';
  if (message.includes('rate') || message.includes('too many')) return 'Demasiados intentos. Espera un poco y vuelve a probar.';
  if (message.includes('not found') || message.includes('signups not allowed') || message.includes('user not found')) {
    return 'Ese email no está en Lifepp. Vincúlalo primero en el teléfono donde empezaste.';
  }
  if (message.includes('invalid') || message.includes('expired') || message.includes('otp')) return 'El código no es válido o ha caducado.';
  return fallback;
};

export const requestEmailLink = async (email: string) => {
  const { error } = await rawSupabase.auth.updateUser({ email });
  if (error) throw new Error(human(error, 'No se ha podido enviar el código.'));
};

export const confirmEmailLink = async (email: string, token: string) => {
  const { error } = await rawSupabase.auth.verifyOtp({ email, token, type: 'email_change' });
  if (error) throw new Error(human(error, 'No se ha podido verificar el email.'));
};

export const requestEmailSignIn = async (email: string) => {
  const { error } = await rawSupabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
  if (error) throw new Error(human(error, 'No se ha podido enviar el código.'));
};

export const confirmEmailSignIn = async (email: string, token: string) => {
  const { error } = await rawSupabase.auth.verifyOtp({ email, token, type: 'email' });
  if (error) throw new Error(human(error, 'No se ha podido entrar.'));
};
