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
    request: '/referent/demandes',
  },
  ADMIN: {
    dashboard: '/admin/dashboard',
    group: '/admin/groupes',
    activity: '/admin/activites',
    project: '/admin/projets',
    support: '/admin/soutiens',
    request: '/admin/groupes',
  },
  PARTENAIRE: {
    dashboard: '/partenaire?tab=dashboard',
    activity: '/partenaire?tab=activites',
    project: '/partenaire?tab=projets',
    support: '/partenaire?tab=soutiens',
    request: '/partenaire?tab=dashboard',
  },
  SUPER_ADMIN: {
    dashboard: '/super-admin/dashboard',
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

  if (/\/activites\/\d+/.test(actionPath)) {
    return actionPath.match(/\/activites\/\d+/)?.[0] || ''
  }
  if (/\/projets\/\d+/.test(actionPath)) {
    return actionPath.match(/\/projets\/\d+/)?.[0] || ''
  }
  if (/\/groupes\/\d+/.test(actionPath)) {
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
