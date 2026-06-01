import { Link } from 'react-router-dom'

export default function ErrorState({
  title = "Vous n'avez pas accès à cet espace.",
  description = 'Retournez à votre tableau de bord pour continuer.',
  actionLabel = 'Retour au dashboard',
  actionTo = '/dashboard',
}) {
  return (
    <div className="bg-white rounded-2xl shadow p-10 text-center">
      <h2 className="font-semibold text-red-700 mb-2">{title}</h2>
      <p className="text-gray-500 text-sm max-w-md mx-auto">{description}</p>
      <Link
        to={actionTo}
        className="inline-flex mt-5 bg-blue-700 hover:bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition"
      >
        {actionLabel}
      </Link>
    </div>
  )
}
