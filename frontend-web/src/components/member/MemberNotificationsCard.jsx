import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { resolveNotificationRoute } from '../../utils/notificationRoute'

export default function MemberNotificationsCard({ notifications = [] }) {
  const { t } = useTranslation()
  const nonLues = notifications.filter(notification => !notification.lue).length

  return (
    <section className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-blue-900">{t('memberDashboard.notifications.title')}</h2>
          <p className="text-xs text-gray-400 mt-0.5">{t('memberDashboard.notifications.subtitle')}</p>
        </div>
        <span className={`text-xs rounded-full px-2 py-1 font-semibold ${nonLues > 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>
          {t('memberDashboard.notifications.unreadCount', { count: nonLues })}
        </span>
      </div>

      {notifications.length === 0 ? (
        <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-400">
          {t('memberDashboard.notifications.empty')}
        </div>
      ) : (
        <ul className="space-y-3">
          {notifications.slice(0, 3).map(notification => (
            <li key={notification.id} className={`border rounded-xl p-3 ${notification.lue ? 'border-gray-100 bg-white' : 'border-blue-100 bg-blue-50'}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-blue-900">{notification.titre}</p>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{notification.message}</p>
                  {notification.lienAction && (
                    <Link
                      to={resolveNotificationRoute(notification)}
                      className="inline-flex mt-2 text-xs font-semibold text-blue-700 hover:underline"
                    >
                      {t('memberDashboard.buttons.open')}
                    </Link>
                  )}
                </div>
                {!notification.lue && <span className="w-2 h-2 rounded-full bg-blue-600 mt-1 flex-shrink-0" />}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Link to="/notifications" className="inline-block mt-4 text-sm text-blue-700 font-semibold hover:underline">
        {t('memberDashboard.buttons.viewNotifications')}
      </Link>
    </section>
  )
}
