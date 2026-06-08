import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import AppIcon from './AppIcons'

export default function ErrorState({
  title,
  description,
  actionLabel,
  actionTo,
  action,
}) {
  const { t } = useTranslation()
  const fallbackTitle = t('common.loadErrorTitle', {
    defaultValue: 'Impossible de charger les données',
  })
  const fallbackDescription = t('common.loadErrorDescription', {
    defaultValue: 'Vérifiez votre connexion, puis réessayez.',
  })
  const fallbackActionLabel = t('common.retry', { defaultValue: 'Réessayer' })
  const resolvedTitle = resolveText(title, fallbackTitle)
  const resolvedDescription = resolveText(description, description ? fallbackDescription : '')
  const resolvedActionLabel = resolveText(actionLabel, fallbackActionLabel)

  return (
    <div className="rounded-3xl border border-red-100 bg-white p-10 text-center shadow-sm">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
        <AppIcon name="AlertTriangle" className="h-7 w-7" />
      </div>
      <h2 className="mb-2 font-semibold text-slate-950">{resolvedTitle}</h2>
      {resolvedDescription && <p className="mx-auto max-w-md text-sm text-slate-500">{resolvedDescription}</p>}
      {actionTo ? (
        <Link
          to={actionTo}
          className="mt-5 inline-flex rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-600"
        >
          {resolvedActionLabel}
        </Link>
      ) : action ? (
        <button
          type="button"
          onClick={action}
          className="mt-5 inline-flex rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-600"
        >
          {resolvedActionLabel}
        </button>
      ) : null}
    </div>
  )
}

function resolveText(value, fallback) {
  if (!value) return fallback
  return looksLikeTranslationKey(value) ? fallback : value
}

function looksLikeTranslationKey(value) {
  return typeof value === 'string'
    && value.includes('.')
    && /^[a-zA-Z0-9_.-]+$/.test(value)
}
