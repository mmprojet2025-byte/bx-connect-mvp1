import { Link } from 'react-router-dom'

const STATUTS_INSCRIPTION = {
  CONFIRMEE: 'Confirmée',
  EN_ATTENTE_PAIEMENT: 'Paiement en attente',
  ANNULEE: 'Annulée',
  PAYEE: 'Payée',
}

export default function MemberActivitiesCard({ inscriptions = [] }) {
  return (
    <section className="bg-white rounded-2xl shadow p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-blue-900">Mes activités</h2>
        <Link to="/activites" className="text-sm text-blue-700 font-semibold hover:underline">Voir tout</Link>
      </div>
      {inscriptions.length === 0 ? (
        <Empty text="Aucune inscription pour le moment." action="Voir les activités" to="/activites" />
      ) : (
        <ul className="space-y-3">
          {inscriptions.slice(0, 4).map(inscription => (
            <li key={inscription.id} className="border border-gray-100 rounded-xl p-3">
              <div className="flex justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-blue-900">{inscription.activiteTitre || 'Activité'}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {formatDate(inscription.activiteDateDebut)}
                    {inscription.activiteLieu ? ` · ${inscription.activiteLieu}` : ''}
                  </p>
                </div>
                <StatusBadge statut={inscription.statut} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function StatusBadge({ statut }) {
  const label = STATUTS_INSCRIPTION[statut] || statut || 'Statut inconnu'
  const styles = {
    CONFIRMEE: 'bg-green-100 text-green-700',
    PAYEE: 'bg-green-100 text-green-700',
    EN_ATTENTE_PAIEMENT: 'bg-yellow-100 text-yellow-700',
    ANNULEE: 'bg-red-100 text-red-700',
  }[statut] || 'bg-gray-100 text-gray-600'

  return <span className={`h-fit text-xs px-2 py-1 rounded-full font-semibold whitespace-nowrap ${styles}`}>{label}</span>
}

function Empty({ text, action, to }) {
  return (
    <div className="text-center py-6">
      <p className="text-sm text-gray-400 mb-3">{text}</p>
      <Link to={to} className="text-sm text-blue-700 font-semibold hover:underline">{action}</Link>
    </div>
  )
}

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString('fr-BE') : 'Date à venir'
}
