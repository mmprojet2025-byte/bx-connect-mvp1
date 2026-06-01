import { Link } from 'react-router-dom'

export default function EmptyState({ title, description, actionLabel, actionTo, action }) {
  const content = (
    <>
      <h2 className="font-semibold text-blue-900 mb-2">{title}</h2>
      {description && <p className="text-gray-500 text-sm max-w-md mx-auto">{description}</p>}
      {actionLabel && (
        actionTo ? (
          <Link
            to={actionTo}
            className="inline-flex mt-5 bg-blue-700 hover:bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition"
          >
            {actionLabel}
          </Link>
        ) : (
          <button
            type="button"
            onClick={action}
            className="inline-flex mt-5 bg-blue-700 hover:bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition"
          >
            {actionLabel}
          </button>
        )
      )}
    </>
  )

  return <div className="bg-white rounded-2xl shadow p-10 text-center">{content}</div>
}
