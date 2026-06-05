import { useTranslation } from 'react-i18next'

const STYLES = {
  GROUPE: 'bg-slate-100 text-slate-700 ring-slate-200',
  COMMUNAUTE: 'bg-blue-50 text-blue-700 ring-blue-200',
  PARTENAIRES: 'bg-orange-50 text-orange-700 ring-orange-200',
  PUBLIC: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
}

export default function ProjectVisibilityBadge({ visibility = 'GROUPE', className = '' }) {
  const { t } = useTranslation()
  const value = visibility || 'GROUPE'

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${STYLES[value] || STYLES.GROUPE} ${className}`}>
      {t(`projectVisibility.${value}`, { defaultValue: value })}
    </span>
  )
}
