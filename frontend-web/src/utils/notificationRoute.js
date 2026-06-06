const NOTIFICATION_KINDS = [
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
  },
  REFERENT: {
    dashboard: '/referent/dashboard',
    group: '/referent/groupes',
    activity: '/referent/activites',
    project: '/referent/projets',
    message: '/referent/messagerie',
  },
  ADMIN: {
    dashboard: '/admin/dashboard',
    group: '/admin/groupes',
    activity: '/admin/activites',
    project: '/admin/projets',
    support: '/admin/soutiens',
  },
  PARTENAIRE: {
    dashboard: '/partenaire?tab=dashboard',
    activity: '/partenaire?tab=activites',
    project: '/partenaire?tab=projets',
    support: '/partenaire?tab=soutiens',
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

  const rule = NOTIFICATION_KINDS.find(candidate =>
    candidate.tokens.some(token => type.includes(token))
    || candidate.pathSegments.some(segment => actionPath.includes(segment))
  )

  const routes = ROLE_ROUTES[role] || ROLE_ROUTES.MEMBRE
  return routes[rule?.kind] || routes.dashboard
}
