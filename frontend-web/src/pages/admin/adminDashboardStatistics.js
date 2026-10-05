export const PROJECT_STATUSES = [
  'BROUILLON', 'SOUMIS', 'A_CORRIGER_REFERENT', 'VALIDE_REFERENT',
  'A_CORRIGER_ADMIN', 'REFUSE_REFERENT', 'APPROUVE', 'EN_COURS',
  'TERMINE', 'REJETE', 'ANNULE', 'ARCHIVE',
]

export function projectStatusCounts(projects) {
  if (projects == null) return null
  if (projects.length === 0) return []
  const counts = new Map(PROJECT_STATUSES.map(status => [status, 0]))
  for (const project of projects) {
    const status = project.statut || 'UNKNOWN'
    counts.set(status, (counts.get(status) || 0) + 1)
  }
  return [...counts].map(([status, count]) => ({ status, count }))
}

export function topActivityRegistrations(activities) {
  if (activities == null) return null
  const eligible = activities.filter(activity => ['PUBLIEE', 'TERMINEE'].includes(activity.statut))
  // A missing registration count is not evidence of zero registrations.
  if (eligible.some(activity => !Number.isInteger(activity.nombreInscrits) || activity.nombreInscrits < 0)) return null
  return eligible.map(activity => ({ id: activity.id, title: activity.titre, count: activity.nombreInscrits }))
    .sort((a, b) => b.count - a.count || String(a.id).localeCompare(String(b.id), 'en', { numeric: true }))
    .slice(0, 5)
}
