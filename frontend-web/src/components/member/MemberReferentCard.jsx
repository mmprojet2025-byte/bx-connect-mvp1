import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function MemberReferentCard({ referent, groupe, messagerieDisponible }) {
  const { t } = useTranslation()

  return (
    <section className="bg-white rounded-2xl shadow p-5">
      <h2 className="text-lg font-bold text-blue-900 mb-4">{t('memberDashboard.referent.title')}</h2>
      {referent && groupe?.statutAdhesion === 'ACCEPTE' ? (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
              {initiales(referent)}
            </div>
            <div>
              <p className="font-semibold text-blue-900">{referent.prenom} {referent.nom}</p>
              <p className="text-xs text-gray-500">{t('memberDashboard.referent.ofGroup', { group: groupe.nom })}</p>
            </div>
          </div>
          {referent.email && <p className="text-sm text-gray-500 mb-4">{referent.email}</p>}
          {messagerieDisponible && (
            <Link to="/messagerie" className="inline-block bg-teal-700 hover:bg-teal-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition">
              {t('memberDashboard.buttons.openMessaging')}
            </Link>
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-400">
          {groupe?.statutAdhesion === 'EN_ATTENTE'
            ? t('memberDashboard.referent.pending')
            : t('memberDashboard.referent.empty')}
        </p>
      )}
    </section>
  )
}

function initiales(referent) {
  return `${referent.prenom?.[0] || ''}${referent.nom?.[0] || ''}`.toUpperCase() || '?'
}
