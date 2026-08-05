export function getResetPasswordChecks(password) {
  return [
    password.length >= 12 && password.length <= 128,
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ]
}

export function isValidResetPassword(password) {
  return getResetPasswordChecks(password).every(Boolean)
}
