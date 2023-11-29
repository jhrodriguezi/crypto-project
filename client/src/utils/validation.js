import validator from 'validator';

export function validatePassword(password) {
  // Mínimo 8 caracteres
  if (password.length < 8) {
    console.log('La contraseña debe tener al menos 8 caracteres.')
    return false
  }

  // Al menos una letra mayúscula, una letra minúscula y un número
  const tieneMayuscula = /[A-Z]/.test(password)
  const tieneMinuscula = /[a-z]/.test(password)
  const tieneNumero = /\d/.test(password)

  if (!tieneMayuscula || !tieneMinuscula || !tieneNumero) {
    return false
  }

  return true
}

export function validateEmail(email) {
  return validator.isEmail(email);
}

export function validateName(name) {
  // El nombre debe tener al menos 2 caracteres y no debe tener caracteres especiales
  return validator.isLength(name, { min: 2 }) && validator.isAlpha(name, 'es-ES', { ignore: ' -' });
}

// Función para validar un título
export function validateTitle(title) {
  return validator.isLength(title, { min: 5, max: 100 });
}

// Función para validar una dirección
export function validateAddress(address) {
  return validator.isLength(address, { min: 10, max: 255 });
}

// Función para validar un número de teléfono
export function validatePhoneNumber(phoneNumber) {
  // El número de teléfono puede contener guiones, paréntesis y espacios en blanco
  return validator.matches(phoneNumber, /^[\d\s()-]+$/);
}

export function validateDate(date) {
  return validator.isISO8601(date);
}