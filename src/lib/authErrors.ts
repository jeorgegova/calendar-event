/**
 * Mapeo de errores de Supabase Auth a español.
 */
const errorMap: Record<string, string> = {
  'Invalid login credentials': 'El correo o la contraseña son incorrectos.',
  'Email not confirmed': 'Debes confirmar tu correo electrónico antes de iniciar sesión.',
  'User not found': 'No se encontró ningún usuario con ese correo.',
  'Password is too short': 'La contraseña debe tener al menos 6 caracteres.',
  'Weak password': 'La contraseña es demasiado débil.',
  'Email already registered': 'Este correo ya está registrado.',
  'User already registered': 'Este usuario ya está registrado.',
  'Missing password': 'Por favor, ingresa una contraseña.',
  'Missing email': 'Por favor, ingresa un correo electrónico.',
  'User not allowed': 'Este usuario no tiene permiso para acceder.',
  'Captcha verification failed': 'La verificación de Captcha falló. Inténtalo de nuevo.',
  'Signup is disabled': 'El registro de nuevos usuarios está deshabilitado.',
  'Invalid refresh token': 'Tu sesión ha expirado. Por favor, inicia sesión de nuevo.',
  'invalid_credentials': 'El correo o la contraseña son incorrectos.',
};

/**
 * Traduce un error de Supabase (u otro objeto de error) al español.
 */
export const translateError = (error: any): string => {
  if (!error) return 'Ocurrió un error inesperado.';
  
  const message = error.message || (typeof error === 'string' ? error : '');
  
  // Buscar en el mapa (exacto o parcial)
  for (const [key, value] of Object.entries(errorMap)) {
    if (message.toLowerCase().includes(key.toLowerCase())) {
      return value;
    }
  }

  // Si el mensaje es exactamente uno de los conocidos
  if (errorMap[message]) return errorMap[message];

  // Errores comunes por código o status si están disponibles
  if (error.code === 'invalid_credentials') return errorMap['invalid_credentials'];

  return message || 'Ocurrió un error.';
};
