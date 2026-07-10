import api from '../../api/axios';

export function getPartnerSupports() {
  return api.get('/partenaire/mes-soutiens');
}

export function getOpenPartnerProjects() {
  return api.get('/partenaire/projets-ouverts');
}

export function getOpenPartnerActivities() {
  return api.get('/partenaire/activites-ouvertes');
}

export function getPartnerProfile() {
  return api.get('/partenaire/profil');
}

export function getPartnerStats() {
  return api.get('/partenaire/statistiques');
}

export function getPartnerOpportunities() {
  return api.get('/annonces/partenaire/mes-opportunites');
}

export function getPartnerReferents() {
  return api.get('/partenaire/mes-referents');
}

export function getPartnerLinkedGroups() {
  return api.get('/partenaire/mes-groupes-lies');
}

export function getPartnerLocalImpact() {
  return api.get('/partenaire/impact-local');
}

export function savePartnerProfile(profileForm) {
  return api.put('/partenaire/profil', profileForm);
}

export function createProjectSupport(payload) {
  return api.post('/partenaire/soutenir-projet', payload);
}

export function createActivitySupport(payload) {
  return api.post('/partenaire/soutenir-activite', payload);
}

export function updatePartnerSupport(supportId, payload) {
  return api.put(`/partenaire/mes-soutiens/${supportId}`, payload);
}

export function cancelPartnerSupport(supportId) {
  return api.patch(`/partenaire/mes-soutiens/${supportId}/annuler`);
}

export function createPartnerOpportunity(payload) {
  return api.post('/annonces/opportunites', payload);
}
