import { Link } from 'react-router-dom'
import AppIcon from './AppIcons'

export default function EmptyState({
  title,
  description,
  actionLabel,
  actionTo,
  action,
  icon = 'Folder',
}) {
  const content = (
    <>
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
        <AppIcon name={icon} className="h-7 w-7" />
      </div>
      <h2 className="mb-2 font-semibold text-slate-950">{title}</h2>
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

  return (
    <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center shadow-sm">
      {content}
    </div>
  )
}
