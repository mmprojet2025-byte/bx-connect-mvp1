import { Link } from 'react-router-dom'

const STATUTS_PROJET = {
  BROUILLON: 'Brouillon',
  SOUMIS: 'En validation',
  APPROUVE: 'Approuvé',
  EN_COURS: 'En cours',
  TERMINE: 'Terminé',
  REJETE: 'Rejeté',
  ARCHIVE: 'Archivé',
}

export default function MemberProjectsCard({ projets = [] }) {
  return (
    <section className="bg-white rounded-2xl shadow p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-blue-900">Mes projets</h2>
        <Link to="/projets" className="text-sm text-blue-700 font-semibold hover:underline">Voir tout</Link>
      </div>

      {projets.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-sm text-gray-400 mb-3">Aucun projet proposé pour le moment.</p>
          <Link to="/projets" className="text-sm text-blue-700 font-semibold hover:underline">Découvrir les projets</Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {projets.slice(0, 4).map(projet => (
            <li key={projet.id} className="flex items-center justify-between gap-3 border border-gray-100 rounded-xl p-3">
              <p className="text-sm font-semibold text-blue-900">{projet.titre}</p>
              <span className="text-xs bg-blue-100 text-blue-700 rounded-full px-2 py-1 font-semibold whitespace-nowrap">
                {STATUTS_PROJET[projet.statut] || projet.statut}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
