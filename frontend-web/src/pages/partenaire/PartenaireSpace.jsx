import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { userFriendlyError } from '../../utils/userFriendlyError';
import AppIcon from '../../components/ui/AppIcons';
import LoadingState from '../../components/ui/LoadingState';
import ErrorState from '../../components/ui/ErrorState';
import EmptyState from '../../components/ui/EmptyState';
import ProjectVisibilityBadge from '../../components/ProjectVisibilityBadge';
import { SUPPORT_STATUS_STYLES, supportStatusLabel } from '../../utils/supportStatus';
import PartnerLogo from '../../components/PartnerLogo';
import { CollaborativeDashboardLayout } from '../../components/dashboard/CollaborativeDashboard';
import ActivityFeed from '../../components/dashboard/ActivityFeed';
import CompactKpiRow from '../../components/dashboard/CompactKpiRow';

const PARTNER_TABS = new Set(['dashboard', 'soutiens', 'opportunites', 'impact', 'profil', 'projets-activites']);
const PARTNER_TAB_ALIASES = {
  projets: 'projets-activites',
  activites: 'projets-activites',
};
const OPPORTUNITY_CATEGORIES = ['EMPLOI', 'STAGE', 'FORMATION', 'EVENEMENT', 'APPEL_PROJET', 'PUBLICITE'];
const OPPORTUNITY_APPLICATION_MODES = ['LIEN_EXTERNE', 'CONTACT_PARTENAIRE', 'INFORMATION'];
const OPPORTUNITY_TARGETS = ['TOUS', 'MEMBRES', 'REFERENTS', 'GROUPES', 'PUBLIC'];

