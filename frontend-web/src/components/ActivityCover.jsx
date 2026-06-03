const ACTIVITY_GRADIENTS = [
  'from-blue-800 via-teal-700 to-amber-400',
  'from-indigo-800 via-blue-700 to-cyan-400',
  'from-emerald-800 via-teal-700 to-sky-400',
  'from-rose-800 via-orange-700 to-amber-300',
]

export default function ActivityCover({ imageUrl, title = '', className = 'h-44' }) {
  const gradient = ACTIVITY_GRADIENTS[Math.abs(hashText(title)) % ACTIVITY_GRADIENTS.length]

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={title}
        className={`w-full ${className} object-cover`}
      />
    )
  }

  return (
    <div className={`relative w-full ${className} overflow-hidden bg-gradient-to-br ${gradient}`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.28),transparent_28%),radial-gradient(circle_at_80%_10%,rgba(255,255,255,0.18),transparent_24%)]" />
      <div className="absolute bottom-4 left-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/18 text-2xl font-black text-white backdrop-blur">
        {getInitial(title)}
      </div>
    </div>
  )
}

function hashText(value) {
  return String(value).split('').reduce((total, char) => total + char.charCodeAt(0), 0)
}

function getInitial(value) {
  return String(value || 'A').trim().charAt(0).toUpperCase() || 'A'
}
