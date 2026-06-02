import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function MemberNextActions({ groupe, messagerieDisponible }) {
  const { t } = useTranslation()
  const actions = getActions(groupe, messagerieDisponible, t)

  return (
    <section className="bg-white rounded-2xl shadow p-5">
      <h2 className="text-lg font-bold text-blue-900 mb-4">{t('memberDashboard.nextActions.title')}</h2>
      <div className="space-y-3">
        {actions.map((action, index) => (
          <Link key={action.to} to={action.to} className="flex items-center gap-3 rounded-xl bg-gray-50 hover:bg-blue-50 px-4 py-3 transition">
            <span className="w-7 h-7 rounded-full bg-blue-700 text-white flex items-center justify-center text-xs font-bold">{index + 1}</span>
            <span className="text-sm font-medium text-gray-700">{action.label}</span>
          </Link>
        ))}
      </div>
    </section>
  )
}

function getActions(groupe, messagerieDisponible, t) {
  if (!groupe) {
    return [
      { label: t('memberDashboard.nextActions.joinGroup'), to: '/groupes' },
      { label: t('memberDashboard.nextActions.discoverActivities'), to: '/activites' },
      { label: t('memberDashboard.nextActions.completeProfile'), to: '/profil' },
    ]
  }

  if (groupe.statutAdhesion === 'EN_ATTENTE') {
    return [
      { label: t('memberDashboard.nextActions.followGroupRequest'), to: '/groupes' },
      { label: t('memberDashboard.nextActions.viewActivities'), to: '/activites' },
      { label: t('memberDashboard.nextActions.discoverProjects'), to: '/projets' },
    ]
  }

  return [
    { label: messagerieDisponible ? t('memberDashboard.nextActions.openGroupMessaging') : t('memberDashboard.nextActions.viewMyGroup'), to: messagerieDisponible ? '/messagerie' : '/groupes' },
    { label: t('memberDashboard.nextActions.registerActivity'), to: '/activites' },
    { label: t('memberDashboard.nextActions.proposeOrJoinProject'), to: '/projets' },
  ]
}
