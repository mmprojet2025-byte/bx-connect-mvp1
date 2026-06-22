import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function MemberStatusCard({ groupe, messagerieDisponible }) {
  const { t } = useTranslation()
  const config = getStatusConfig(groupe, messagerieDisponible, t)

  return (
    <section className={`rounded-lg border p-5 ${config.wrapper}`}>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide opacity-75">{t('memberDashboard.status.title')}</p>
          <h2 className="text-xl font-bold mt-1">{config.title}</h2>
          <p className="text-sm mt-2 max-w-2xl opacity-85">{config.description}</p>
        </div>
        <Link to={config.to} className={`self-start md:self-center text-sm font-semibold px-4 py-2 rounded-xl transition ${config.button}`}>
          {config.action}
        </Link>
      </div>
    </section>
  )
}

function getStatusConfig(groupe, messagerieDisponible, t) {
  if (!groupe) {
    return {
      title: t('memberDashboard.status.noGroupTitle'),
      description: t('memberDashboard.status.noGroupDescription'),
      action: t('memberDashboard.buttons.discoverGroups'),
      to: '/groupes',
      wrapper: 'bg-blue-50 border-blue-100 text-blue-900',
      button: 'bg-blue-700 hover:bg-blue-600 text-white',
    }
  }

  if (groupe.statutAdhesion === 'EN_ATTENTE') {
    return {
      title: t('memberDashboard.status.pendingTitle'),
      description: t('memberDashboard.status.pendingDescription', { group: groupe.nom }),
      action: t('memberDashboard.buttons.viewGroups'),
      to: '/groupes',
      wrapper: 'bg-yellow-50 border-yellow-100 text-yellow-900',
      button: 'bg-yellow-600 hover:bg-yellow-500 text-white',
    }
  }

  return {
    title: t('memberDashboard.status.acceptedTitle', { group: groupe.nom }),
    description: messagerieDisponible
      ? t('memberDashboard.status.acceptedMessagingAvailable')
      : t('memberDashboard.status.acceptedMessagingUnavailable'),
    action: messagerieDisponible ? t('memberDashboard.buttons.openMessaging') : t('memberDashboard.buttons.openMyGroup'),
    to: messagerieDisponible ? '/messagerie' : '/groupes',
    wrapper: 'bg-green-50 border-green-100 text-green-900',
    button: 'bg-green-700 hover:bg-green-600 text-white',
  }
}
