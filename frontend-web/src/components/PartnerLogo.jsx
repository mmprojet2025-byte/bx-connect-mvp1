import AppIcon from './ui/AppIcons'

export default function PartnerLogo({ logoUrl, name = '', size = 'lg', className = '' }) {
  const sizeClass = size === 'sm' ? 'h-12 w-12 rounded-2xl' : 'h-20 w-20 rounded-3xl'

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={name}
        className={`${sizeClass} shrink-0 border border-white/40 bg-white object-contain p-2 shadow-sm ${className}`}
      />
    )
  }

  return (
    <div className={`${sizeClass} flex shrink-0 items-center justify-center bg-white/18 text-white ring-1 ring-white/30 ${className}`}>
      <AppIcon name="Building" className={size === 'sm' ? 'h-6 w-6' : 'h-9 w-9'} />
    </div>
  )
}
