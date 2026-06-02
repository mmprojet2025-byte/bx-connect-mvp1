import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function MemberProjectsCard({ projets = [] }) {
  const { t } = useTranslation()

  return (
    <section className="bg-white rounded-2xl shadow p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-blue-900">{t('memberDashboard.projects.title')}</h2>
        <Link to="/projets" className="text-sm text-blue-700 font-semibold hover:underline">{t('memberDashboard.buttons.viewAll')}</Link>
      </div>

      {projets.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-sm text-gray-400 mb-3">{t('memberDashboard.projects.empty')}</p>
          <Link to="/projets" className="text-sm text-blue-700 font-semibold hover:underline">{t('memberDashboard.buttons.viewProjects')}</Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {projets.slice(0, 4).map(projet => (
            <li key={projet.id} className="flex items-center justify-between gap-3 border border-gray-100 rounded-xl p-3">
              <p className="text-sm font-semibold text-blue-900">{projet.titre}</p>
              <span className="text-xs bg-blue-100 text-blue-700 rounded-full px-2 py-1 font-semibold whitespace-nowrap">
                {t(`memberDashboard.statuses.project.${projet.statut}`, {
                  defaultValue: projet.statut || t('memberDashboard.statuses.unknown'),
                })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
