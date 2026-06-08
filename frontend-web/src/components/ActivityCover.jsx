import { useEffect, useMemo, useState } from 'react'
import AppIcon from './ui/AppIcons'

const activityImageModules = import.meta.glob(
  '../assets/images/activities/*.webp',
  { eager: true, import: 'default' },
)

const ACTIVITY_IMAGES = Object.fromEntries(
  Object.entries(activityImageModules).map(([path, url]) => [
    path.split('/').pop().replace('.webp', ''),
    url,
  ]),
)

const ACTIVITY_IMAGE_RULES = [
  { image: 'activity-sport', keywords: ['sport', 'fitness', 'danse'] },
  { image: 'activity-culture', keywords: ['culture', 'art', 'musique', 'theatre'] },
  { image: 'activity-training', keywords: ['formation', 'atelier', 'ecole', 'apprentissage'] },
  { image: 'activity-digital', keywords: ['numerique', 'digital', 'informatique', 'media'] },
  { image: 'activity-community', keywords: ['citoyen', 'solidarite', 'benevolat', 'environnement', 'communaute'] },
]

const ACTIVITY_GRADIENTS = [
  'from-blue-800 via-teal-700 to-amber-400',
  'from-indigo-800 via-blue-700 to-cyan-400',
  'from-emerald-800 via-teal-700 to-sky-400',
  'from-rose-800 via-orange-700 to-amber-300',
]

export default function ActivityCover({
  imageUrl,
  title = '',
  categorie = '',
  theme = '',
  className = 'h-44',
}) {
  const gradient = ACTIVITY_GRADIENTS[Math.abs(hashText(title)) % ACTIVITY_GRADIENTS.length]
  const candidates = useMemo(
    () => getImageCandidates({ imageUrl, categorie, theme }),
    [imageUrl, categorie, theme],
  )
  const [candidateIndex, setCandidateIndex] = useState(0)
  const candidateKey = candidates.join('|')

  useEffect(() => {
    setCandidateIndex(0)
  }, [candidateKey])

  if (candidates[candidateIndex]) {
    return (
      <img
        src={candidates[candidateIndex]}
        alt={title}
        className={`w-full ${className} object-cover`}
        onError={() => setCandidateIndex(index => index + 1)}
      />
    )
  }

  return (
    <div className={`relative w-full ${className} overflow-hidden bg-gradient-to-br ${gradient}`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.28),transparent_28%),radial-gradient(circle_at_80%_10%,rgba(255,255,255,0.18),transparent_24%)]" />
      <div className="absolute bottom-4 left-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/18 text-white backdrop-blur">
        <AppIcon name="Calendar" className="h-7 w-7" />
      </div>
    </div>
  )
}

function getImageCandidates({ imageUrl, categorie, theme }) {
  const normalizedMetadata = normalizeText(`${categorie} ${theme}`)
  const matchedRule = ACTIVITY_IMAGE_RULES.find(rule =>
    rule.keywords.some(keyword => normalizedMetadata.includes(keyword))
  )

  return [
    imageUrl,
    matchedRule ? ACTIVITY_IMAGES[matchedRule.image] : null,
    ACTIVITY_IMAGES['activity-default'],
  ].filter((url, index, urls) => url && urls.indexOf(url) === index)
}

function normalizeText(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function hashText(value) {
  return String(value).split('').reduce((total, char) => total + char.charCodeAt(0), 0)
}
