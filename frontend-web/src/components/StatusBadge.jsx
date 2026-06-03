const STATUS_STYLES = {
  EN_ATTENTE: 'bg-orange-100 text-orange-800',
  ACCEPTE: 'bg-green-100 text-green-800',
  REFUSE: 'bg-red-100 text-red-800',
  VALIDE: 'bg-green-100 text-green-800',
  PUBLIEE: 'bg-blue-100 text-blue-800',
  ANNULEE: 'bg-gray-100 text-gray-700',
  BROUILLON: 'bg-gray-50 text-gray-600 border border-gray-200',
  EN_COURS: 'bg-blue-100 text-blue-800',
  TERMINE: 'bg-emerald-100 text-emerald-900',
  TERMINEE: 'bg-emerald-100 text-emerald-900',
  ARCHIVE: 'bg-gray-100 text-gray-700',
}

export default function StatusBadge({ status, children, className = '' }) {
  const styles = STATUS_STYLES[status] || 'bg-gray-100 text-gray-700'

  return (
    <span className={`inline-flex h-fit items-center rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${styles} ${className}`}>
      {children}
    </span>
  )
}
