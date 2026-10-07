import { emptyActivityForm, activityPayload, eligibleGroups, validateActivityForm } from '../admin/activityForm.js'

export function ownActivityGroups(groups, profile) {
  if (!profile?.actif || profile.role !== 'REFERENT') return []
  return eligibleGroups(groups).filter(group => group.referentId === profile.id)
}

export function newReferentActivity(groups) {
  return { ...emptyActivityForm, nature: 'GROUPE', groupeId: groups.length === 1 ? groups[0].id : '' }
}

// Unassigned history is already authorized by /referent/mes-activites on the server.
export function canManageAssignedActivity(activity, groups, profile) {
  if (!profile?.actif || profile.role !== 'REFERENT') return false
  if (activity.groupeId == null) return activity.referentAssigneId == null && activity.visibilite !== 'PRIVE_GROUPE'
  return activity.referentAssigneId === profile.id
    && ownActivityGroups(groups, profile).some(group => group.id === activity.groupeId)
}

export function validateReferentActivity(form, groups, profile, original) {
  const ownGroups = ownActivityGroups(groups, profile)
  const errors = validateActivityForm(form, ownGroups, profile ? [profile] : [], original)
  if ((!original && form.nature !== 'GROUPE') || (original && !canManageAssignedActivity(original, groups, profile))) errors.push('referent')
  if (original && String(form.groupeId || '') !== String(original.groupeId || '')) errors.push('referent')
  return [...new Set(errors)]
}

export function referentActivityPayload(form, original) {
  const payload = activityPayload(form, original)
  if (original) {
    delete payload.nature
    delete payload.groupeId
    delete payload.referentAssigneId
    // Preserve unassigned history, including its audience, without conversion.
    if (original.groupeId == null) delete payload.visibilite
  }
  return payload
}
