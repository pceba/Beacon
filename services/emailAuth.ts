const EMAIL_UNAVAILABLE = 'No podemos enviar el código ahora mismo. Tus datos siguen guardados en este móvil.';

export const requestEmailLink = async (_email: string) => {
  throw new Error(EMAIL_UNAVAILABLE);
};

export const confirmEmailLink = async (_email: string, _token: string) => {
  throw new Error(EMAIL_UNAVAILABLE);
};

export const requestEmailSignIn = async (_email: string) => {
  throw new Error(EMAIL_UNAVAILABLE);
};

export const confirmEmailSignIn = async (_email: string, _token: string) => {
  throw new Error(EMAIL_UNAVAILABLE);
};
