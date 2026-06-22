import AppIcon from './AppIcons'

export default function LoadingState({ label = 'Chargement en cours...' }) {
  return (
    <div
      className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-slate-100 bg-white p-10 text-center shadow-sm"
      role="status"
      aria-live="polite"
    >
      <div className="mb-4 flex h-14 w-14 animate-pulse items-center justify-center rounded-lg bg-sky-50 text-sky-600">
        <AppIcon name="Clock" className="h-7 w-7" />
      </div>
      <p className="text-sm font-medium text-slate-500">{label}</p>
    </div>
  )
}
