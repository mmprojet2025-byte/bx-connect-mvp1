import { useTranslation } from 'react-i18next'
import AppIcon from './ui/AppIcons'

export default function ProjectTypeBadge({ groupName, className = '' }) {
  const { t } = useTranslation()
  const isGroupProject = Boolean(groupName)

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-700 ring-1 ring-slate-200 ${className}`}>
      <AppIcon name={isGroupProject ? 'Users' : 'Shield'} className="h-3.5 w-3.5" />
      {isGroupProject ? t('projects.typeGroup') : t('projects.typeInstitutional')}
    </span>
  )
}
