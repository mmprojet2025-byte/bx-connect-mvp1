export const API_TIMEOUT_MS = 15_000

export function isTimeoutError(error) {
  return error?.code === 'ECONNABORTED' || error?.code === 'ETIMEDOUT'
}

export function networkErrorTranslationKey(error) {
  if (isTimeoutError(error)) return 'common.requestTimeout'
  if (!error?.response && error?.code !== 'ERR_CANCELED' && error?.name !== 'CanceledError') {
    return 'common.networkError'
  }
  return null
}
