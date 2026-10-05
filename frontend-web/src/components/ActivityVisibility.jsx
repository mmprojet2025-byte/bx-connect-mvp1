import { useTranslation } from 'react-i18next'

export default function ActivityVisibility({ activity }) {
  const { t } = useTranslation()
  if (activity.statut === 'BROUILLON' || !['PUBLIC', 'MEMBRES'].includes(activity.visibilite)) return null
  return <p className="mt-2 text-sm text-slate-600">{t('activities.publication.visibility')}: {t(`activities.publication.${activity.visibilite === 'PUBLIC' ? 'everyone' : 'authenticated'}`)}</p>
}
