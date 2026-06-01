import { Link } from 'react-router-dom'

export default function MemberGroupCard({ groupe, referent, messagerieDisponible }) {
  const statut = groupe?.statutAdhesion

  if (!groupe) {
    return (
      <section className="bg-white rounded-2xl shadow overflow-hidden">
        <GroupBanner />
        <div className="p-6">
          <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-semibold">Nouveau membre</span>
          <h2 className="text-2xl font-bold text-blue-900 mt-4">Rejoins un groupe</h2>
          <p className="text-gray-500 text-sm mt-2 max-w-2xl">
            Les groupes sont le coeur de BX-Connect. Rejoins un groupe pour participer aux activités,
            rencontrer d'autres jeunes et accéder à la messagerie.
          </p>
          <Link to="/groupes" className="inline-block mt-5 bg-blue-700 hover:bg-blue-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition">
            Découvrir les groupes
          </Link>
        </div>
      </section>
    )
  }

  const demandeEnAttente = statut === 'EN_ATTENTE'
  const statutLabel = demandeEnAttente ? 'Demande en attente' : 'Membre accepté'
  const referentLabel = referent ? `${referent.prenom} ${referent.nom}` : 'Référent à confirmer'

  return (
    <section className="bg-white rounded-2xl shadow overflow-hidden">
      <GroupBanner imageUrl={groupe.imageUrl} />
      <div className="p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <span className={`text-xs px-3 py-1 rounded-full font-semibold ${demandeEnAttente ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
              {statutLabel}
            </span>
            <h2 className="text-2xl font-bold text-blue-900 mt-4">{groupe.nom}</h2>
            <div className="flex flex-wrap gap-2 mt-3 text-xs">
              <InfoPill label="Statut" value={statutLabel} />
              <InfoPill label="Référent" value={referentLabel} />
            </div>
            {groupe.description && (
              <p className="text-gray-500 text-sm mt-2 max-w-2xl">{groupe.description}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 min-w-[220px]">
            <Metric label="Membres" value={groupe.nombreMembres ?? 0} />
            <Metric label="Activités à venir" value={groupe.nombreActivitesAVenir ?? 0} />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <Link to="/groupes" className="bg-blue-700 hover:bg-blue-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition">
            Ouvrir mon groupe
          </Link>
          {messagerieDisponible && (
            <Link to="/messagerie" className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold px-5 py-2.5 rounded-xl transition">
              Ouvrir la messagerie
            </Link>
          )}
        </div>
      </div>
    </section>
  )
}

function InfoPill({ label, value }) {
  return (
    <span className="bg-gray-50 border border-gray-100 text-gray-600 rounded-full px-3 py-1">
      <strong className="text-gray-800">{label} :</strong> {value}
    </span>
  )
}

function GroupBanner({ imageUrl }) {
  return (
    <div
      className="h-36 bg-blue-900"
      style={{
        backgroundImage: imageUrl ? `url(${imageUrl})` : 'linear-gradient(135deg, #1e3a8a 0%, #0f766e 55%, #f59e0b 100%)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    />
  )
}

function Metric({ label, value }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3 text-center">
      <p className="text-xl font-bold text-blue-900">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  )
}
