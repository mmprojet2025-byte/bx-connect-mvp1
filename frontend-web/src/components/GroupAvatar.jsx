import AppIcon from './ui/AppIcons'

const GROUP_STYLES = [
  'bg-blue-100 text-blue-800',
  'bg-teal-100 text-teal-800',
  'bg-amber-100 text-amber-800',
  'bg-emerald-100 text-emerald-800',
]

export default function GroupAvatar({ name = '', size = 'lg', className = '' }) {
  const sizeClass = size === 'sm' ? 'h-11 w-11 rounded-xl' : 'h-14 w-14 rounded-2xl'
  const iconClass = size === 'sm' ? 'h-5 w-5' : 'h-7 w-7'
  const style = GROUP_STYLES[Math.abs(hashText(name)) % GROUP_STYLES.length]

  return (
    <div className={`flex shrink-0 items-center justify-center ${sizeClass} ${style} ${className}`}>
      <AppIcon name="Users" className={iconClass} />
    </div>
  )
}

function hashText(value) {
  return String(value).split('').reduce((total, char) => total + char.charCodeAt(0), 0)
}
