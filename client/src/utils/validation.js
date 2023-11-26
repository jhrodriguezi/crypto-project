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
