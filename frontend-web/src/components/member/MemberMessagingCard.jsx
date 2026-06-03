import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function MemberMessagingCard({ groupe, messagerieDisponible }) {
  const { t } = useTranslation()

  return (
    <section className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
      <h2 className="text-lg font-bold text-blue-900 mb-4">{t('memberDashboard.messaging.title')}</h2>
      {messagerieDisponible ? (
        <>
          <p className="text-sm text-gray-500 mb-4">
            {t('memberDashboard.messaging.availableDescription', {
              group: groupe?.nom || t('memberDashboard.group.fallbackGroup'),
            })}
          </p>
          <Link to="/messagerie" className="inline-block bg-blue-700 hover:bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition">
            {t('memberDashboard.buttons.openMessaging')}
          </Link>
        </>
      ) : (
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-sm text-gray-500">
            {groupe?.statutAdhesion === 'EN_ATTENTE'
              ? t('memberDashboard.messaging.pendingDescription')
              : t('memberDashboard.messaging.unavailableDescription')}
          </p>
        </div>
      )}
    </section>
  )
}
