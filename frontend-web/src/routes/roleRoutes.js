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
