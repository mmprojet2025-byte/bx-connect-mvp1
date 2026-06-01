const STATUTS_IMPLICATION = {
  NOUVEAU_MEMBRE: 'Nouveau membre',
  MEMBRE_ACTIF: 'Membre actif',
  MEMBRE_ENGAGE: 'Membre engagé',
}

export default function MemberEngagementCard({ implication }) {
  const data = implication || {
    statut: 'NOUVEAU_MEMBRE',
  }
  const label = STATUTS_IMPLICATION[data.statut] || 'Nouveau membre'
  const description = {
    NOUVEAU_MEMBRE: 'Commence ton parcours en rejoignant un groupe et en participant à une activité.',
    MEMBRE_ACTIF: 'Tu participes déjà à la vie de BX-Connect. Continue à suivre les activités et les projets.',
    MEMBRE_ENGAGE: 'Tu es fortement impliqué dans la communauté. Ton engagement fait vivre le groupe.',
  }[data.statut] || 'Commence ton parcours dans la communauté BX-Connect.'

  return (
    <section className="bg-white rounded-2xl shadow p-5">
      <h2 className="text-lg font-bold text-blue-900 mb-4">Mon implication</h2>
      <div className="bg-teal-50 text-teal-800 rounded-xl px-4 py-3 text-sm font-semibold">
        Statut : {label}
      </div>
      <p className="text-sm text-gray-500 mt-4">{description}</p>
    </section>
  )
}
