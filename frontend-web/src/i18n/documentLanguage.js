const SUPPORTED_LANGUAGES = new Set(['fr', 'nl', 'en'])

export function normalizeDocumentLanguage(language) {
  const normalized = String(language || '').toLowerCase().split('-')[0]
  return SUPPORTED_LANGUAGES.has(normalized) ? normalized : 'fr'
}

export function syncDocumentLanguage(documentElement, language) {
  const normalized = normalizeDocumentLanguage(language)
  documentElement.lang = normalized
  return normalized
}
