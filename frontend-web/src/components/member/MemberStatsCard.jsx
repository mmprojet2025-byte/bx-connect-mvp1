export default function MemberStatsCard({ implication, notifications = [] }) {
  const data = implication || {}
  const nonLues = notifications.filter(notification => !notification.lue).length

  return (
    <section className="bg-white rounded-2xl shadow p-5">
      <h2 className="text-lg font-bold text-blue-900 mb-4">Mes statistiques</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Metric label="Activités rejointes" value={data.activitesRejointes ?? 0} />
        <Metric label="Inscriptions confirmées" value={data.inscriptionsConfirmees ?? 0} />
        <Metric label="Projets proposés" value={data.projetsProposes ?? 0} />
        <Metric label="Notifications non lues" value={nonLues} />
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
