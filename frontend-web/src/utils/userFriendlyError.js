const DEFAULT_MESSAGES = {
  forbidden: 'Accès refusé.',
  sessionExpired: 'Session expirée. Reconnectez-vous.',
  notFound: 'Élément introuvable.',
  impossible: 'Action impossible.',
  pendingRequest: 'Une demande est déjà en attente.',
  alreadyInGroup: 'Vous êtes déjà membre d’un groupe.',
  server: 'Erreur serveur. Réessayez plus tard.',
}

export function userFriendlyError(error, fallback = DEFAULT_MESSAGES.impossible) {
  const status = error?.response?.status
  const rawMessage = String(error?.response?.data?.message || error?.response?.data?.error || '')
  const message = rawMessage.toLowerCase()

  if (status === 401) return DEFAULT_MESSAGES.sessionExpired
  if (status === 403) return DEFAULT_MESSAGES.forbidden
  if (status === 404) return DEFAULT_MESSAGES.notFound
  if (status >= 500) return DEFAULT_MESSAGES.server

  if (message.includes('demande') && (message.includes('attente') || message.includes('pending'))) {
    return DEFAULT_MESSAGES.pendingRequest
  }
  if (message.includes('deja') || message.includes('déjà') || message.includes('already')) {
    if (message.includes('groupe') || message.includes('group')) return DEFAULT_MESSAGES.alreadyInGroup
    return DEFAULT_MESSAGES.impossible
  }
  if (message.includes('introuvable') || message.includes('not found')) return DEFAULT_MESSAGES.notFound
  if (message.includes('impossible') || message.includes('refus') || message.includes('denied')) return DEFAULT_MESSAGES.impossible

  return fallback
}

export function confirmSensitiveAction(message) {
  return window.confirm(message)
}
