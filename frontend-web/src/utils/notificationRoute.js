const NOTIFICATION_KINDS = [
  {
    kind: 'request',
    tokens: ['DEMANDE', 'ADHESION'],
    pathSegments: ['/demandes', '/adhesions'],
  },
  {
    kind: 'support',
    tokens: ['SOUTIEN', 'PARTENAIRE', 'PAIEMENT'],
    pathSegments: ['/partenaire', '/soutiens', '/paiements'],
  },
  {
    kind: 'group',
    tokens: ['GROUPE', 'ADHESION'],
    pathSegments: ['/groupes', '/adhesions'],
  },
  {
    kind: 'activity',
    tokens: ['ACTIVITE', 'INSCRIPTION'],
    pathSegments: ['/activites', '/inscriptions'],
  },
  {
    kind: 'project',
    tokens: ['PROJET'],
    pathSegments: ['/projets'],
  },
  {
    kind: 'message',
    tokens: ['MESSAGE', 'MESSAGERIE'],
    pathSegments: ['/messagerie', '/messages'],
  },
]

const ROLE_ROUTES = {
  MEMBRE: {
    dashboard: '/dashboard',
    group: '/groupes',
    activity: '/activites',
    project: '/projets',
    message: '/messagerie',
    request: '/groupes',
  },
  REFERENT: {
    dashboard: '/referent/dashboard',
    group: '/referent/groupes',
    activity: '/referent/activites',
    project: '/referent/projets',
    message: '/referent/messagerie',
    businessConversation: '/referent/conversations',
    request: '/referent/demandes',
  },
  ADMIN: {
    dashboard: '/admin/dashboard',
    group: '/admin/groupes',
    activity: '/admin/activites',
    project: '/admin/projets',
    support: '/admin/soutiens',
    businessConversation: '/admin/conversations',
    request: '/admin/groupes',
  },
  PARTENAIRE: {
    dashboard: '/partenaire?tab=dashboard',
    activity: '/partenaire?tab=activites',
    project: '/partenaire?tab=projets',
    support: '/partenaire?tab=soutiens',
    businessConversation: '/partenaire/conversations',
    request: '/partenaire?tab=dashboard',
  },
  SUPER_ADMIN: {
    dashboard: '/super-admin/dashboard',
    businessConversation: '/admin/conversations',
  },
}

export function dashboardRouteForRole(role) {
  return ROLE_ROUTES[role]?.dashboard || '/dashboard'
}

export function resolveNotificationRoute(notification = {}, role = 'MEMBRE') {
  const type = String(notification.type || '').toUpperCase()
  const actionPath = String(notification.lienAction || '').toLowerCase()

  const exactRoute = exactRouteFromAction(actionPath, role)
  if (exactRoute) return exactRoute

  if (isBusinessConversationNotification(type)) {
    const businessRoute = businessConversationRouteForRole(role)
    if (businessRoute) return businessRoute
  }

  const rule = NOTIFICATION_KINDS.find(candidate =>
    candidate.tokens.some(token => type.includes(token))
    || candidate.pathSegments.some(segment => actionPath.includes(segment))
  )

  const routes = ROLE_ROUTES[role] || ROLE_ROUTES.MEMBRE
  return routes[rule?.kind] || routes.dashboard
}

export function hasExactNotificationRoute(notification = {}, role = 'MEMBRE') {
  return !!exactRouteFromAction(String(notification.lienAction || '').toLowerCase(), role)
}

function exactRouteFromAction(actionPath, role) {
  if (!actionPath) return ''

  const routes = ROLE_ROUTES[role] || ROLE_ROUTES.MEMBRE
  const isAdmin = role === 'ADMIN'
  const isReferent = role === 'REFERENT'
  const businessRoute = businessConversationRouteForRole(role, actionPath)
  if (businessRoute) return businessRoute

  if (/\/activites\/\d+/.test(actionPath)) {
    if (isAdmin || isReferent) return routes.activity || routes.dashboard
    return actionPath.match(/\/activites\/\d+/)?.[0] || ''
  }
  if (/\/projets\/\d+/.test(actionPath)) {
    if (isAdmin || isReferent) return routes.project || routes.dashboard
    return actionPath.match(/\/projets\/\d+/)?.[0] || ''
  }
  if (/\/groupes\/\d+/.test(actionPath)) {
    if (isAdmin || isReferent) return routes.group || routes.dashboard
    return actionPath.match(/\/groupes\/\d+/)?.[0] || ''
  }
  if (actionPath.includes('/messagerie') || actionPath.includes('/messages')) return routes.message || routes.dashboard
  if (actionPath.includes('/demandes') || actionPath.includes('/adhesions')) return routes.request || routes.group || routes.dashboard
  if (actionPath.startsWith('/admin/soutiens') && routes.support?.startsWith('/admin/soutiens')) return actionPath
  if (actionPath.startsWith('/partenaire?tab=soutiens') && routes.support?.startsWith('/partenaire')) return actionPath
  if (actionPath.includes('/soutiens') || actionPath.includes('/paiements') || actionPath.includes('/partenaire')) return routes.support || routes.dashboard
  if (actionPath.includes('/projets')) return routes.project || routes.dashboard
  if (actionPath.includes('/groupes')) return routes.group || routes.dashboard
  if (actionPath.includes('/activites') || actionPath.includes('/inscriptions')) return routes.activity || routes.dashboard

  return ''
}

function businessConversationRouteForRole(role, actionPath = '') {
  const routes = ROLE_ROUTES[role] || ROLE_ROUTES.MEMBRE
  if (!routes.businessConversation) return ''

  const match = actionPath.match(/\/conversations-metier\/(\d+)/)
  if (!match) return actionPath.includes('/conversations-metier') ? routes.businessConversation : ''

  return `${routes.businessConversation}?conversationId=${match[1]}`
}

function isBusinessConversationNotification(type) {
  return type === 'BUSINESS_CONVERSATION_CREATED' || type === 'BUSINESS_MESSAGE'
}
