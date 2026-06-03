const GROUP_STYLES = [
  'bg-blue-100 text-blue-800',
  'bg-teal-100 text-teal-800',
  'bg-amber-100 text-amber-800',
  'bg-emerald-100 text-emerald-800',
]

export default function GroupAvatar({ name = '', size = 'lg', className = '' }) {
  const sizeClass = size === 'sm' ? 'h-11 w-11 text-base rounded-xl' : 'h-14 w-14 text-xl rounded-2xl'
  const style = GROUP_STYLES[Math.abs(hashText(name)) % GROUP_STYLES.length]

  return (
    <div className={`flex shrink-0 items-center justify-center font-black ${sizeClass} ${style} ${className}`}>
      {getInitial(name)}
    </div>
  )
}

function hashText(value) {
  return String(value).split('').reduce((total, char) => total + char.charCodeAt(0), 0)
}

function getInitial(value) {
  return String(value || 'G').trim().charAt(0).toUpperCase() || 'G'
}
