import { useTranslation } from 'react-i18next'

export default function ActivityVisibility({ activity, showDraft = false }) {
  const { t } = useTranslation()
  if ((!showDraft && activity.statut === 'BROUILLON') || !['PUBLIC', 'MEMBRES', 'PRIVE_GROUPE'].includes(activity.visibilite)) return null
  if (activity.visibilite === 'PRIVE_GROUPE') return <p className="mt-2 text-sm text-slate-600">{t('activities.publication.visibility')}: {t('adminActivity.private')}</p>
  return <p className="mt-2 text-sm text-slate-600">{t('activities.publication.visibility')}: {t(`activities.publication.${activity.visibilite === 'PUBLIC' ? 'everyone' : 'authenticated'}`)}</p>
}
