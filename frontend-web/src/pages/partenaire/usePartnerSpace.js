import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { supportStatusLabel } from '../../utils/supportStatus';
import { userFriendlyError } from '../../utils/userFriendlyError';
import { PARTNER_TAB_ALIASES, PARTNER_TABS } from './partnerSpace.constants';
import {
  applySettled,
  buildPartnerImpact,
  buildStatusChartData,
  emptyOpportunityForm,
  emptyPartnerProfile,
  getSupportedProjectStatus,
  profileFromResponse,
} from './partnerSpace.helpers';
import {
  cancelPartnerSupport,
  createActivitySupport,
  createPartnerOpportunity,
  createProjectSupport,
  getOpenPartnerActivities,
  getOpenPartnerProjects,
  getPartnerLinkedGroups,
  getPartnerLocalImpact,
  getPartnerOpportunities,
  getPartnerProfile,
  getPartnerReferents,
  getPartnerStats,
  getPartnerSupports,
  savePartnerProfile,
  updatePartnerSupport,
} from './partnerSpace.api';

export default function usePartnerSpace({ t, searchParams }) {
  const [mesSoutiens, setMesSoutiens] = useState([]);
  const [mesOpportunites, setMesOpportunites] = useState([]);
  const [projetsOuverts, setProjetsOuverts] = useState([]);
  const [activitesOuvertes, setActivitesOuvertes] = useState([]);
  const [profilInstitutionnel, setProfilInstitutionnel] = useState(null);
  const [statistiques, setStatistiques] = useState(null);
  const [mesReferents, setMesReferents] = useState([]);
  const [mesGroupesLies, setMesGroupesLies] = useState([]);
  const [impactLocal, setImpactLocal] = useState(null);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState(emptyPartnerProfile());
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [sectionErrors, setSectionErrors] = useState({});
  const requestedTab = searchParams.get('tab');
  const normalizedTab = PARTNER_TAB_ALIASES[requestedTab] || requestedTab;
  const onglet = PARTNER_TABS.has(normalizedTab) ? normalizedTab : 'dashboard';
  const focusedSupportId = searchParams.get('soutien');

  const [showSoutienForm, setShowSoutienForm] = useState(false);
  const [soutienForm, setSoutienForm] = useState({
    montant: '',
    message: '',
    projetId: null,
    activiteId: null,
    type: 'projet',
  });
  const [submittingSupport, setSubmittingSupport] = useState(false);
  const [editingSupport, setEditingSupport] = useState(null);
  const [editSupportForm, setEditSupportForm] = useState({ montant: '', message: '' });
  const [supportActionLoading, setSupportActionLoading] = useState(null);
  const [showOpportunityForm, setShowOpportunityForm] = useState(false);
  const [savingOpportunity, setSavingOpportunity] = useState(false);
  const [opportunityForm, setOpportunityForm] = useState(emptyOpportunityForm());

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError('');
    setSectionErrors({});
    try {
      const results = await Promise.allSettled([
        getPartnerSupports(),
        getOpenPartnerProjects(),
        getOpenPartnerActivities(),
        getPartnerProfile(),
        getPartnerStats(),
        getPartnerOpportunities(),
        getPartnerReferents(),
        getPartnerLinkedGroups(),
        getPartnerLocalImpact(),
      ]);
      const [
        soutiensRes,
        projetsRes,
        activitesRes,
        profilRes,
        statsRes,
        opportunitesRes,
        referentsRes,
        groupesLiesRes,
        impactLocalRes,
      ] = results;
      const errors = {};

      applySettled(soutiensRes, data => setMesSoutiens(data || []), () => { errors.soutiens = t('partnerSpace.sectionLoadError'); });
      applySettled(projetsRes, data => setProjetsOuverts(data || []), () => { errors.projets = t('partnerSpace.sectionLoadError'); });
      applySettled(activitesRes, data => setActivitesOuvertes(data || []), () => { errors.activites = t('partnerSpace.sectionLoadError'); });
      applySettled(profilRes, data => {
        setProfilInstitutionnel(data);
        setProfileForm(profileFromResponse(data));
      }, () => { errors.profil = t('partnerSpace.profileLoadError'); });
      applySettled(statsRes, data => setStatistiques(data || null), () => { errors.stats = t('partnerSpace.sectionLoadError'); });
      applySettled(opportunitesRes, data => setMesOpportunites(data || []), () => { errors.opportunites = t('partnerSpace.sectionLoadError'); });
      applySettled(referentsRes, data => setMesReferents(data || []), () => { errors.referents = t('partnerSpace.localImpact.sectionLoadError'); });
      applySettled(groupesLiesRes, data => setMesGroupesLies(data || []), () => { errors.groupesLies = t('partnerSpace.localImpact.sectionLoadError'); });
      applySettled(impactLocalRes, data => setImpactLocal(data || null), () => { errors.impactLocal = t('partnerSpace.localImpact.sectionLoadError'); });

      setSectionErrors(errors);
      if (results.every(result => result.status === 'rejected')) {
        setError(t('partnerSpace.loadError'));
      }
    } catch {
      setError(t('partnerSpace.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleSaveProfile = useCallback(async (event) => {
    event.preventDefault();
    setSavingProfile(true);
    setMessage('');
    setError('');
    try {
      const response = await savePartnerProfile(profileForm);
      setProfilInstitutionnel(response.data);
      setProfileForm(profileFromResponse(response.data));
      setShowProfileForm(false);
      const feedback = t('partnerInstitution.profileSaved');
      setMessage(feedback);
      toast.success(feedback);
    } catch (err) {
      const feedback = userFriendlyError(err, t('partnerInstitution.profileError'));
      setError(feedback);
      toast.error(feedback);
    } finally {
      setSavingProfile(false);
    }
  }, [profileForm, t]);

  const handleSoumettreSoutien = useCallback(async (e) => {
    e.preventDefault();
    if (submittingSupport) return;
    setSubmittingSupport(true);
    setMessage('');
    setError('');
    try {
      const payload = {
        montant: parseFloat(soutienForm.montant),
        message: soutienForm.message,
      };
      if (soutienForm.type === 'projet') {
        payload.projetId = soutienForm.projetId;
        await createProjectSupport(payload);
      } else {
        payload.activiteId = soutienForm.activiteId;
        await createActivitySupport(payload);
      }
      const feedback = t('partnerSpace.supportSubmitted');
      setMessage(feedback);
      toast.success(feedback);
      setShowSoutienForm(false);
      setSoutienForm({ montant: '', message: '', projetId: null, activiteId: null, type: 'projet' });
      fetchAll();
      setTimeout(() => setMessage(''), 4000);
    } catch (err) {
      const feedback = userFriendlyError(err, t('partnerSpace.actionError'));
      setError(feedback);
      toast.error(feedback);
    } finally {
      setSubmittingSupport(false);
    }
  }, [fetchAll, soutienForm, submittingSupport, t]);

  const openEditSupport = useCallback((soutien) => {
    setMessage('');
    setError('');
    setEditingSupport(soutien);
    setEditSupportForm({
      montant: soutien.montant ?? '',
      message: soutien.message || '',
    });
  }, []);

  const closeEditSupport = useCallback(() => {
    setEditingSupport(null);
    setEditSupportForm({ montant: '', message: '' });
  }, []);

  const handleModifierSoutien = useCallback(async (event) => {
    event.preventDefault();
    if (!editingSupport) return;
    setSupportActionLoading(`edit-${editingSupport.id}`);
    setMessage('');
    setError('');
    try {
      await updatePartnerSupport(editingSupport.id, {
        montant: parseFloat(editSupportForm.montant),
        message: editSupportForm.message,
      });
      const feedback = t('partnerSpace.supportUpdated', { defaultValue: 'Proposition de soutien mise à jour.' });
      setMessage(feedback);
      toast.success(feedback);
      closeEditSupport();
      await fetchAll();
    } catch (err) {
      const feedback = supportMutationError(err, t);
      setError(feedback);
      toast.error(feedback);
    } finally {
      setSupportActionLoading(null);
    }
  }, [closeEditSupport, editSupportForm, editingSupport, fetchAll, t]);

  const handleAnnulerSoutien = useCallback(async (soutien) => {
    const confirmed = window.confirm(t('partnerSpace.confirmCancelSupport', {
      defaultValue: 'Annuler cette proposition de soutien ? Elle restera visible dans votre historique.',
    }));
    if (!confirmed) return;

    setSupportActionLoading(`cancel-${soutien.id}`);
    setMessage('');
    setError('');
    try {
      await cancelPartnerSupport(soutien.id);
      const feedback = t('partnerSpace.supportCanceled', { defaultValue: 'Proposition de soutien annulée.' });
      setMessage(feedback);
      toast.success(feedback);
      await fetchAll();
    } catch (err) {
      const feedback = supportMutationError(err, t);
      setError(feedback);
      toast.error(feedback);
    } finally {
      setSupportActionLoading(null);
    }
  }, [fetchAll, t]);

  const handleCreateOpportunity = useCallback(async (event) => {
    event.preventDefault();
    setSavingOpportunity(true);
    setMessage('');
    setError('');
    try {
      const payload = {
        titre: opportunityForm.titre,
        descriptionCourte: opportunityForm.descriptionCourte,
        contenu: opportunityForm.contenu,
        categorieOpportunite: opportunityForm.categorieOpportunite,
        lienExterne: opportunityForm.lienExterne,
        modeCandidature: opportunityForm.modeCandidature,
        publicCible: opportunityForm.publicCible,
        miseEnAvant: opportunityForm.miseEnAvant,
      };
      if (opportunityForm.nombrePlaces) {
        payload.nombrePlaces = Number(opportunityForm.nombrePlaces);
      }
      if (opportunityForm.dateLimite) {
        payload.dateLimite = opportunityForm.dateLimite;
        payload.dateExpiration = opportunityForm.dateLimite;
      }
      await createPartnerOpportunity(payload);
      const feedback = t('partnerSpace.opportunitySubmitted', { defaultValue: 'Opportunité envoyée à l’administration pour validation.' });
      setMessage(feedback);
      toast.success(feedback);
      setShowOpportunityForm(false);
      setOpportunityForm(emptyOpportunityForm());
      await fetchAll();
    } catch (err) {
      const feedback = userFriendlyError(err, t('partnerSpace.actionError'));
      setError(feedback);
      toast.error(feedback);
    } finally {
      setSavingOpportunity(false);
    }
  }, [fetchAll, opportunityForm, t]);

  const impact = useMemo(
    () => buildPartnerImpact({ statistiques, mesSoutiens }),
    [mesSoutiens, statistiques]
  );
  const partnerActivityItems = useMemo(
    () => buildPartnerActivityItems({ mesSoutiens, projetsOuverts, activitesOuvertes, t }),
    [activitesOuvertes, mesSoutiens, projetsOuverts, t]
  );
  const partnerChartData = useMemo(
    () => buildPartnerChartData({ mesSoutiens, activitesOuvertes, t }),
    [activitesOuvertes, mesSoutiens, t]
  );
  const localImpact = useMemo(
    () => buildPartnerLocalImpact({
      impactLocal,
      mesReferents,
      mesGroupesLies,
      mesSoutiens,
      mesOpportunites,
      profilInstitutionnel,
      t,
    }),
    [impactLocal, mesGroupesLies, mesOpportunites, mesReferents, mesSoutiens, profilInstitutionnel, t]
  );

  const displayedPartnerSupports = useMemo(() => {
    if (!focusedSupportId) return mesSoutiens;
    return [...mesSoutiens].sort((a, b) => {
      if (String(a.id) === String(focusedSupportId)) return -1;
      if (String(b.id) === String(focusedSupportId)) return 1;
      return new Date(b.dateCreation || 0) - new Date(a.dateCreation || 0);
    });
  }, [focusedSupportId, mesSoutiens]);

  return {
    mesSoutiens,
    mesOpportunites,
    projetsOuverts,
    activitesOuvertes,
    profilInstitutionnel,
    mesReferents,
    mesGroupesLies,
    showProfileForm,
    setShowProfileForm,
    savingProfile,
    profileForm,
    setProfileForm,
    loading,
    message,
    error,
    sectionErrors,
    onglet,
    focusedSupportId,
    showSoutienForm,
    setShowSoutienForm,
    soutienForm,
    setSoutienForm,
    submittingSupport,
    editingSupport,
    editSupportForm,
    setEditSupportForm,
    supportActionLoading,
    showOpportunityForm,
    setShowOpportunityForm,
    savingOpportunity,
    opportunityForm,
    setOpportunityForm,
    handleSaveProfile,
    handleSoumettreSoutien,
    openEditSupport,
    closeEditSupport,
    handleModifierSoutien,
    handleAnnulerSoutien,
    handleCreateOpportunity,
    impact,
    partnerActivityItems,
    partnerChartData,
    localImpact,
    displayedPartnerSupports,
  };
}

function buildPartnerLocalImpact({ impactLocal, mesReferents, mesGroupesLies, mesSoutiens, mesOpportunites, profilInstitutionnel, t }) {
  const referents = Array.isArray(impactLocal?.referents) ? impactLocal.referents : mesReferents;
  const groupes = Array.isArray(impactLocal?.groupes) ? impactLocal.groupes : mesGroupesLies;
  const activeReferents = referents.filter(referent => referent.statut === 'ACTIF' || !referent.statut);
  const activeGroups = groupes.filter(groupe => groupe.statut === 'ACTIF' || !groupe.statut);
  const paidSupports = mesSoutiens.filter(soutien => soutien.statutPaiement === 'PAYE');
  const totalAmount = Number(impactLocal?.totalMontant ?? 0) || mesSoutiens.reduce((sum, soutien) => sum + Number(soutien.montant || 0), 0);
  const lastSupportDate = mesSoutiens
    .map(soutien => soutien.datePaiement || soutien.dateCreation)
    .filter(Boolean)
    .map(date => new Date(date))
    .filter(date => !Number.isNaN(date.getTime()))
    .sort((a, b) => b - a)[0];
  const hasRecentSupport = lastSupportDate
    ? Date.now() - lastSupportDate.getTime() <= 1000 * 60 * 60 * 24 * 180
    : false;

  return {
    kpis: {
      groupesSoutenus: Number(impactLocal?.groupesSoutenus ?? impactLocal?.groupesLies ?? activeGroups.length),
      projetsSoutenus: Number(impactLocal?.projetsSoutenus ?? new Set(mesSoutiens.map(soutien => soutien.projetId).filter(Boolean)).size),
      activitesSoutenues: Number(impactLocal?.activitesSoutenues ?? new Set(mesSoutiens.map(soutien => soutien.activiteId).filter(Boolean)).size),
      opportunitesPubliees: Number(impactLocal?.opportunitesPubliees ?? mesOpportunites.filter(opportunite => opportunite.statutModeration === 'PUBLIEE').length),
      montantsSoutenus: totalAmount,
      referentsAssocies: Number(impactLocal?.referentsAssocies ?? activeReferents.length),
    },
    groupDistribution: activeGroups.map(groupe => ({
      key: String(groupe.groupeId || groupe.id),
      label: groupe.groupeNom || t('partnerSpace.localImpact.unknownGroup'),
      value: 1,
    })),
    linkTypeDistribution: buildStatusChartData(
      activeGroups,
      groupe => groupe.typeLien || 'AUTRE',
      type => t(`partnerSpace.localImpact.linkTypes.${type}`, { defaultValue: type })
    ),
    supportEvolution: buildSupportEvolutionData(paidSupports.length > 0 ? paidSupports : mesSoutiens, t),
    quality: [
      {
        key: 'no-referent',
        label: t('partnerSpace.localImpact.quality.noReferent'),
        description: t('partnerSpace.localImpact.quality.noReferentDesc'),
        value: activeReferents.length === 0 ? 1 : 0,
      },
      {
        key: 'no-group',
        label: t('partnerSpace.localImpact.quality.noGroup'),
        description: t('partnerSpace.localImpact.quality.noGroupDesc'),
        value: activeGroups.length === 0 ? 1 : 0,
      },
      {
        key: 'inactive-profile',
        label: t('partnerSpace.localImpact.quality.inactiveProfile'),
        description: t('partnerSpace.localImpact.quality.inactiveProfileDesc'),
        value: profilInstitutionnel?.actif === false ? 1 : 0,
      },
      {
        key: 'no-recent-support',
        label: t('partnerSpace.localImpact.quality.noRecentSupport'),
        description: t('partnerSpace.localImpact.quality.noRecentSupportDesc'),
        value: mesSoutiens.length > 0 && !hasRecentSupport ? 1 : 0,
      },
    ],
  };
}

function buildSupportEvolutionData(soutiens, t) {
  const monthlyTotals = new Map();
  soutiens.forEach(soutien => {
    const rawDate = soutien.datePaiement || soutien.dateCreation;
    if (!rawDate) return;
    const date = new Date(rawDate);
    if (Number.isNaN(date.getTime())) return;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthlyTotals.set(key, (monthlyTotals.get(key) || 0) + Number(soutien.montant || 0));
  });

  return Array.from(monthlyTotals.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([key, value]) => ({
      key,
      label: key,
      value: Math.round(value),
      name: t('partnerSpace.localImpact.charts.supportEvolution'),
    }));
}

function buildPartnerChartData({ mesSoutiens, activitesOuvertes, t }) {
  return {
    supportsByStatus: buildStatusChartData(
      mesSoutiens,
      soutien => soutien.statutPaiement || 'UNKNOWN',
      status => supportStatusLabel(status, t)
    ),
    supportedProjectsByStatus: buildStatusChartData(
      mesSoutiens.filter(soutien => soutien.projetId || soutien.projetTitre),
      getSupportedProjectStatus,
      status => t(`statuses.${status}`, { defaultValue: status })
    ),
    activitiesByStatus: buildStatusChartData(
      activitesOuvertes,
      activite => activite.statut || 'UNKNOWN',
      status => t(`statuses.${status}`, { defaultValue: status })
    ),
  };
}

function buildPartnerActivityItems({ mesSoutiens, projetsOuverts, activitesOuvertes, t }) {
  const supportItems = mesSoutiens.map(soutien => ({
    key: `soutien-${soutien.id}`,
    icon: 'Wallet',
    title: soutien.projetTitre || soutien.activiteTitre || t('partnerSpace.supportFallback'),
    description: `${soutien.montant} € · ${supportStatusLabel(soutien.statutPaiement, t)}`,
    date: soutien.dateCreation || soutien.datePaiement,
    to: `/partenaire?tab=soutiens&soutien=${soutien.id}`,
  }));

  const projectItems = projetsOuverts.map(projet => ({
    key: `projet-${projet.id}`,
    icon: 'Rocket',
    title: projet.titre,
    description: projet.budgetDemande ? `${t('partnerSpace.budget')}: ${projet.budgetDemande} €` : t('partnerSpace.openProjects'),
    date: projet.dateModification || projet.dateCreation,
    to: '/partenaire?tab=projets-activites',
  }));

  const activityItems = activitesOuvertes.map(activite => ({
    key: `activite-${activite.id}`,
    icon: 'Calendar',
    title: activite.titre,
    description: activite.lieu || t('partnerSpace.openActivities'),
    date: activite.dateModification || activite.dateCreation || activite.dateDebut,
    to: '/partenaire?tab=projets-activites',
  }));

  return [...supportItems, ...projectItems, ...activityItems];
}

function supportMutationError(error, t) {
  if (error?.response?.status === 403) {
    return t('partnerSpace.supportNotEditable', {
      defaultValue: 'Cette proposition ne peut plus être modifiée ou annulée. Elle a peut-être déjà été traitée par l’administration.',
    });
  }
  return userFriendlyError(error, t('partnerSpace.actionError'));
}
