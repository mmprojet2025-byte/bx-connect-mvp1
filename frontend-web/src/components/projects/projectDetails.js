export function projectDetailsForm(project = {}) {
  return {
    capacite: project.capacite ?? '',
    dateExecution: project.dateExecution || '',
    dateLimiteParticipation: project.dateLimiteParticipation || '',
    imageUrl: project.imageUrl || '',
  }
}

export function projectDetailsPayload(form) {
  return {
    capacite: form.capacite === '' || form.capacite == null ? null : Number(form.capacite),
    dateExecution: form.dateExecution || null,
    dateLimiteParticipation: form.dateLimiteParticipation || null,
    imageUrl: form.imageUrl || null,
  }
}

export function projectRegistrationClosed(project, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'Europe/Brussels', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now)
  const value = type => parts.find(part => part.type === type).value
  const today = `${value('year')}-${value('month')}-${value('day')}`
  return Boolean((project.dateLimiteParticipation && today > project.dateLimiteParticipation)
    || (project.dateExecution && today > project.dateExecution))
}

export function projectFull(project) {
  return project.capacite != null && (project.nombreParticipants || 0) >= project.capacite
}
