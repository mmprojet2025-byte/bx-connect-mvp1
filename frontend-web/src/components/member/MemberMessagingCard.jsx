import { Link } from 'react-router-dom'

export default function MemberMessagingCard({ groupe, messagerieDisponible }) {
  return (
    <section className="bg-white rounded-2xl shadow p-5">
      <h2 className="text-lg font-bold text-blue-900 mb-4">Messagerie</h2>
      {messagerieDisponible ? (
        <>
          <p className="text-sm text-gray-500 mb-4">
            Accède à la discussion du {groupe?.nom || 'groupe'} avec les membres et le référent.
          </p>
          <Link to="/messagerie" className="inline-block bg-blue-700 hover:bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition">
            Ouvrir la messagerie
          </Link>
        </>
      ) : (
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-sm text-gray-500">
            {groupe?.statutAdhesion === 'EN_ATTENTE'
              ? 'La messagerie sera disponible après ton acceptation dans le groupe.'
              : 'La messagerie est disponible après acceptation dans un groupe.'}
          </p>
        </div>
      )}
    </section>
  )
}
