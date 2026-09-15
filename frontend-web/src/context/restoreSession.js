// Ce contrôle local évite un rendu authentifié avec un JWT déjà expiré.
// La validation de la signature et des permissions reste assurée par l'API.
export function restoreSession(storage, now = Date.now()) {
  try {
    const token = storage.getItem('token')
    const user = JSON.parse(storage.getItem('user'))
    if (token && user && typeof user.role === 'string') {
      const parts = token.split('.')
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
      if (parts.length === 3 && Number.isFinite(payload.exp) && payload.exp * 1000 > now) {
        return { token, user }
      }
    }
  } catch {
    // Stockage incomplet ou corrompu : repartir avec une session anonyme.
  }
  storage.removeItem('token')
  storage.removeItem('user')
  return { token: null, user: null }
}
