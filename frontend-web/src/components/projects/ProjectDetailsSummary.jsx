import { useTranslation } from 'react-i18next'
import { projectFull, projectRegistrationClosed } from './projectDetails'

export default function ProjectDetailsSummary({ project }) {
  const { t, i18n } = useTranslation()
  const format = value => value ? new Date(`${value}T12:00:00`).toLocaleDateString(i18n.language) : t('projectDetails.notSet')
  return <div className="my-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
    <dl className="grid gap-2 sm:grid-cols-2">
      <div><dt className="font-semibold">{t('projectDetails.execution')}</dt><dd>{format(project.dateExecution)}</dd></div>
      <div><dt className="font-semibold">{t('projectDetails.deadline')}</dt><dd>{format(project.dateLimiteParticipation)}</dd></div>
      <div className="sm:col-span-2"><dt className="font-semibold">{t('projectDetails.capacity')}</dt>
        <dd>{project.nombreParticipants ?? 0} / {project.capacite ?? t('projectDetails.unlimited')}</dd></div>
    </dl>
    {(projectFull(project) || projectRegistrationClosed(project)) && <p className="mt-2 font-bold text-amber-800">
      {t(projectRegistrationClosed(project) ? 'projectDetails.closed' : 'projectDetails.full')}
    </p>}
  </div>
}
