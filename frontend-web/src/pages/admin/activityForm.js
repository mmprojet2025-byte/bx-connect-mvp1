export const emptyActivityForm = {
  titre: '', description: '', dateDebut: '', dateFin: '', lieu: '',
  adresse: '', commune: '', latitude: '', longitude: '',
  gratuite: true, prix: '', capaciteMax: 1, categorie: '', theme: '',
  nature: 'GENERALE', groupeId: '', visibilite: 'PUBLIC',
}

export function activityToForm(activity) {
  const form = { ...emptyActivityForm }
  for (const key of Object.keys(form)) form[key] = activity[key] ?? form[key]
  form.dateDebut = activity.dateDebut || ''
  form.dateFin = activity.dateFin || ''
  form.nature = activity.groupeId == null ? 'GENERALE' : 'GROUPE'
  return form
}

export function assignmentLocked(activity) {
  return Boolean(activity && (activity.statut !== 'BROUILLON' || activity.gratuite === false || activity.visibilite === 'MEMBRES'))
}

export function eligibleGroups(groups) {
  return groups.filter(group => group.actif && group.statut === 'VALIDE')
}

export function groupReferent(group, referents) {
  return referents.find(ref => ref.id === group?.referentId && ref.actif && ref.role === 'REFERENT')
}

export function validateActivityForm(form, groups, referents, original) {
  const errors = []
  for (const key of ['titre', 'description', 'lieu']) {
    if (!form[key].trim()) errors.push(key)
  }
  const start = Date.parse(form.dateDebut)
  const end = Date.parse(form.dateFin)
  if (!Number.isFinite(start)) errors.push('dateDebut')
  if (!Number.isFinite(end)) errors.push('dateFin')
  if (Number.isFinite(start) && Number.isFinite(end) && end <= start) errors.push('dateOrder')
  if (!Number.isInteger(Number(form.capaciteMax)) || Number(form.capaciteMax) <= 0) errors.push('capaciteMax')
  if (form.nature === 'GROUPE') {
    const group = eligibleGroups(groups).find(item => item.id === Number(form.groupeId))
    if (!group) errors.push('groupeId')
    else {
      const ref = groupReferent(group, referents)
      if (!ref || (original?.groupeId === group.id && original.referentAssigneId !== ref.id)) errors.push('referent')
    }
    if (!['PUBLIC', 'PRIVE_GROUPE'].includes(form.visibilite)) errors.push('visibilite')
  }
  return errors
}

export function activityPayload(form, original) {
  const { nature, groupeId, visibilite, ...fields } = form
  const payload = {
    ...fields,
    titre: form.titre.trim(), description: form.description.trim(), lieu: form.lieu.trim(),
    capaciteMax: Number(form.capaciteMax),
    latitude: form.latitude === '' ? null : Number(form.latitude),
    longitude: form.longitude === '' ? null : Number(form.longitude),
    gratuite: original?.gratuite ?? true,
    prix: original ? original.prix ?? null : null,
  }
  if (assignmentLocked(original)) return payload // Omission preserves historical and frozen assignments.
  return {
    ...payload, nature,
    groupeId: nature === 'GROUPE' ? Number(groupeId) : null,
    ...(nature === 'GENERALE' ? { referentAssigneId: null } : {}), // Server derives the group's referent.
    visibilite: nature === 'GENERALE' ? 'PUBLIC' : visibilite,
  }
}

export function audienceKey(activity) {
  if (activity.visibilite === 'MEMBRES') return 'legacyAudience'
  if (activity.groupeId != null) return activity.visibilite === 'PRIVE_GROUPE' ? 'privateAudience' : 'groupAudience'
  return 'generalAudience'
}
