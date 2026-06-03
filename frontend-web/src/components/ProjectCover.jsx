const PROJECT_GRADIENTS = [
  'from-indigo-900 via-blue-800 to-cyan-400',
  'from-slate-900 via-violet-800 to-amber-400',
  'from-teal-900 via-emerald-700 to-lime-300',
  'from-rose-900 via-fuchsia-800 to-orange-300',
]

export default function ProjectCover({ imageUrl, title = '', className = 'h-44' }) {
  const gradient = PROJECT_GRADIENTS[Math.abs(hashText(title)) % PROJECT_GRADIENTS.length]

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
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.24)_0_1px,transparent_1px_22px)] opacity-40" />
      <div className="absolute bottom-4 left-4 rounded-2xl bg-white/18 px-4 py-3 backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-wide text-white/80">BX-Connect</p>
        <p className="mt-1 max-w-[12rem] truncate text-lg font-black text-white">{title || 'Projet'}</p>
      </div>
    </div>
  )
}

function hashText(value) {
  return String(value).split('').reduce((total, char) => total + char.charCodeAt(0), 0)
}
