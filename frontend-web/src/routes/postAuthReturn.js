import { getDefaultRouteForRole } from './roleRoutes.js'

const INTERNAL_ORIGIN = 'https://bx-connect.invalid'

function normalizeInternalPath(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return null

  try {
    const url = new URL(value, INTERNAL_ORIGIN)
    if (url.origin !== INTERNAL_ORIGIN) return null
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return null
  }
}

function isAllowedPublicReturnPath(path, role) {
  if (/^\/activites(?:\/[^/?#]+)?(?:[?#].*)?$/.test(path)) {
    return ['MEMBRE', 'REFERENT', 'ADMIN'].includes(role)
  }
  if (/^\/(?:groupes|projets)(?:\/[^/?#]+)?(?:[?#].*)?$/.test(path)) {
    return role === 'MEMBRE'
  }
  return false
}

export function getPostAuthDestination(returnTo, role) {
  const path = normalizeInternalPath(returnTo)
  return path && isAllowedPublicReturnPath(path, role)
    ? path
    : getDefaultRouteForRole(role)
}

export function getCurrentReturnTo(location) {
  return `${location.pathname}${location.search}${location.hash}`
}
