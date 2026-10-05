import i18n from '../i18n/index.js'
export function activityError(error, fallback = i18n.t('activityErrors.UNAVAILABLE')) {
  const code = error?.response?.data?.code
  if (['PAYMENT', 'PRICE', 'IMAGE', 'CAPACITY', 'DEADLINE', 'GROUP', 'DATES', 'UNAVAILABLE'].includes(code)) return i18n.t(`activityErrors.${code}`)
  if (error?.response?.status === 403) return i18n.t('activityErrors.GROUP')
  return fallback
}
