const VARIANTS = {
  success: 'bg-green-100 text-green-800',
  warning: 'bg-amber-100 text-amber-800',
  danger: 'bg-red-100 text-red-800',
  info: 'bg-blue-100 text-blue-800',
  neutral: 'bg-gray-100 text-gray-700',
}

export default function StatusBadge({ children, variant = 'neutral' }) {
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${VARIANTS[variant] || VARIANTS.neutral}`}>
      {children}
    </span>
  )
}
