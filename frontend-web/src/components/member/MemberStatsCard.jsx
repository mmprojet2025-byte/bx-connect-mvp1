import { useTranslation } from 'react-i18next'

export default function MemberStatsCard({ implication, notifications = [] }) {
  const { t } = useTranslation()
  const data = implication || {}
  const nonLues = notifications.filter(notification => !notification.lue).length

  return (
    <section className="bg-white rounded-2xl shadow p-5">
      <h2 className="text-lg font-bold text-blue-900 mb-4">{t('memberDashboard.stats.title')}</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Metric label={t('memberDashboard.stats.activitiesJoined')} value={data.activitesRejointes ?? 0} />
        <Metric label={t('memberDashboard.stats.confirmedRegistrations')} value={data.inscriptionsConfirmees ?? 0} />
        <Metric label={t('memberDashboard.stats.proposedProjects')} value={data.projetsProposes ?? 0} />
        <Metric label={t('memberDashboard.stats.unreadNotifications')} value={nonLues} />
      </div>
    </section>
  )
}

function Metric({ label, value }) {
  return (
    <div className="bg-gray-50 rounded-xl p-4">
      <p className="text-2xl font-bold text-blue-900">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  )
}
