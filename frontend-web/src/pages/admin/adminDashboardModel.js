import { canDecideSupport } from './adminSupports.js'

const BUSINESS_ROLES = new Set(['MEMBRE', 'REFERENT', 'PARTENAIRE'])

// null/undefined sources are unknown, never a known zero.
export function buildAdminDashboard({ users, groups, pendingGroups, projects, activities, supports }) {
  const count = (items, predicate) => items == null ? null : items.filter(predicate).length
  const actions = {
    groups: count(pendingGroups, group => group.statut === 'EN_ATTENTE'),
    projects: count(projects, project => project.statut === 'VALIDE_REFERENT'),
    supports: count(supports, canDecideSupport),
  }
  return {
    users: count(users, user => BUSINESS_ROLES.has(user.role) && user.actif === true),
    groups: count(groups, group => group.statut === 'VALIDE'),
    activities: count(activities, activity => activity.statut === 'PUBLIEE'),
    projects: count(projects, project => ['APPROUVE', 'EN_COURS'].includes(project.statut)),
    partners: count(users, user => user.role === 'PARTENAIRE' && user.actif === true),
    drafts: count(activities, activity => activity.statut === 'BROUILLON'),
    actions,
    total: Object.values(actions).some(value => value === null)
      ? null : Object.values(actions).reduce((sum, value) => sum + value, 0),
  }
}
