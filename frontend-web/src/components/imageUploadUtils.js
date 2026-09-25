const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_IMAGE_SIZE = 5 * 1024 * 1024

export function getSafeImageUrl(value, { allowedOrigins = [], allowBlob = false } = {}) {
  if (typeof value !== 'string' || !value.trim()) return null

  try {
    const fallbackOrigin = allowedOrigins[0] || 'https://invalid.local'
    const url = new URL(value, fallbackOrigin)
    if (allowBlob && url.protocol === 'blob:') return url.href
    if (!['http:', 'https:'].includes(url.protocol)) return null
    return allowedOrigins.includes(url.origin) ? url.href : null
  } catch {
    return null
  }
}

export function validateImageFile(file) {
  if (!ALLOWED_IMAGE_TYPES.has(file?.type)) return 'invalidType'
  if (file.size > MAX_IMAGE_SIZE) return 'fileTooLarge'
  return null
}

export function createImageUploader({ apiClient, allowedOrigins, formDataFactory = () => new FormData() }) {
  let inFlight = null

  return function uploadImage(file, type) {
    if (inFlight) return inFlight

    const validationError = validateImageFile(file)
    if (validationError) {
      return Promise.reject(Object.assign(new Error(validationError), { code: validationError }))
    }

    const formData = formDataFactory()
    formData.append('file', file)
    formData.append('type', type)

    inFlight = apiClient.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(response => {
      const url = getSafeImageUrl(response.data?.url, { allowedOrigins })
      if (!url) {
        throw Object.assign(new Error('Unsafe image URL'), { code: 'unsafeUrl' })
      }
      return url
    }).finally(() => {
      inFlight = null
    })

    return inFlight
  }
}
