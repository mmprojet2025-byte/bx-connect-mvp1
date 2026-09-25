function isLocalHostname(hostname) {
  const normalized = hostname.toLowerCase()
  return normalized === 'localhost'
    || normalized === '127.0.0.1'
    || normalized === '::1'
    || normalized.endsWith('.localhost')
}

export function resolveApiBaseUrl(value, { deployment = false, fallback } = {}) {
  const configuredValue = value?.trim()

  if (!configuredValue) {
    if (deployment) {
      throw new Error(
        'VITE_API_BASE_URL is required for deployment builds and must be a non-local HTTPS URL.',
      )
    }
    if (fallback) return resolveApiBaseUrl(fallback)
    throw new Error('VITE_API_BASE_URL is required.')
  }

  let url
  try {
    url = new URL(configuredValue)
  } catch {
    throw new Error('VITE_API_BASE_URL must be a valid absolute HTTP(S) URL.')
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('VITE_API_BASE_URL must use HTTP or HTTPS.')
  }

  if (deployment && (url.protocol !== 'https:' || isLocalHostname(url.hostname))) {
    throw new Error(
      'VITE_API_BASE_URL must be a non-local HTTPS URL for deployment builds.',
    )
  }

  return configuredValue.replace(/\/+$/, '')
}
