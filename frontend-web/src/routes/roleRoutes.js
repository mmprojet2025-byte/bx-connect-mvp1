export function getDefaultRouteForRole(role) {
  switch (role) {
    case 'SUPER_ADMIN':
      return '/super-admin/dashboard'
    case 'ADMIN':
      return '/admin/dashboard'
    case 'REFERENT':
      return '/referent/dashboard'
    case 'PARTENAIRE':
      return '/partenaire'
    case 'MEMBRE':
    default:
      return '/dashboard'
  }
}

const AUTHENTICATED_ROLES = new Set([
  'SUPER_ADMIN',
  'ADMIN',
  'REFERENT',
  'PARTENAIRE',
  'MEMBRE',
])

export function getAuthenticatedRootRedirect({ isAuthenticated, pathname, role }) {
  if (!isAuthenticated || pathname !== '/' || !AUTHENTICATED_ROLES.has(role)) return null
  return getDefaultRouteForRole(role)
}
