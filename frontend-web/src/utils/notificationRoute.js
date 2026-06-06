const ROUTE_RULES = [
  {
    route: '/groupes',
    tokens: ['GROUPE', 'ADHESION'],
    pathSegments: ['/groupes', '/adhesions'],
  },
  {
    route: '/activites',
    tokens: ['ACTIVITE', 'INSCRIPTION'],
    pathSegments: ['/activites', '/inscriptions'],
  },
  {
    route: '/projets',
    tokens: ['PROJET'],
    pathSegments: ['/projets'],
  },
  {
    route: '/messagerie',
    tokens: ['MESSAGE', 'MESSAGERIE'],
    pathSegments: ['/messagerie', '/messages'],
  },
]

export function resolveNotificationRoute(notification = {}) {
  const type = String(notification.type || '').toUpperCase()
  const actionPath = String(notification.lienAction || '').toLowerCase()

  const typeRule = ROUTE_RULES.find(rule =>
    rule.tokens.some(token => type.includes(token))
  )
  if (typeRule) return typeRule.route

  const pathRule = ROUTE_RULES.find(rule =>
    rule.pathSegments.some(segment => actionPath.includes(segment))
  )

  return pathRule?.route || '/dashboard'
}
