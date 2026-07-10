export function safeText(value, fallback) {
  const text = String(value ?? '').trim();
  if (!text || ['UNKNOWN', 'UNDEFINED', 'NULL'].includes(text.toUpperCase())) {
    return fallback;
  }
  return text;
}

export function formatEuros(value) {
  const amount = Number(value || 0);
  return `${Number.isFinite(amount) ? amount.toLocaleString('fr-BE') : 0} €`;
}

export function buildStatusChartData(items, getKey, getLabel) {
  const counts = new Map();
  items.forEach(item => {
    const key = getKey(item);
    if (!key) return;
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  return Array.from(counts.entries()).map(([key, value]) => ({
    key,
    label: getLabel(key),
    value,
  }));
}

export function getSupportedProjectStatus(soutien) {
  return soutien.projetStatut
    || soutien.statutProjet
    || soutien.projectStatus
    || soutien.projet?.statut
    || null;
}

export function buildPartnerImpact({ statistiques, mesSoutiens }) {
  const totalMontant = statistiques?.totalMontant
    ?? mesSoutiens.reduce((sum, soutien) => sum + Number(soutien.montant || 0), 0);
  const soutiensValides = statistiques?.soutiensValides
    ?? mesSoutiens.filter(soutien => soutien.statutPaiement === 'PAYE').length;
  const projetsSoutenus = statistiques?.projetsSoutenus
    ?? new Set(mesSoutiens.map(soutien => soutien.projetId).filter(Boolean)).size;
  const activitesSoutenues = statistiques?.activitesSoutenues
    ?? new Set(mesSoutiens.map(soutien => soutien.activiteId).filter(Boolean)).size;

  return {
    totalSoutiens: statistiques?.totalSoutiens ?? mesSoutiens.length,
    totalMontant,
    soutiensValides,
    projetsSoutenus,
    activitesSoutenues,
    recentSupports: [...mesSoutiens]
      .sort((a, b) => new Date(b.dateCreation || 0) - new Date(a.dateCreation || 0))
      .slice(0, 4),
  };
}

export function emptyOpportunityForm() {
  return {
    titre: '',
    descriptionCourte: '',
    contenu: '',
    categorieOpportunite: 'EMPLOI',
    lienExterne: '',
    dateLimite: '',
    nombrePlaces: '',
    modeCandidature: 'LIEN_EXTERNE',
    publicCible: 'TOUS',
    miseEnAvant: false,
  };
}

export function emptyPartnerProfile() {
  return {
    nomOrganisation: '',
    typePartenaire: 'AUTRE',
    logoUrl: '',
    personneContact: '',
    emailContact: '',
    telephone: '',
    siteWeb: '',
    description: '',
  };
}

export function profileFromResponse(profile) {
  return {
    nomOrganisation: profile?.nomOrganisation || '',
    typePartenaire: profile?.typePartenaire || 'AUTRE',
    logoUrl: profile?.logoUrl || '',
    personneContact: profile?.personneContact || '',
    emailContact: profile?.emailContact || '',
    telephone: profile?.telephone || '',
    siteWeb: profile?.siteWeb || '',
    description: profile?.description || '',
  };
}

export function opportunityStatusStyle(status) {
  const styles = {
    EN_ATTENTE: 'bg-amber-100 text-amber-800',
    PUBLIEE: 'bg-green-100 text-green-700',
    REFUSEE: 'bg-red-100 text-red-700',
  };
  return styles[status] || 'bg-slate-100 text-slate-700';
}

export function normalizeExternalUrl(value) {
  if (!value) return '#';
  const trimmed = String(value).trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function applySettled(result, onSuccess, onError) {
  if (result.status === 'fulfilled') {
    onSuccess(result.value.data);
  } else {
    onError(result.reason);
  }
}