export default function PartenaireSpace() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

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

  // Formulaire soutien
  const [showSoutienForm, setShowSoutienForm] = useState(false);
  const [soutienForm, setSoutienForm] = useState({
    montant: '', message: '', projetId: null, activiteId: null, type: 'projet'
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
        api.get('/partenaire/mes-soutiens'),
        api.get('/partenaire/projets-ouverts'),
        api.get('/partenaire/activites-ouvertes'),
        api.get('/partenaire/profil'),
        api.get('/partenaire/statistiques'),
        api.get('/annonces/partenaire/mes-opportunites'),
        api.get('/partenaire/mes-referents'),
        api.get('/partenaire/mes-groupes-lies'),
        api.get('/partenaire/impact-local'),
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

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    setSavingProfile(true);
    setMessage('');
    setError('');
    try {
      const response = await api.put('/partenaire/profil', profileForm);
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
  };

  const handleSoumettreSoutien = async (e) => {
    e.preventDefault();
    if (submittingSupport) return;
    setSubmittingSupport(true);
    setMessage(''); setError('');
    try {
      const payload = {
        montant: parseFloat(soutienForm.montant),
        message: soutienForm.message,
      };
      if (soutienForm.type === 'projet') {
        payload.projetId = soutienForm.projetId;
        await api.post('/partenaire/soutenir-projet', payload);
      } else {
        payload.activiteId = soutienForm.activiteId;
        await api.post('/partenaire/soutenir-activite', payload);
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
  };

  const openEditSupport = (soutien) => {
    setMessage('');
    setError('');
    setEditingSupport(soutien);
    setEditSupportForm({
      montant: soutien.montant ?? '',
      message: soutien.message || '',
    });
  };

  const closeEditSupport = () => {
    setEditingSupport(null);
    setEditSupportForm({ montant: '', message: '' });
  };

  const handleModifierSoutien = async (event) => {
    event.preventDefault();
    if (!editingSupport) return;
    setSupportActionLoading(`edit-${editingSupport.id}`);
    setMessage('');
    setError('');
    try {
      await api.put(`/partenaire/mes-soutiens/${editingSupport.id}`, {
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
  };

  const handleAnnulerSoutien = async (soutien) => {
    const confirmed = window.confirm(t('partnerSpace.confirmCancelSupport', {
      defaultValue: 'Annuler cette proposition de soutien ? Elle restera visible dans votre historique.',
    }));
    if (!confirmed) return;

    setSupportActionLoading(`cancel-${soutien.id}`);
    setMessage('');
    setError('');
    try {
      await api.patch(`/partenaire/mes-soutiens/${soutien.id}/annuler`);
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
  };

  const handleCreateOpportunity = async (event) => {
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
      await api.post('/annonces/opportunites', payload);
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
  };

  const ONGLETS = [
    { id: 'dashboard',  label: t('partnerSpace.tabs.dashboard'), icon: 'BarChart' },
    { id: 'soutiens',   label: t('partnerSpace.tabs.supports'), icon: 'Wallet' },
    { id: 'opportunites', label: t('partnerSpace.tabs.opportunities', { defaultValue: 'Opportunités' }), icon: 'Megaphone' },
    { id: 'impact', label: t('partnerSpace.tabs.localImpact', { defaultValue: 'Impact local' }), icon: 'Activity' },
    { id: 'profil', label: t('partnerSpace.tabs.profile', { defaultValue: 'Profil partenaire' }), icon: 'User' },
    { id: 'projets-activites', label: t('partnerSpace.tabs.projectsActivities', { defaultValue: 'Projets / Activités' }), icon: 'Folder' },
  ];

  const setOnglet = (tab) => {
    setSearchParams(tab === 'dashboard' ? {} : { tab });
  };

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

  if (loading) return (
    <CollaborativeDashboardLayout
      emoji="🤝"
      title={t('partnerSpace.title')}
      subtitle={t('partnerSpace.loading')}
    >
      <LoadingState label={t('partnerSpace.loading')} />
    </CollaborativeDashboardLayout>
  );

  return (
    <CollaborativeDashboardLayout
      emoji="Handshake"
      title={profilInstitutionnel?.nomOrganisation || t('partnerSpace.title')}
      subtitle={t('partnerSpace.dashboardSubtitle', { defaultValue: `${projetsOuverts.length} projet(s) ouvert(s) · ${mesSoutiens.length} soutien(s) suivi(s)` })}
    >
        {/* En-tête */}
        <div className="mb-6 flex flex-col gap-4 rounded-xl border border-orange-100 bg-white p-5 shadow-lg shadow-orange-950/5 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <PartnerLogo
              logoUrl={profilInstitutionnel?.logoUrl}
              name={profilInstitutionnel?.nomOrganisation}
            />
            <div className="min-w-0">
            <h1 className="flex items-center gap-3 text-xl font-black text-slate-950">
              <AppIcon name="Handshake" className="h-6 w-6 text-orange-600" />
              {profilInstitutionnel?.nomOrganisation || t('partnerSpace.title')}
            </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700">
                  {t(`partnerInstitution.types.${profilInstitutionnel?.typePartenaire || 'AUTRE'}`)}
                </span>
                <span className="text-sm text-slate-500">
                  {profilInstitutionnel?.personneContact || `${user?.prenom || ''} ${user?.nom || ''}`}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowProfileForm(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              <AppIcon name="Edit" className="h-4 w-4" />
              {t('partnerInstitution.editProfile')}
            </button>
            <button
              onClick={() => setShowSoutienForm(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-orange-500"
            >
              <AppIcon name="PlusCircle" className="h-4 w-4" />
              {t('partnerSpace.financialSupport')}
            </button>
          </div>
        </div>

        {sectionErrors.profil && <SectionLoadError message={sectionErrors.profil} />}
        {sectionErrors.stats && <SectionLoadError message={sectionErrors.stats} />}

        {/* Messages */}
        {message && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4 text-sm">{message}</div>}
        {error   && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">{error}</div>}
        {error && mesSoutiens.length === 0 && projetsOuverts.length === 0 && activitesOuvertes.length === 0 && (
          <div className="mb-6">
            <ErrorState
              title={t('partnerSpace.loadError')}
              description={error}
            />
          </div>
        )}

        {/* Onglets */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {ONGLETS.map(o => (
            <button
              key={o.id}
              onClick={() => setOnglet(o.id)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${
                onglet === o.id
                  ? 'bg-orange-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-orange-50 border border-gray-200'
              }`}
            >
              <AppIcon name={o.icon} className="h-4 w-4" />
              {o.label}
            </button>
          ))}
        </div>

        {/* ── Dashboard ── */}
        {onglet === 'dashboard' && (
          <div>
            <PartnerDashboardFocus
              profil={profilInstitutionnel}
              mesSoutiens={mesSoutiens}
              referents={mesReferents}
              groupes={mesGroupesLies}
              opportunites={mesOpportunites}
              impact={localImpact}
              onProfile={() => setOnglet('profil')}
              onSupports={() => setOnglet('soutiens')}
              onOpportunities={() => setOnglet('opportunites')}
              onSupport={() => setShowSoutienForm(true)}
              onCreateOpportunity={() => {
                setOnglet('opportunites');
                setShowOpportunityForm(true);
              }}
              onImpact={() => setOnglet('impact')}
              t={t}
            />

            {partnerActivityItems.length > 0 && (
            <div>
              {sectionErrors.soutiens && <SectionLoadError message={sectionErrors.soutiens} />}
              <ActivityFeed
                title={t('activityFeed.title', { defaultValue: 'Mon fil d’activité' })}
                subtitle={t('activityFeed.partnerSubtitle', { defaultValue: 'Soutiens, projets ouverts et activités disponibles.' })}
                emptyLabel={t('partnerSpace.noSupports')}
                items={partnerActivityItems}
                language={i18n.language}
                accent="orange"
                limit={5}
              />
            </div>
            )}
          </div>
        )}

        {/* ── Mes soutiens ── */}
        {onglet === 'soutiens' && (
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-blue-900 mb-4">
              <AppIcon name="Wallet" className="h-5 w-5 text-orange-600" />
              {t('partnerSpace.mySupports')}
            </h2>
            <PartnerActions
              mesSoutiens={mesSoutiens}
              onSupport={() => setShowSoutienForm(true)}
              t={t}
            />
            {impact.totalSoutiens > 0 && <PartnerImpactSummary impact={impact} t={t} />}
            <PartnerCharts data={partnerChartData} t={t} />
            {sectionErrors.soutiens && <SectionLoadError message={sectionErrors.soutiens} />}
            {mesSoutiens.length === 0 ? (
              <div className="text-center py-12 text-gray-400 bg-white rounded-lg shadow">
                <AppIcon name="Wallet" className="mx-auto mb-3 h-10 w-10 text-orange-300" />
                <p>{t('partnerSpace.noDeclarations')}</p>
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {displayedPartnerSupports.map(soutien => (
                  <PartnerSupportCard
                    key={soutien.id}
                    soutien={soutien}
                    language={i18n.language}
                    focused={String(soutien.id) === String(focusedSupportId)}
                    processingKey={supportActionLoading}
                    onEdit={() => openEditSupport(soutien)}
                    onCancel={() => handleAnnulerSoutien(soutien)}
                    t={t}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Opportunités ── */}
        {onglet === 'opportunites' && (
          <div>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-bold text-blue-900">
                  <AppIcon name="Megaphone" className="h-5 w-5 text-orange-600" />
                  {t('partnerSpace.opportunities', { defaultValue: 'Mes opportunités' })}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {t('partnerSpace.opportunitiesHint')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowOpportunityForm(current => !current)}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-orange-500"
              >
                <AppIcon name={showOpportunityForm ? 'XCircle' : 'PlusCircle'} className="h-4 w-4" />
                {showOpportunityForm
                  ? t('common.cancel')
                  : t('partnerSpace.newOpportunity')}
              </button>
            </div>

            {sectionErrors.opportunites && <SectionLoadError message={sectionErrors.opportunites} />}

            {showOpportunityForm && (
              <form onSubmit={handleCreateOpportunity} className="mb-5 rounded-lg border border-orange-100 bg-white p-5 shadow-sm">
                <div className="grid gap-4 md:grid-cols-2">
                  <ProfileInput
                    label={t('partnerSpace.opportunityTitle', { defaultValue: 'Titre' })}
                    value={opportunityForm.titre}
                    onChange={value => setOpportunityForm({ ...opportunityForm, titre: value })}
                    required
                  />
                  <label className="block">
                    <span className="mb-1 block text-sm font-semibold text-slate-700">
                      {t('partnerSpace.opportunityCategory', { defaultValue: 'Catégorie' })}
                    </span>
                    <select
                      value={opportunityForm.categorieOpportunite}
                      onChange={event => setOpportunityForm({ ...opportunityForm, categorieOpportunite: event.target.value })}
                      className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    >
                      {OPPORTUNITY_CATEGORIES.map(category => (
                        <option key={category} value={category}>{opportunityCategoryLabel(category, t)}</option>
                      ))}
                    </select>
                  </label>
                  <ProfileInput
                    label={t('partnerSpace.externalLink', { defaultValue: 'Lien externe' })}
                    value={opportunityForm.lienExterne}
                    onChange={value => setOpportunityForm({ ...opportunityForm, lienExterne: value })}
                    type="url"
                  />
                  <label className="block">
                    <span className="mb-1 block text-sm font-semibold text-slate-700">
                      {t('opportunityFields.deadline', { defaultValue: 'Date limite' })}
                    </span>
                    <input
                      type="datetime-local"
                      value={opportunityForm.dateLimite}
                      onChange={event => setOpportunityForm({ ...opportunityForm, dateLimite: event.target.value })}
                      className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    />
                  </label>
                  <ProfileInput
                    label={t('opportunityFields.places', { defaultValue: 'Nombre de places' })}
                    value={opportunityForm.nombrePlaces}
                    onChange={value => setOpportunityForm({ ...opportunityForm, nombrePlaces: value })}
                    type="number"
                    min="1"
                  />
                  <label className="block">
                    <span className="mb-1 block text-sm font-semibold text-slate-700">
                      {t('opportunityFields.applicationMode', { defaultValue: 'Mode de candidature' })}
                    </span>
                    <select
                      value={opportunityForm.modeCandidature}
                      onChange={event => setOpportunityForm({ ...opportunityForm, modeCandidature: event.target.value })}
                      className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    >
                      {OPPORTUNITY_APPLICATION_MODES.map(mode => (
                        <option key={mode} value={mode}>{opportunityModeLabel(mode, t)}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-semibold text-slate-700">
                      {t('opportunityFields.publicTarget', { defaultValue: 'Public cible' })}
                    </span>
                    <select
                      value={opportunityForm.publicCible}
                      onChange={event => setOpportunityForm({ ...opportunityForm, publicCible: event.target.value })}
                      className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    >
                      {OPPORTUNITY_TARGETS.map(target => (
                        <option key={target} value={target}>{opportunityTargetLabel(target, t)}</option>
                      ))}
                    </select>
                  </label>
                  <label className="flex items-center gap-2 rounded-xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-900">
                    <input
                      type="checkbox"
                      checked={opportunityForm.miseEnAvant}
                      onChange={event => setOpportunityForm({ ...opportunityForm, miseEnAvant: event.target.checked })}
                    />
                    {t('opportunityFields.featured', { defaultValue: 'Demander une mise en avant' })}
                  </label>
                  <label className="block md:col-span-2">
                    <span className="mb-1 block text-sm font-semibold text-slate-700">
                      {t('partnerSpace.shortDescription', { defaultValue: 'Description courte' })}
                    </span>
                    <input
                      maxLength={300}
                      value={opportunityForm.descriptionCourte}
                      onChange={event => setOpportunityForm({ ...opportunityForm, descriptionCourte: event.target.value })}
                      className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    />
                  </label>
                  <label className="block md:col-span-2">
                    <span className="mb-1 block text-sm font-semibold text-slate-700">
                      {t('partnerSpace.opportunityContent', { defaultValue: 'Contenu' })} *
                    </span>
                    <textarea
                      required
                      rows={5}
                      value={opportunityForm.contenu}
                      onChange={event => setOpportunityForm({ ...opportunityForm, contenu: event.target.value })}
                      className="w-full resize-none rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    />
                  </label>
                </div>
                <div className="mt-5 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowOpportunityForm(false)}
                    className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-700"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={savingOpportunity}
                    className="rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-orange-500 disabled:opacity-50"
                  >
                    {savingOpportunity ? t('common.saving') : t('partnerSpace.submitForReview')}
                  </button>
                </div>
              </form>
            )}

            {mesOpportunites.length === 0 ? (
              <div className="text-center py-12 text-gray-400 bg-white rounded-lg shadow">
                <AppIcon name="Megaphone" className="mx-auto mb-3 h-10 w-10 text-orange-300" />
                <p>{t('partnerSpace.noOpportunities', { defaultValue: 'Aucune opportunité publiée pour le moment.' })}</p>
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {mesOpportunites.map(opportunite => (
                  <OpportunityCard key={opportunite.id} opportunite={opportunite} language={i18n.language} t={t} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Impact local ── */}
        {onglet === 'impact' && (
          <PartnerLocalImpactSection
            impact={localImpact}
            referents={mesReferents}
            groupes={mesGroupesLies}
            sectionErrors={sectionErrors}
            language={i18n.language}
            t={t}
          />
        )}

        {/* ── Profil partenaire ── */}
        {onglet === 'profil' && (
          <PartnerProfilePanel
            profil={profilInstitutionnel}
            user={user}
            onEdit={() => setShowProfileForm(true)}
            sectionError={sectionErrors.profil}
            t={t}
          />
        )}

        {/* ── Projets / Activités ── */}
        {onglet === 'projets-activites' && (
          <ProjectsActivitiesPanel
            projets={projetsOuverts}
            activites={activitesOuvertes}
            sectionErrors={sectionErrors}
            soutienForm={soutienForm}
            setSoutienForm={setSoutienForm}
            setShowSoutienForm={setShowSoutienForm}
            language={i18n.language}
            t={t}
          />
        )}

        {/* ── Modal formulaire soutien ── */}
        {showSoutienForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="flex items-center gap-2 text-lg font-bold text-blue-900">
                  <AppIcon name="Wallet" className="h-5 w-5 text-orange-600" />
                  {t('partnerSpace.declareSupport')}
                </h2>
                <button onClick={() => setShowSoutienForm(false)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600" aria-label={t('common.close')}>
                  <AppIcon name="XCircle" className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSoumettreSoutien} className="space-y-4">
                {/* Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('partnerSpace.supportTarget')}</label>
                  <div className="flex gap-3">
                    {['projet', 'activite'].map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setSoutienForm({ ...soutienForm, type })}
                        className={`flex-1 py-2 rounded-xl text-sm font-semibold border-2 transition ${
                          soutienForm.type === type
                            ? 'border-orange-600 bg-orange-50 text-orange-600'
                            : 'border-gray-200 text-gray-500'
                        }`}
                      >
                        <span className="inline-flex items-center justify-center gap-2">
                          <AppIcon name={type === 'projet' ? 'Rocket' : 'Folder'} className="h-4 w-4" />
                          {type === 'projet' ? t('partnerSupport.project') : t('partnerSupport.activity')}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sélection cible */}
                {soutienForm.type === 'projet' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('partnerSupport.project')} *</label>
                    <select
                      required
                      value={soutienForm.projetId || ''}
                      onChange={e => setSoutienForm({ ...soutienForm, projetId: parseInt(e.target.value) })}
                      className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    >
                      <option value="">{t('partnerSpace.selectProject')}</option>
                      {projetsOuverts.map(p => <option key={p.id} value={p.id}>{p.titre}</option>)}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('partnerSupport.activity')} *</label>
                    <select
                      required
                      value={soutienForm.activiteId || ''}
                      onChange={e => setSoutienForm({ ...soutienForm, activiteId: parseInt(e.target.value) })}
                      className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    >
                      <option value="">{t('partnerSpace.selectActivity')}</option>
                      {activitesOuvertes.map(a => <option key={a.id} value={a.id}>{a.titre}</option>)}
                    </select>
                  </div>
                )}

                {/* Montant */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('partnerSpace.amountEuros')} *</label>
                  <input
                    required type="number" min="1" step="0.01"
                    value={soutienForm.montant}
                    onChange={e => setSoutienForm({ ...soutienForm, montant: e.target.value })}
                    placeholder={t('partnerSpace.amountPlaceholder')}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('partnerSpace.optionalMessage')}</label>
                  <textarea
                    value={soutienForm.message}
                    onChange={e => setSoutienForm({ ...soutienForm, message: e.target.value })}
                    rows={3}
                    placeholder={t('partnerSpace.messagePlaceholder')}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={submittingSupport}
                    className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-bold py-2.5 rounded-xl transition disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submittingSupport ? t('common.saving') : t('partnerSpace.submit')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSoutienForm(false)}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl transition"
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {editingSupport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-orange-600">
                    {t('partnerSpace.editSupportEyebrow', { defaultValue: 'Soutien en attente' })}
                  </p>
                  <h2 className="mt-1 text-lg font-bold text-blue-900">
                    {t('partnerSpace.editSupportTitle', { defaultValue: 'Modifier la proposition' })}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {editingSupport.projetTitre || editingSupport.activiteTitre || t('partnerSpace.supportFallback')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeEditSupport}
                  className="rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                  aria-label={t('common.close')}
                >
                  <AppIcon name="XCircle" className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleModifierSoutien} className="space-y-4">
                <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                    {t('partnerSpace.lockedTarget', { defaultValue: 'Cible non modifiable' })}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-700">
                    {editingSupport.projetTitre
                      ? t('partnerSupport.project')
                      : t('partnerSupport.activity')}
                    {' · '}
                    {editingSupport.projetTitre || editingSupport.activiteTitre || t('partnerSpace.supportFallback')}
                  </p>
                </div>

                <label className="block">
                  <span className="mb-1 block text-sm font-semibold text-gray-700">{t('partnerSpace.amountEuros')} *</span>
                  <input
                    required
                    type="number"
                    min="1"
                    step="0.01"
                    value={editSupportForm.montant}
                    onChange={event => setEditSupportForm({ ...editSupportForm, montant: event.target.value })}
                    className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-semibold text-gray-700">{t('partnerSpace.optionalMessage')}</span>
                  <textarea
                    value={editSupportForm.message}
                    onChange={event => setEditSupportForm({ ...editSupportForm, message: event.target.value })}
                    rows={3}
                    className="w-full resize-none rounded-xl border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </label>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={supportActionLoading === `edit-${editingSupport.id}`}
                    className="flex-1 rounded-xl bg-orange-600 py-2.5 text-sm font-bold text-white transition hover:bg-orange-500 disabled:opacity-50"
                  >
                    {supportActionLoading === `edit-${editingSupport.id}`
                      ? t('common.saving')
                      : t('common.save')}
                  </button>
                  <button
                    type="button"
                    onClick={closeEditSupport}
                    className="flex-1 rounded-xl bg-gray-100 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-200"
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showProfileForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <form onSubmit={handleSaveProfile} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-slate-950">{t('partnerInstitution.editTitle')}</h2>
                  <p className="mt-1 text-sm text-slate-500">{t('partnerInstitution.editDescription')}</p>
                </div>
                <button type="button" onClick={() => setShowProfileForm(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
                  <AppIcon name="XCircle" className="h-5 w-5" />
                </button>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <ProfileInput label={t('partnerInstitution.organization')} value={profileForm.nomOrganisation} onChange={value => setProfileForm({ ...profileForm, nomOrganisation: value })} required />
                <label className="block">
                  <span className="mb-1 block text-sm font-semibold text-slate-700">{t('partnerInstitution.type')}</span>
                  <select value={profileForm.typePartenaire} onChange={event => setProfileForm({ ...profileForm, typePartenaire: event.target.value })} className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                    {PARTNER_TYPES.map(type => <option key={type} value={type}>{t(`partnerInstitution.types.${type}`)}</option>)}
                  </select>
                </label>
                <ProfileInput label={t('partnerInstitution.contactPerson')} value={profileForm.personneContact} onChange={value => setProfileForm({ ...profileForm, personneContact: value })} />
                <ProfileInput label={t('partnerInstitution.contactEmail')} value={profileForm.emailContact} onChange={value => setProfileForm({ ...profileForm, emailContact: value })} type="email" />
                <ProfileInput label={t('partnerInstitution.phone')} value={profileForm.telephone} onChange={value => setProfileForm({ ...profileForm, telephone: value })} />
                <ProfileInput label={t('partnerInstitution.website')} value={profileForm.siteWeb} onChange={value => setProfileForm({ ...profileForm, siteWeb: value })} type="url" />
                <div className="md:col-span-2">
                  <ProfileInput label={t('partnerInstitution.logoUrl')} value={profileForm.logoUrl} onChange={value => setProfileForm({ ...profileForm, logoUrl: value })} type="url" />
                </div>
                <label className="block md:col-span-2">
                  <span className="mb-1 block text-sm font-semibold text-slate-700">{t('partnerInstitution.description')}</span>
                  <textarea rows={3} maxLength={500} value={profileForm.description} onChange={event => setProfileForm({ ...profileForm, description: event.target.value })} className="w-full resize-none rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                </label>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setShowProfileForm(false)} className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-700">
                  {t('common.cancel')}
                </button>
                <button type="submit" disabled={savingProfile} className="rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-orange-500 disabled:opacity-50">
                  {savingProfile ? t('common.saving') : t('common.save')}
                </button>
              </div>
            </form>
          </div>
        )}

    </CollaborativeDashboardLayout>
  );
}

function PartnerDashboardFocus({
  profil,
  mesSoutiens,
  referents,
  groupes,
  opportunites,
  impact,
  onProfile,
  onSupports,
  onOpportunities,
  onSupport,
  onCreateOpportunity,
  onImpact,
  t,
}) {
  const profileIncomplete = !profil?.nomOrganisation || !profil?.description || !profil?.siteWeb;
  const pendingOpportunities = opportunites.filter(opportunite => opportunite.statutModeration === 'EN_ATTENTE').length;
  const recentSupports = [...mesSoutiens]
    .sort((a, b) => new Date(b.dateCreation || b.datePaiement || 0) - new Date(a.dateCreation || a.datePaiement || 0))
    .slice(0, 3);
  const cards = [
    profileIncomplete && {
      key: 'profile',
      icon: 'User',
      title: t('partnerSpace.dashboardFocus.profileTitle'),
      description: t('partnerSpace.dashboardFocus.profileDescription'),
      action: t('partnerSpace.dashboardFocus.profileAction'),
      onClick: onProfile,
      tone: 'amber',
    },
    pendingOpportunities > 0 && {
      key: 'opportunities',
      icon: 'Megaphone',
      title: t('partnerSpace.dashboardFocus.opportunitiesTitle', { count: pendingOpportunities }),
      description: t('partnerSpace.dashboardFocus.opportunitiesDescription'),
      action: t('partnerSpace.dashboardFocus.opportunitiesAction'),
      onClick: onOpportunities,
      tone: 'orange',
    },
    {
      key: 'support-action',
      icon: 'Handshake',
      title: t('partnerSpace.dashboardFocus.supportActionTitle'),
      description: t('partnerSpace.dashboardFocus.supportActionDescription'),
      action: t('partnerSpace.dashboardFocus.supportActionButton'),
      onClick: onSupport,
      tone: 'orange',
    },
    {
      key: 'supports',
      icon: 'Wallet',
      title: t('partnerSpace.dashboardFocus.supportsTitle'),
      description: recentSupports.length > 0
        ? t('partnerSpace.dashboardFocus.supportsDescription', { count: recentSupports.length })
        : t('partnerSpace.dashboardFocus.noSupportsDescription'),
      action: t('partnerSpace.dashboardFocus.supportsAction'),
      onClick: onSupports,
      tone: 'slate',
    },
    {
      key: 'publish-opportunity',
      icon: 'Megaphone',
      title: t('partnerSpace.dashboardFocus.publishOpportunityTitle'),
      description: t('partnerSpace.dashboardFocus.publishOpportunityDescription'),
      action: t('partnerSpace.dashboardFocus.publishOpportunityButton'),
      onClick: onCreateOpportunity,
      tone: 'orange',
    },
    {
      key: 'impact',
      icon: 'Activity',
      title: t('partnerSpace.dashboardFocus.impactTitle'),
      description: t('partnerSpace.dashboardFocus.impactDescription', {
        groups: impact.kpis.groupesSoutenus,
        referents: impact.kpis.referentsAssocies,
      }),
      action: t('partnerSpace.dashboardFocus.impactAction'),
      onClick: onImpact,
      tone: 'green',
    },
  ].filter(Boolean);

  return (
    <section className="mb-6 rounded-xl border border-orange-100 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <p className="text-xs font-black uppercase tracking-wide text-orange-600">
          {t('partnerSpace.dashboardFocus.eyebrow')}
        </p>
        <h2 className="text-xl font-black text-slate-950">
          {t('partnerSpace.dashboardFocus.title')}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {t('partnerSpace.dashboardFocus.subtitle')}
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {cards.map(card => (
          <button
            key={card.key}
            type="button"
            onClick={card.onClick}
            className="group flex h-full items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 p-4 text-left transition hover:border-orange-200 hover:bg-orange-50"
          >
            <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${card.tone === 'amber' ? 'bg-amber-100 text-amber-700' : card.tone === 'green' ? 'bg-green-100 text-green-700' : card.tone === 'orange' ? 'bg-orange-100 text-orange-700' : 'bg-white text-slate-600'}`}>
              <AppIcon name={card.icon} className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-black text-slate-950">{card.title}</span>
              <span className="mt-1 block text-sm leading-6 text-slate-500">{card.description}</span>
              <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-black text-orange-700">
                {card.action}
                <AppIcon name="ArrowRight" className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </span>
            </span>
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <MiniRelationSummary
          icon="User"
          title={t('partnerSpace.localImpact.myReferent')}
          count={referents.length}
          empty={t('partnerSpace.localImpact.noReferent')}
        />
        <MiniRelationSummary
          icon="Users"
          title={t('partnerSpace.localImpact.linkedGroups')}
          count={groupes.length}
          empty={t('partnerSpace.localImpact.noGroup')}
        />
      </div>
    </section>
  );
}

function MiniRelationSummary({ icon, title, count, empty }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-white px-4 py-3">
      <span className="inline-flex items-center gap-2 text-sm font-bold text-slate-700">
        <AppIcon name={icon} className="h-4 w-4 text-orange-600" />
        {title}
      </span>
      <span className={`rounded-full px-2.5 py-1 text-xs font-black ${count > 0 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-800'}`}>
        {count > 0 ? count : empty}
      </span>
    </div>
  );
}

function PartnerProfilePanel({ profil, user, onEdit, sectionError, t }) {
  const organization = profil?.nomOrganisation || t('partnerSpace.profileFallbackOrganization');
  const contact = profil?.personneContact || [user?.prenom, user?.nom].filter(Boolean).join(' ') || t('partnerSpace.profileFallbackContact');
  const details = [
    { icon: 'Building', label: t('partnerInstitution.organization'), value: organization },
    { icon: 'Handshake', label: t('partnerInstitution.type'), value: t(`partnerInstitution.types.${profil?.typePartenaire || 'AUTRE'}`) },
    { icon: 'User', label: t('partnerInstitution.contactPerson'), value: contact },
    { icon: 'Mail', label: t('partnerInstitution.contactEmail'), value: profil?.emailContact },
    { icon: 'Phone', label: t('partnerInstitution.phone'), value: profil?.telephone },
    { icon: 'Globe', label: t('partnerInstitution.website'), value: profil?.siteWeb },
  ];

  return (
    <section className="rounded-xl border border-orange-100 bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <PartnerLogo logoUrl={profil?.logoUrl} name={organization} />
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-wide text-orange-600">
              {t('partnerSpace.tabs.profile')}
            </p>
            <h2 className="truncate text-xl font-black text-slate-950">{organization}</h2>
            {profil?.description && <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">{profil.description}</p>}
          </div>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
        >
          <AppIcon name="Edit" className="h-4 w-4" />
          {t('partnerInstitution.editProfile')}
        </button>
      </div>

      {sectionError && <SectionLoadError message={sectionError} />}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {details.map(detail => (
          <div key={detail.label} className="rounded-lg border border-slate-100 bg-slate-50 p-4">
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-400">
              <AppIcon name={detail.icon} className="h-4 w-4 text-orange-500" />
              {detail.label}
            </p>
            <p className="mt-2 break-words text-sm font-bold text-slate-800">
              {detail.value || t('partnerSpace.notDefined')}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ProjectsActivitiesPanel({
  projets,
  activites,
  sectionErrors,
  soutienForm,
  setSoutienForm,
  setShowSoutienForm,
  language,
  t,
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <section className="rounded-xl border border-orange-100 bg-white p-5 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-blue-900">
          <AppIcon name="Rocket" className="h-5 w-5 text-orange-600" />
          {t('partnerSpace.openProjects')}
        </h2>
        {sectionErrors.projets && <SectionLoadError message={sectionErrors.projets} />}
        {projets.length === 0 ? (
          <EmptyState icon="Rocket" title={t('partnerSpace.noOpenProjects')} />
        ) : (
          <div className="grid gap-4">
            {projets.map(p => (
              <div key={p.id} className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                <div className="flex justify-between items-start mb-2 gap-3">
                  <div>
                    <ProjectVisibilityBadge visibility={p.visibilite} className="mb-2" />
                    <h3 className="font-bold text-blue-900">{p.titre}</h3>
                  </div>
                  <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">
                    {t(`statuses.${p.statut}`, { defaultValue: p.statut })}
                  </span>
                </div>
                {p.description && <p className="text-gray-500 text-sm mb-3 line-clamp-2">{p.description}</p>}
                <div className="flex flex-wrap gap-3 text-xs text-gray-400 mb-3">
                  <InlineIconLabel icon="Wallet">{t('partnerSpace.budget')}: {p.budgetDemande ? `${p.budgetDemande} €` : t('partnerSpace.notDefined')}</InlineIconLabel>
                  <InlineIconLabel icon="CheckCircle">{t('partnerSpace.received')}: {p.totalSoutiensRecus || 0} €</InlineIconLabel>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSoutienForm({ ...soutienForm, type: 'projet', projetId: p.id });
                    setShowSoutienForm(true);
                  }}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-orange-600 py-2 text-sm font-semibold text-white transition hover:bg-orange-500"
                >
                  <AppIcon name="Wallet" className="h-4 w-4" />
                  {t('partnerSpace.proposeSupport')}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-orange-100 bg-white p-5 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-blue-900">
          <AppIcon name="Folder" className="h-5 w-5 text-orange-600" />
          {t('partnerSpace.openActivities')}
        </h2>
        {sectionErrors.activites && <SectionLoadError message={sectionErrors.activites} />}
        {activites.length === 0 ? (
          <EmptyState icon="Folder" title={t('partnerSpace.noOpenActivities')} />
        ) : (
          <div className="grid gap-4">
            {activites.map(a => (
              <div key={a.id} className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                <h3 className="font-bold text-blue-900 mb-1">{a.titre}</h3>
                {a.description && <p className="text-gray-500 text-sm mb-2 line-clamp-2">{a.description}</p>}
                <div className="mb-3 flex flex-wrap gap-3 text-xs text-gray-400">
                  {a.lieu && <InlineIconLabel icon="Folder">{a.lieu}</InlineIconLabel>}
                  {a.dateDebut && <InlineIconLabel icon="Calendar">{new Date(a.dateDebut).toLocaleDateString(language)}</InlineIconLabel>}
                  <InlineIconLabel icon="CheckCircle">{t('partnerSpace.receivedSupports')}: {a.totalSoutiensRecus || 0} €</InlineIconLabel>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSoutienForm({ ...soutienForm, type: 'activite', activiteId: a.id });
                    setShowSoutienForm(true);
                  }}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-orange-600 py-2 text-sm font-semibold text-white transition hover:bg-orange-500"
                >
                  <AppIcon name="Wallet" className="h-4 w-4" />
                  {t('partnerSpace.proposeSupport')}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function PartnerLocalImpactSection({ impact, referents, groupes, sectionErrors, language, t }) {
  const mainReferent = referents.find(referent => referent.statut === 'ACTIF') || referents[0];
  const hasReferents = referents.length > 0;
  const hasGroups = groupes.length > 0;

  return (
    <section className="mb-6 rounded-xl border border-orange-100 bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-orange-600">
            {t('partnerSpace.localImpact.eyebrow')}
          </p>
          <h2 className="text-xl font-black text-slate-950">
            {t('partnerSpace.localImpact.title')}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {t('partnerSpace.localImpact.subtitle')}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-black ${hasReferents || hasGroups ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
          {hasReferents || hasGroups
            ? t('partnerSpace.localImpact.connected')
            : t('partnerSpace.localImpact.toComplete')}
        </span>
      </div>

      {(sectionErrors.referents || sectionErrors.groupesLies || sectionErrors.impactLocal) && (
        <div className="mb-4 grid gap-2 md:grid-cols-3">
          {sectionErrors.referents && <SectionLoadError message={sectionErrors.referents} />}
          {sectionErrors.groupesLies && <SectionLoadError message={sectionErrors.groupesLies} />}
          {sectionErrors.impactLocal && <SectionLoadError message={sectionErrors.impactLocal} />}
        </div>
      )}

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <LocalRelationsPanel
          icon="User"
          title={t('partnerSpace.localImpact.myReferent')}
          emptyTitle={t('partnerSpace.localImpact.noReferent')}
          emptyDescription={t('partnerSpace.localImpact.noReferentDesc')}
          isEmpty={!hasReferents}
        >
          {mainReferent ? (
            <ReferentCard referent={mainReferent} primary language={language} t={t} />
          ) : null}
          {referents.filter(referent => referent.id !== mainReferent?.id).length > 0 && (
            <div className="mt-3 grid gap-2">
              {referents.filter(referent => referent.id !== mainReferent?.id).map(referent => (
                <ReferentCard key={referent.id} referent={referent} language={language} t={t} />
              ))}
            </div>
          )}
        </LocalRelationsPanel>

        <LocalRelationsPanel
          icon="Users"
          title={t('partnerSpace.localImpact.linkedGroups')}
          emptyTitle={t('partnerSpace.localImpact.noGroup')}
          emptyDescription={t('partnerSpace.localImpact.noGroupDesc')}
          isEmpty={!hasGroups}
        >
          {groupes.length > 0 ? (
            <div className="grid gap-2">
              {groupes.map(groupe => (
                <LinkedGroupCard key={groupe.id} groupe={groupe} language={language} t={t} />
              ))}
            </div>
          ) : null}
        </LocalRelationsPanel>
      </div>

      <CompactKpiRow
        accent="orange"
        className="mb-4"
        items={[
          { icon: 'Users', label: t('partnerSpace.localImpact.kpis.groups'), value: impact.kpis.groupesSoutenus },
          { icon: 'Rocket', label: t('partnerSpace.localImpact.kpis.projects'), value: impact.kpis.projetsSoutenus },
          { icon: 'Calendar', label: t('partnerSpace.localImpact.kpis.activities'), value: impact.kpis.activitesSoutenues },
          { icon: 'Megaphone', label: t('partnerSpace.localImpact.kpis.opportunities'), value: impact.kpis.opportunitesPubliees },
          { icon: 'Wallet', label: t('partnerSpace.localImpact.kpis.amount'), value: `${impact.kpis.montantsSoutenus} €` },
          { icon: 'User', label: t('partnerSpace.localImpact.kpis.referents'), value: impact.kpis.referentsAssocies },
        ]}
      />

      <PartnerLocalCharts impact={impact} t={t} />

      <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50 p-4">
        <h3 className="text-sm font-black text-slate-950">{t('partnerSpace.localImpact.qualityTitle')}</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {impact.quality.map(item => (
            <LocalQualityItem key={item.key} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}

function LocalRelationsPanel({ icon, title, emptyTitle, emptyDescription, isEmpty, children }) {
  return (
    <article className="rounded-lg border border-slate-100 bg-slate-50 p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-black text-slate-950">
        <AppIcon name={icon} className="h-4 w-4 text-orange-600" />
        {title}
      </h3>
      {!isEmpty ? children : (
        <EmptyState
          icon={icon}
          title={emptyTitle}
          description={emptyDescription}
        />
      )}
    </article>
  );
}

function ReferentCard({ referent, primary = false, language, t }) {
  const fullName = [referent.referentPrenom, referent.referentNom].filter(Boolean).join(' ') || referent.referentEmail || t('partnerSpace.localImpact.unknownReferent');

  return (
    <div className={`rounded-lg border bg-white p-3 ${primary ? 'border-orange-200 ring-2 ring-orange-50' : 'border-slate-100'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-slate-950">{fullName}</p>
          {referent.referentEmail && <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">{referent.referentEmail}</p>}
        </div>
        <RelationStatusBadge status={referent.statut} t={t} />
      </div>
      {referent.dateDebut && (
        <p className="mt-2 text-xs font-semibold text-slate-400">
          {t('partnerSpace.localImpact.startedAt')}: {new Date(referent.dateDebut).toLocaleDateString(language || 'fr-BE')}
        </p>
      )}
      {referent.commentaire && <p className="mt-2 text-sm leading-6 text-slate-600">{referent.commentaire}</p>}
    </div>
  );
}

function LinkedGroupCard({ groupe, language, t }) {
  const referentName = [groupe.referentPrenom, groupe.referentNom].filter(Boolean).join(' ');

  return (
    <div className="rounded-lg border border-slate-100 bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-slate-950">{groupe.groupeNom || t('partnerSpace.localImpact.unknownGroup')}</p>
          <p className="mt-0.5 text-xs font-semibold text-orange-700">
            {t(`partnerSpace.localImpact.linkTypes.${groupe.typeLien || 'AUTRE'}`)}
          </p>
        </div>
        <RelationStatusBadge status={groupe.statut} t={t} />
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-xs font-semibold text-slate-400">
        {groupe.dateDebut && (
          <span>{t('partnerSpace.localImpact.startedAt')}: {new Date(groupe.dateDebut).toLocaleDateString(language || 'fr-BE')}</span>
        )}
        {referentName && <span>{t('partnerSpace.localImpact.referent')}: {referentName}</span>}
      </div>
      {groupe.commentaire && <p className="mt-2 text-sm leading-6 text-slate-600">{groupe.commentaire}</p>}
    </div>
  );
}

function RelationStatusBadge({ status, t }) {
  const active = status === 'ACTIF';
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-black ${active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
      {t(`partnerSpace.localImpact.statuses.${status || 'INACTIF'}`)}
    </span>
  );
}

function PartnerLocalCharts({ impact, t }) {
  const panels = [
    impact.groupDistribution.length > 0 && {
      key: 'groups',
      title: t('partnerSpace.localImpact.charts.groups'),
      kind: 'bar',
      data: impact.groupDistribution,
    },
    impact.linkTypeDistribution.length > 0 && {
      key: 'link-types',
      title: t('partnerSpace.localImpact.charts.linkTypes'),
      kind: 'pie',
      data: impact.linkTypeDistribution,
    },
    impact.supportEvolution.length > 0 && {
      key: 'supports-evolution',
      title: t('partnerSpace.localImpact.charts.supportEvolution'),
      kind: 'bar',
      data: impact.supportEvolution,
    },
  ].filter(Boolean);

  if (panels.length === 0) {
    return (
      <EmptyState
        icon="BarChart"
        title={t('partnerSpace.localImpact.charts.emptyTitle')}
        description={t('partnerSpace.localImpact.charts.emptyDescription')}
      />
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      {panels.map(panel => (
        <ChartPanel key={panel.key} title={panel.title}>
          {panel.kind === 'pie' ? <PartnerPieChart data={panel.data} /> : <PartnerBarChart data={panel.data} />}
        </ChartPanel>
      ))}
    </div>
  );
}

function LocalQualityItem({ item }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-white p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-black text-slate-950">{item.label}</p>
        <span className={`rounded-full px-2.5 py-1 text-xs font-black ${item.value > 0 ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-700'}`}>
          {item.value}
        </span>
      </div>
      <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">{item.description}</p>
    </div>
  );
}

function PartnerCharts({ data, t }) {
  const panels = [
    data.supportsByStatus.length > 0 && {
      key: 'supports-status',
      title: t('partnerSpace.chartsSupportsByStatus'),
      kind: 'pie',
      data: data.supportsByStatus,
    },
    data.supportedProjectsByStatus.length > 0 && {
      key: 'supported-projects-status',
      title: t('partnerSpace.chartsSupportedProjectsByStatus'),
      kind: 'bar',
      data: data.supportedProjectsByStatus,
    },
    data.activitiesByStatus.length > 0 && {
      key: 'activities-status',
      title: t('partnerSpace.chartsActivitiesByStatus'),
      kind: 'bar',
      data: data.activitiesByStatus,
    },
  ].filter(Boolean);

  return (
    <section className="mb-6 rounded-xl border border-orange-100 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <p className="text-xs font-black uppercase tracking-wide text-orange-600">
          {t('partnerSpace.chartsEyebrow')}
        </p>
        <h2 className="text-xl font-black text-slate-950">
          {t('partnerSpace.chartsTitle')}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {t('partnerSpace.chartsSubtitle')}
        </p>
      </div>

      {panels.length === 0 ? (
        <EmptyState
          icon="BarChart"
          title={t('partnerSpace.chartsEmptyTitle')}
          description={t('partnerSpace.chartsEmptyDescription')}
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {panels.map(panel => (
            <ChartPanel key={panel.key} title={panel.title}>
              {panel.kind === 'pie' ? (
                <PartnerPieChart data={panel.data} />
              ) : (
                <PartnerBarChart data={panel.data} />
              )}
            </ChartPanel>
          ))}
        </div>
      )}
    </section>
  );
}

function ChartPanel({ title, children }) {
  return (
    <article className="rounded-lg border border-slate-100 bg-slate-50 p-4">
      <h3 className="mb-3 text-sm font-black text-slate-800">{title}</h3>
      <div className="h-56">{children}</div>
    </article>
  );
}

function PartnerPieChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="label"
          innerRadius={52}
          outerRadius={82}
          paddingAngle={3}
        >
          {data.map((entry, index) => (
            <Cell key={entry.key} fill={CHART_COLORS[index % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value, name) => [value, name]} />
      </PieChart>
    </ResponsiveContainer>
  );
}

function PartnerBarChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, left: -24, bottom: 8 }}>
        <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <Tooltip formatter={value => [value, '']} cursor={{ fill: 'rgba(249, 115, 22, 0.08)' }} />
        <Bar dataKey="value" radius={[8, 8, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={entry.key} fill={CHART_COLORS[index % CHART_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function PartnerActions({ mesSoutiens, onSupport, t }) {
  const pending = mesSoutiens.filter(soutien => soutien.statutPaiement === 'EN_ATTENTE').length;
  const paid = mesSoutiens.filter(soutien => soutien.statutPaiement === 'PAYE').length;
  const rejected = mesSoutiens.filter(soutien => soutien.statutPaiement === 'REMBOURSE').length;

  return (
    <section className="mb-6 rounded-xl border border-orange-100 bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-orange-600">
            {t('partnerSpace.actionsEyebrow', { defaultValue: 'Priorités partenaire' })}
          </p>
          <h2 className="text-xl font-black text-slate-950">
            {t('partnerSpace.myActions', { defaultValue: 'Mes actions' })}
          </h2>
        </div>
        <button
          type="button"
          onClick={onSupport}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-orange-500"
        >
          <AppIcon name="Wallet" className="h-4 w-4" />
          {t('partnerSpace.proposeSupport')}
        </button>
      </div>

      <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
        <p className="text-sm font-black text-slate-950">
          {mesSoutiens.length > 0
            ? t('partnerSpace.supportStatusSummary', { pending, paid, rejected, defaultValue: `${pending} en attente · ${paid} payé(s) · ${rejected} refusé(s)` })
            : t('partnerSpace.noSupports')}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          {t('partnerSpace.actionHint', { defaultValue: 'Choisissez “Projets ouverts” ou “Activités ouvertes” dans les onglets pour cibler votre soutien.' })}
        </p>
      </div>
    </section>
  );
}

function PartnerImpactSummary({ impact, t }) {
  const hasImpact = impact.totalSoutiens > 0;

  return (
    <section className="mb-6 rounded-xl border border-orange-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-orange-600">
            {t('partnerSpace.impactEyebrow', { defaultValue: 'Impact visible' })}
          </p>
          <h2 className="text-xl font-black text-slate-950">
            {t('partnerSpace.impactTitle', { defaultValue: 'À quoi servent vos soutiens' })}
          </h2>
        </div>
        <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-black text-orange-700">
          {impact.totalMontant} €
        </span>
      </div>

      {!hasImpact ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-5">
          <p className="text-sm font-semibold text-slate-600">
            {t('partnerSpace.noImpactYet', { defaultValue: 'Aucun soutien enregistré pour le moment. Les projets ouverts vous permettent de créer votre premier impact.' })}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-4">
          <ImpactMetric icon="Wallet" label={t('partnerSpace.totalSupported', { defaultValue: 'Montant engagé' })} value={`${impact.totalMontant} €`} />
          <ImpactMetric icon="Rocket" label={t('partnerSpace.supportedProjects', { defaultValue: 'Projets soutenus' })} value={impact.projetsSoutenus} />
          <ImpactMetric icon="Calendar" label={t('partnerSpace.supportedActivities', { defaultValue: 'Activités soutenues' })} value={impact.activitesSoutenues} />
          <ImpactMetric icon="CheckCircle" label={t('partnerSpace.validatedSupports', { defaultValue: 'Soutiens validés' })} value={impact.soutiensValides} />
        </div>
      )}

      {impact.recentSupports.length > 0 && (
        <div className="mt-4 rounded-lg bg-slate-50 p-3">
          <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-400">
            {t('partnerSpace.recentSupports', { defaultValue: 'Derniers soutiens' })}
          </p>
          <div className="grid gap-2 md:grid-cols-2">
            {impact.recentSupports.map(soutien => (
              <div key={soutien.id} className="rounded-xl bg-white px-3 py-2">
                <p className="truncate text-sm font-black text-slate-950">
                  {soutien.projetTitre || soutien.activiteTitre || t('partnerSpace.supportFallback')}
                </p>
                <p className="mt-0.5 text-xs font-semibold text-slate-500">
                  {soutien.montant} € · {supportStatusLabel(soutien.statutPaiement, t)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function OpportunityCard({ opportunite, language, t }) {
  return (
    <article className="rounded-lg border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wide text-orange-600">
            {opportunityCategoryLabel(opportunite.categorieOpportunite, t)}
          </p>
          <h3 className="mt-1 font-black text-slate-950">{opportunite.titre}</h3>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-black ${opportunityStatusStyle(opportunite.statutModeration)}`}>
          {opportunityStatusLabel(opportunite.statutModeration, t)}
        </span>
      </div>
      {opportunite.descriptionCourte && (
        <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">{opportunite.descriptionCourte}</p>
      )}
      <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-500">{opportunite.contenu}</p>
      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-400">
        {opportunite.dateCreation && (
          <InlineIconLabel icon="Calendar">
            {new Date(opportunite.dateCreation).toLocaleDateString(language || 'fr-BE')}
          </InlineIconLabel>
        )}
        {(opportunite.dateLimite || opportunite.dateExpiration) && (
          <InlineIconLabel icon="Clock">
            {t('opportunityFields.deadlineShort', { defaultValue: 'Limite' })}{' '}
            {new Date(opportunite.dateLimite || opportunite.dateExpiration).toLocaleDateString(language || 'fr-BE')}
          </InlineIconLabel>
        )}
        {opportunite.nombrePlaces && (
          <InlineIconLabel icon="Users">
            {t('opportunityFields.placesValue', { count: opportunite.nombrePlaces, defaultValue: '{{count}} places' })}
          </InlineIconLabel>
        )}
        {opportunite.modeCandidature && (
          <InlineIconLabel icon="Send">
            {opportunityModeLabel(opportunite.modeCandidature, t)}
          </InlineIconLabel>
        )}
        {opportunite.publicCible && (
          <InlineIconLabel icon="Users">
            {opportunityTargetLabel(opportunite.publicCible, t)}
          </InlineIconLabel>
        )}
        {opportunite.miseEnAvant && (
          <InlineIconLabel icon="Star">
            {t('opportunityFields.featuredShort', { defaultValue: 'Mise en avant' })}
          </InlineIconLabel>
        )}
        {opportunite.lienExterne && (
          <a
            href={normalizeExternalUrl(opportunite.lienExterne)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-orange-700 hover:underline"
          >
            <AppIcon name="Globe" className="h-3.5 w-3.5" />
            {t('opportunityFields.externalLink', { defaultValue: 'Lien externe' })}
          </a>
        )}
      </div>
    </article>
  );
}

function PartnerSupportCard({ soutien, language, focused, processingKey, onEdit, onCancel, t }) {
  const target = soutien.projetTitre || soutien.activiteTitre || t('partnerSpace.supportFallback')
  const nextStep = partnerSupportNextStep(soutien, t)
  const editable = soutien.statutPaiement === 'EN_ATTENTE'

  return (
    <article className={`rounded-lg border bg-white p-5 shadow-sm ${focused ? 'border-orange-300 ring-2 ring-orange-100' : 'border-slate-100'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wide text-orange-600">
            {soutien.projetTitre ? t('partnerSupport.project') : t('partnerSupport.activity')}
          </p>
          <h3 className="mt-1 truncate font-black text-slate-950">{target}</h3>
          <p className="mt-1 text-sm font-black text-orange-600">{soutien.montant} €</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-black ${SUPPORT_STATUS_STYLES[soutien.statutPaiement] || 'bg-slate-100 text-slate-700'}`}>
          {supportStatusLabel(soutien.statutPaiement, t)}
        </span>
      </div>

      <div className="mt-4 rounded-lg border border-orange-100 bg-orange-50 px-4 py-3">
        <p className="text-xs font-black uppercase tracking-wide text-orange-700">
          {t('partnerSpace.nextStep', { defaultValue: 'Prochaine étape' })}
        </p>
        <p className="mt-1 text-sm font-semibold leading-relaxed text-orange-950">{nextStep}</p>
      </div>

      {editable && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onEdit}
            disabled={processingKey === `edit-${soutien.id}` || processingKey === `cancel-${soutien.id}`}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-orange-200 bg-white px-3 py-2 text-sm font-bold text-orange-700 transition hover:bg-orange-50 disabled:opacity-50"
          >
            <AppIcon name="Edit" className="h-4 w-4" />
            {t('common.edit', { defaultValue: 'Modifier' })}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={processingKey === `cancel-${soutien.id}` || processingKey === `edit-${soutien.id}`}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
          >
            <AppIcon name="XCircle" className="h-4 w-4" />
            {processingKey === `cancel-${soutien.id}`
              ? t('common.saving', { defaultValue: 'Enregistrement...' })
              : t('common.cancel', { defaultValue: 'Annuler' })}
          </button>
        </div>
      )}

      <div className="mt-4 rounded-lg bg-slate-50 p-3">
        <p className="text-xs font-black uppercase tracking-wide text-slate-400">
          {t('partnerSupport.admin.exchangeHistory', { defaultValue: 'Historique des échanges' })}
        </p>
        <div className="mt-3 space-y-3">
          <SupportExchange
            icon="Handshake"
            title={t('partnerSupport.admin.partnerProposal', { defaultValue: 'Proposition partenaire' })}
            date={soutien.dateCreation}
            text={soutien.message || t('partnerSpace.noMessage', { defaultValue: 'Aucun message ajouté.' })}
            language={language}
          />
          {soutien.reponseAdmin ? (
            <SupportExchange
              icon="Shield"
              title={t('partnerSupport.admin.adminReply', { defaultValue: 'Réponse admin' })}
              date={soutien.dateReponseAdmin || soutien.datePaiement}
              text={soutien.reponseAdmin}
              language={language}
            />
          ) : (
            <p className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-500">
              {t('partnerSpace.waitingAdminReply', { defaultValue: 'En attente d’une réponse admin.' })}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

function SupportExchange({ icon, title, date, text, language }) {
  return (
    <div className="flex gap-3 rounded-xl bg-white px-3 py-3">
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
        <AppIcon name={icon} className="h-4 w-4" />
      </span>
      <div>
        <p className="text-sm font-black text-slate-950">{title}</p>
        {date && <p className="text-xs font-semibold text-slate-400">{new Date(date).toLocaleDateString(language || 'fr-BE')}</p>}
        <p className="mt-1 text-sm leading-relaxed text-slate-600">{text}</p>
      </div>
    </div>
  );
}

function ImpactMetric({ icon, label, value }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
      <AppIcon name={icon} className="mb-3 h-5 w-5 text-orange-600" />
      <p className="text-2xl font-black text-slate-950">{value}</p>
      <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  );
}

const CHART_COLORS = ['#f97316', '#2563eb', '#0f766e', '#d97706', '#7c3aed', '#dc2626', '#64748b'];

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

function buildStatusChartData(items, getKey, getLabel) {
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

function getSupportedProjectStatus(soutien) {
  return soutien.projetStatut
    || soutien.statutProjet
    || soutien.projectStatus
    || soutien.projet?.statut
    || null;
}

function buildPartnerImpact({ statistiques, mesSoutiens }) {
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

function partnerSupportNextStep(soutien, t) {
  if (soutien.statutPaiement === 'EN_ATTENTE') {
    return t('partnerSpace.nextStepPending', { defaultValue: 'En attente de réponse admin. Vous pourrez suivre ici la décision et le commentaire.' });
  }
  if (soutien.statutPaiement === 'PAYE') {
    return t('partnerSpace.nextStepApproved', { defaultValue: 'Validé par l’administration. Le soutien est pris en compte dans votre impact partenaire.' });
  }
  if (soutien.statutPaiement === 'REMBOURSE') {
    return t('partnerSpace.nextStepRejected', { defaultValue: 'Refusé par l’administration. Consultez la réponse admin pour comprendre le motif.' });
  }
  return t('partnerSpace.nextStepFollow', { defaultValue: 'Statut à suivre dans votre historique de contributions.' });
}

function supportMutationError(error, t) {
  if (error?.response?.status === 403) {
    return t('partnerSpace.supportNotEditable', {
      defaultValue: 'Cette proposition ne peut plus être modifiée ou annulée. Elle a peut-être déjà été traitée par l’administration.',
    });
  }
  return userFriendlyError(error, t('partnerSpace.actionError'));
}

function InlineIconLabel({ icon, children }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <AppIcon name={icon} className="h-3.5 w-3.5 shrink-0 text-orange-500" />
      <span>{children}</span>
    </span>
  );
}

const PARTNER_TYPES = ['COMMUNE', 'BIJ', 'ECOLE', 'HAUTE_ECOLE', 'ENTREPRISE', 'SPONSOR', 'ASSOCIATION', 'ONG', 'FONDATION', 'AUTRE'];

function emptyOpportunityForm() {
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

function emptyPartnerProfile() {
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

function profileFromResponse(profile) {
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

function opportunityCategoryLabel(category, t) {
  const labels = {
    EMPLOI: 'Emploi',
    STAGE: 'Stage',
    FORMATION: 'Formation',
    EVENEMENT: 'Événement',
    APPEL_PROJET: 'Appel à projet',
    PUBLICITE: 'Publicité',
  };
  return t ? t(`opportunityCategories.${category}`, { defaultValue: labels[category] || 'Opportunité' }) : labels[category] || 'Opportunité';
}

function opportunityStatusLabel(status, t) {
  const labels = {
    EN_ATTENTE: 'En attente',
    PUBLIEE: 'Publiée',
    REFUSEE: 'Refusée',
  };
  return t ? t(`opportunityModeration.${status}`, { defaultValue: labels[status] || status || 'En attente' }) : labels[status] || status || 'En attente';
}

function opportunityModeLabel(mode, t) {
  return t(`opportunityFields.modes.${mode}`, { defaultValue: mode || '-' });
}

function opportunityTargetLabel(target, t) {
  return t(`opportunityFields.targets.${target}`, { defaultValue: target || '-' });
}

function opportunityStatusStyle(status) {
  const styles = {
    EN_ATTENTE: 'bg-amber-100 text-amber-800',
    PUBLIEE: 'bg-green-100 text-green-700',
    REFUSEE: 'bg-red-100 text-red-700',
  };
  return styles[status] || 'bg-slate-100 text-slate-700';
}

function normalizeExternalUrl(value) {
  if (!value) return '#';
  const trimmed = String(value).trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function ProfileInput({ label, value, onChange, type = 'text', required = false, ...inputProps }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-slate-700">{label}</span>
      <input
        type={type}
        required={required}
        value={value}
        onChange={event => onChange(event.target.value)}
        {...inputProps}
        className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
      />
    </label>
  );
}

function applySettled(result, onSuccess, onError) {
  if (result.status === 'fulfilled') {
    onSuccess(result.value.data);
  } else {
    onError(result.reason);
  }
}

function SectionLoadError({ message }) {
  return (
    <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      <AppIcon name="XCircle" className="h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
