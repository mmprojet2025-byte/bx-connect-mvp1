import { Link } from 'react-router-dom'

export default function MemberNextActions({ groupe, messagerieDisponible }) {
  const actions = getActions(groupe, messagerieDisponible)

  return (
    <section className="bg-white rounded-2xl shadow p-5">
      <h2 className="text-lg font-bold text-blue-900 mb-4">Mes prochaines actions</h2>
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

function getActions(groupe, messagerieDisponible) {
  if (!groupe) {
    return [
      { label: 'Rejoindre un groupe', to: '/groupes' },
      { label: 'Découvrir les activités', to: '/activites' },
      { label: 'Compléter mon profil', to: '/profil' },
    ]
  }

  if (groupe.statutAdhesion === 'EN_ATTENTE') {
    return [
      { label: 'Suivre ma demande de groupe', to: '/groupes' },
      { label: 'Consulter les activités', to: '/activites' },
      { label: 'Découvrir les projets', to: '/projets' },
    ]
  }

  return [
    { label: messagerieDisponible ? 'Ouvrir la messagerie du groupe' : 'Voir mon groupe', to: messagerieDisponible ? '/messagerie' : '/groupes' },
    { label: 'S’inscrire à une activité', to: '/activites' },
    { label: 'Proposer ou rejoindre un projet', to: '/projets' },
  ]
}
