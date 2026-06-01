import { Link } from 'react-router-dom'

export default function MemberStatusCard({ groupe, messagerieDisponible }) {
  const config = getStatusConfig(groupe, messagerieDisponible)

  return (
    <section className={`rounded-2xl border p-5 ${config.wrapper}`}>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide opacity-75">Mon statut</p>
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

function getStatusConfig(groupe, messagerieDisponible) {
  if (!groupe) {
    return {
      title: 'Aucun groupe rejoint',
      description: 'Tu n’as pas encore rejoint de groupe. Rejoins un groupe pour accéder à la messagerie et participer à la vie de la communauté.',
      action: 'Découvrir les groupes',
      to: '/groupes',
      wrapper: 'bg-blue-50 border-blue-100 text-blue-900',
      button: 'bg-blue-700 hover:bg-blue-600 text-white',
    }
  }

  if (groupe.statutAdhesion === 'EN_ATTENTE') {
    return {
      title: 'Demande en attente',
      description: `Ta demande pour rejoindre ${groupe.nom} est en cours de validation par le référent.`,
      action: 'Voir les groupes',
      to: '/groupes',
      wrapper: 'bg-yellow-50 border-yellow-100 text-yellow-900',
      button: 'bg-yellow-600 hover:bg-yellow-500 text-white',
    }
  }

  return {
    title: `Membre du ${groupe.nom}`,
    description: messagerieDisponible
      ? 'Tu es accepté dans ton groupe. Tu peux accéder à la messagerie et participer aux activités.'
      : 'Tu es accepté dans ton groupe. La messagerie sera disponible prochainement.',
    action: messagerieDisponible ? 'Ouvrir la messagerie' : 'Ouvrir mon groupe',
    to: messagerieDisponible ? '/messagerie' : '/groupes',
    wrapper: 'bg-green-50 border-green-100 text-green-900',
    button: 'bg-green-700 hover:bg-green-600 text-white',
  }
}
