const STATUTS_IMPLICATION = {
  NOUVEAU_MEMBRE: 'Nouveau membre',
  MEMBRE_ACTIF: 'Membre actif',
  MEMBRE_ENGAGE: 'Membre engagé',
}

export default function MemberEngagementCard({ implication }) {
  const data = implication || {
    activitesRejointes: 0,
    inscriptionsConfirmees: 0,
    projetsProposes: 0,
    statut: 'NOUVEAU_MEMBRE',
  }

  return (
    <section className="bg-white rounded-2xl shadow p-5">
      <h2 className="text-lg font-bold text-blue-900 mb-4">Mon implication</h2>
      <div className="grid grid-cols-3 gap-3 mb-4">
        <Metric label="Activités" value={data.activitesRejointes} />
        <Metric label="Confirmées" value={data.inscriptionsConfirmees} />
        <Metric label="Projets" value={data.projetsProposes} />
      </div>
      <div className="bg-teal-50 text-teal-800 rounded-xl px-4 py-3 text-sm font-semibold">
        Statut : {STATUTS_IMPLICATION[data.statut] || 'Nouveau membre'}
      </div>
    </section>
  )
}

function Metric({ label, value }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3 text-center">
      <p className="text-xl font-bold text-blue-900">{value ?? 0}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  )
}
