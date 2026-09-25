export function readProfileResponse(data = {}) {
  return {
    profile: data,
    form: {
      prenom: data.prenom || '',
      nom: data.nom || '',
      languePreference: data.languePreference || 'FR',
    },
    photoProfilUrl: data.photoProfilUrl || null,
  }
}

export function buildProfileUpdatePayload(form, photoProfilUrl) {
  return { ...form, photoProfilUrl: photoProfilUrl || null }
}

export function createProfileSaver(apiClient) {
  let inFlight = null

  return function saveProfile(payload) {
    if (inFlight) return inFlight
    inFlight = apiClient.put('/users/me', payload).finally(() => {
      inFlight = null
    })
    return inFlight
  }
}
