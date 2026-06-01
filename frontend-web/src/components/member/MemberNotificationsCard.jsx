import { Link } from 'react-router-dom'

export default function MemberNotificationsCard({ notifications = [] }) {
  const nonLues = notifications.filter(notification => !notification.lue).length

  return (
    <section className="bg-white rounded-2xl shadow p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-blue-900">Notifications</h2>
        <span className="text-xs bg-red-100 text-red-700 rounded-full px-2 py-1 font-semibold">{nonLues} non lue(s)</span>
      </div>

      {notifications.length === 0 ? (
        <p className="text-sm text-gray-400">Aucune notification importante.</p>
      ) : (
        <ul className="space-y-3">
          {notifications.slice(0, 3).map(notification => (
            <li key={notification.id} className="border border-gray-100 rounded-xl p-3">
              <p className="text-sm font-semibold text-blue-900">{notification.titre}</p>
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{notification.message}</p>
            </li>
          ))}
        </ul>
      )}

      <Link to="/notifications" className="inline-block mt-4 text-sm text-blue-700 font-semibold hover:underline">
        Voir les notifications
      </Link>
    </section>
  )
}
