import { useEffect, useMemo, useState } from 'react'

const projectImageModules = import.meta.glob(
  '../assets/images/projects/*.{webp,jpg,png}',
  { eager: true, import: 'default' },
)

const PROJECT_IMAGES = Object.fromEntries(
  Object.entries(projectImageModules).map(([path, url]) => [
    path.split('/').pop().replace(/\.(webp|jpg|png)$/i, ''),
    url,
  ]),
)

const PROJECT_GRADIENTS = [
  'from-indigo-900 via-blue-800 to-cyan-400',
  'from-slate-900 via-violet-800 to-amber-400',
  'from-teal-900 via-emerald-700 to-lime-300',
  'from-rose-900 via-fuchsia-800 to-orange-300',
]

export default function ProjectCover({
  imageUrl,
  title = '',
  className = 'h-44',
}) {
  const gradient = PROJECT_GRADIENTS[Math.abs(hashText(title)) % PROJECT_GRADIENTS.length]
  const candidates = useMemo(
    () => [imageUrl, PROJECT_IMAGES['project-default']].filter(Boolean),
    [imageUrl],
  )
  const [candidateIndex, setCandidateIndex] = useState(0)
  const candidateKey = candidates.join('|')

  useEffect(() => {
    setCandidateIndex(0)
  }, [candidateKey])

  const resolvedImage = candidates[candidateIndex]

  return (
    <div className={`relative w-full ${className} overflow-hidden bg-gradient-to-br ${gradient}`}>
      {resolvedImage ? (
        <>
          <img
            src={resolvedImage}
            alt={title}
            className="h-full w-full object-cover"
            onError={() => setCandidateIndex(index => index + 1)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/65 via-slate-950/10 to-transparent" />
        </>
      ) : (
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.24)_0_1px,transparent_1px_22px)] opacity-40" />
      )}
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
