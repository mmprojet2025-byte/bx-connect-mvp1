import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { userFriendlyError } from '../../utils/userFriendlyError';
import AppIcon from '../../components/ui/AppIcons';
import ProjectVisibilityBadge from '../../components/ProjectVisibilityBadge';
import { SUPPORT_STATUS_STYLES, supportStatusLabel } from '../../utils/supportStatus';
import PartnerLogo from '../../components/PartnerLogo';
import { CollaborativeDashboardLayout } from '../../components/dashboard/CollaborativeDashboard';
import ActivityFeed from '../../components/dashboard/ActivityFeed';

const PARTNER_TABS = new Set(['dashboard', 'projets', 'activites', 'soutiens']);

export default function PartenaireSpace() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  const [mesSoutiens, setMesSoutiens] = useState([]);
  const [projetsOuverts, setProjetsOuverts] = useState([]);
  const [activitesOuvertes, setActivitesOuvertes] = useState([]);
  const [profilInstitutionnel, setProfilInstitutionnel] = useState(null);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState(emptyPartnerProfile());
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [sectionErrors, setSectionErrors] = useState({});
  const requestedTab = searchParams.get('tab');
  const onglet = PARTNER_TABS.has(requestedTab) ? requestedTab : 'dashboard';

  // Formulaire soutien
  const [showSoutienForm, setShowSoutienForm] = useState(false);
  const [soutienForm, setSoutienForm] = useState({
    montant: '', message: '', projetId: null, activiteId: null, type: 'projet'
  });

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
      ]);
      const [soutiensRes, projetsRes, activitesRes, profilRes] = results;
      const errors = {};

      applySettled(soutiensRes, data => setMesSoutiens(data || []), () => { errors.soutiens = t('partnerSpace.sectionLoadError'); });
      applySettled(projetsRes, data => setProjetsOuverts(data || []), () => { errors.projets = t('partnerSpace.sectionLoadError'); });
      applySettled(activitesRes, data => setActivitesOuvertes(data || []), () => { errors.activites = t('partnerSpace.sectionLoadError'); });
      applySettled(profilRes, data => {
        setProfilInstitutionnel(data);
        setProfileForm(profileFromResponse(data));
      }, () => { errors.profil = t('partnerSpace.profileLoadError'); });

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
    }
  };

  const ONGLETS = [
    { id: 'dashboard',  label: t('partnerSpace.tabs.dashboard'), icon: 'BarChart' },
    { id: 'projets',    label: t('partnerSpace.tabs.projects'), icon: 'Rocket' },
    { id: 'activites',  label: t('partnerSpace.tabs.activities'), icon: 'Folder' },
    { id: 'soutiens',   label: t('partnerSpace.tabs.supports'), icon: 'Wallet' },
  ];

  const setOnglet = (tab) => {
    setSearchParams(tab === 'dashboard' ? {} : { tab });
  };

  if (loading) return (
    <CollaborativeDashboardLayout
      role="PARTENAIRE"
      emoji="🤝"
      title={t('partnerSpace.title')}
      subtitle={t('partnerSpace.loading')}
    >
      <p className="rounded-3xl bg-white p-10 text-center text-gray-400 shadow-sm">{t('partnerSpace.loading')}</p>
    </CollaborativeDashboardLayout>
  );

  return (
    <CollaborativeDashboardLayout
      role="PARTENAIRE"
      emoji="Handshake"
      title={profilInstitutionnel?.nomOrganisation || t('partnerSpace.title')}
      subtitle={t('partnerSpace.dashboardSubtitle', { defaultValue: `${projetsOuverts.length} projet(s) ouvert(s) · ${mesSoutiens.length} soutien(s) suivi(s)` })}
    >
        {/* En-tête */}
        <div className="mb-6 flex flex-col gap-4 rounded-[1.5rem] border border-orange-100 bg-white p-5 shadow-lg shadow-orange-950/5 md:flex-row md:items-center md:justify-between">
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
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              <AppIcon name="Edit" className="h-4 w-4" />
              {t('partnerInstitution.editProfile')}
            </button>
            <button
              onClick={() => setShowSoutienForm(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-orange-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-orange-500"
            >
              <AppIcon name="PlusCircle" className="h-4 w-4" />
              {t('partnerSpace.financialSupport')}
            </button>
          </div>
        </div>

        {profilInstitutionnel && (
          <div className="mb-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <h2 className="flex items-center gap-2 font-black text-slate-950">
                <AppIcon name="Building" className="h-5 w-5 text-orange-600" />
                {t('partnerInstitution.about')}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                {profilInstitutionnel.description || t('partnerInstitution.noDescription')}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <h2 className="font-black text-slate-950">{t('partnerInstitution.contact')}</h2>
              <div className="mt-3 space-y-2 text-sm text-slate-600">
                <ContactLine icon="User" value={profilInstitutionnel.personneContact} />
                <ContactLine icon="Mail" value={profilInstitutionnel.emailContact || profilInstitutionnel.compteEmail} />
                <ContactLine icon="Phone" value={profilInstitutionnel.telephone} />
                <ContactLine icon="Globe" value={profilInstitutionnel.siteWeb} />
              </div>
            </div>
          </div>
        )}
        {sectionErrors.profil && <SectionLoadError message={sectionErrors.profil} />}

        {/* Messages */}
        {message && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4 text-sm">{message}</div>}
        {error   && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">{error}</div>}

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
            <PartnerActions
              projetsOuverts={projetsOuverts}
              activitesOuvertes={activitesOuvertes}
              mesSoutiens={mesSoutiens}
              onSupport={() => setShowSoutienForm(true)}
              onProjects={() => setOnglet('projets')}
              onActivities={() => setOnglet('activites')}
              onSupports={() => setOnglet('soutiens')}
              t={t}
            />

            <div>
              {sectionErrors.soutiens && <SectionLoadError message={sectionErrors.soutiens} />}
              <ActivityFeed
                title={t('activityFeed.title', { defaultValue: 'Mon fil d’activité' })}
                subtitle={t('activityFeed.partnerSubtitle', { defaultValue: 'Soutiens, projets ouverts et activités disponibles.' })}
                emptyLabel={t('partnerSpace.noSupports')}
                items={buildPartnerActivityItems({ mesSoutiens, projetsOuverts, activitesOuvertes, t })}
                language={i18n.language}
                accent="orange"
              />
            </div>
          </div>
        )}

        {/* ── Projets ouverts ── */}
        {onglet === 'projets' && (
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-blue-900 mb-4">
              <AppIcon name="Rocket" className="h-5 w-5 text-orange-600" />
              {t('partnerSpace.openProjects')}
            </h2>
            {sectionErrors.projets && <SectionLoadError message={sectionErrors.projets} />}
            {projetsOuverts.length === 0 ? (
              <div className="text-center py-12 text-gray-400 bg-white rounded-2xl shadow">
                <AppIcon name="Rocket" className="mx-auto mb-3 h-10 w-10 text-orange-300" />
                <p>{t('partnerSpace.noOpenProjects')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {projetsOuverts.map(p => (
                  <div key={p.id} className="bg-white rounded-2xl shadow p-5">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <ProjectVisibilityBadge visibility={p.visibilite} className="mb-2" />
                        <h3 className="font-bold text-blue-900">{p.titre}</h3>
                      </div>
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                        {t(`statuses.${p.statut}`, { defaultValue: p.statut })}
                      </span>
                    </div>
                    {p.description && <p className="text-gray-500 text-sm mb-3 line-clamp-2">{p.description}</p>}
                    <div className="flex justify-between items-center text-xs text-gray-400 mb-3">
                      <InlineIconLabel icon="Wallet">{t('partnerSpace.budget')}: {p.budgetDemande ? `${p.budgetDemande} €` : t('partnerSpace.notDefined')}</InlineIconLabel>
                      <InlineIconLabel icon="CheckCircle">{t('partnerSpace.received')}: {p.totalSoutiensRecus || 0} €</InlineIconLabel>
                    </div>
                    <button
                      onClick={() => {
                        setSoutienForm({ ...soutienForm, type: 'projet', projetId: p.id });
                        setShowSoutienForm(true);
                      }}
                      className="inline-flex w-full items-center justify-center gap-2 bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold py-2 rounded-xl transition"
                    >
                      <AppIcon name="Wallet" className="h-4 w-4" />
                      {t('partnerSpace.proposeSupport')}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Activités ouvertes ── */}
        {onglet === 'activites' && (
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-blue-900 mb-4">
              <AppIcon name="Folder" className="h-5 w-5 text-orange-600" />
              {t('partnerSpace.openActivities')}
            </h2>
            {sectionErrors.activites && <SectionLoadError message={sectionErrors.activites} />}
            {activitesOuvertes.length === 0 ? (
              <div className="text-center py-12 text-gray-400 bg-white rounded-2xl shadow">
                <AppIcon name="Folder" className="mx-auto mb-3 h-10 w-10 text-orange-300" />
                <p>{t('partnerSpace.noOpenActivities')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activitesOuvertes.map(a => (
                  <div key={a.id} className="bg-white rounded-2xl shadow p-5">
                    <h3 className="font-bold text-blue-900 mb-1">{a.titre}</h3>
                    {a.description && <p className="text-gray-500 text-sm mb-2 line-clamp-2">{a.description}</p>}
                    <div className="text-xs text-gray-400 mb-3 space-y-1">
                      {a.lieu && <InlineIconLabel icon="Folder">{a.lieu}</InlineIconLabel>}
                      {a.dateDebut && <InlineIconLabel icon="Calendar">{new Date(a.dateDebut).toLocaleDateString(i18n.language)}</InlineIconLabel>}
                      <InlineIconLabel icon="CheckCircle">{t('partnerSpace.receivedSupports')}: {a.totalSoutiensRecus || 0} €</InlineIconLabel>
                    </div>
                    <button
                      onClick={() => {
                        setSoutienForm({ ...soutienForm, type: 'activite', activiteId: a.id });
                        setShowSoutienForm(true);
                      }}
                      className="inline-flex w-full items-center justify-center gap-2 bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold py-2 rounded-xl transition"
                    >
                      <AppIcon name="Wallet" className="h-4 w-4" />
                      {t('partnerSpace.proposeSupport')}
                    </button>
                  </div>
                ))}
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
            {sectionErrors.soutiens && <SectionLoadError message={sectionErrors.soutiens} />}
            {mesSoutiens.length === 0 ? (
              <div className="text-center py-12 text-gray-400 bg-white rounded-2xl shadow">
                <AppIcon name="Wallet" className="mx-auto mb-3 h-10 w-10 text-orange-300" />
                <p>{t('partnerSpace.noDeclarations')}</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow overflow-hidden">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{t('partnerSpace.target')}</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{t('partnerSupport.amount')}</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{t('users.status')}</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{t('partnerSupport.date')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mesSoutiens.map((s, i) => (
                      <tr key={s.id} className={`border-b border-gray-50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                        <td className="px-4 py-3 text-sm text-blue-900 font-medium">
                          {s.projetTitre ? (
                            <InlineIconLabel icon="Rocket">{s.projetTitre}</InlineIconLabel>
                          ) : s.activiteTitre ? (
                            <InlineIconLabel icon="Folder">{s.activiteTitre}</InlineIconLabel>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-orange-600">{s.montant} €</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            SUPPORT_STATUS_STYLES[s.statutPaiement] || 'bg-slate-100 text-slate-700'
                          }`}>{supportStatusLabel(s.statutPaiement, t)}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400">
                          {new Date(s.dateCreation).toLocaleDateString(i18n.language)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Modal formulaire soutien ── */}
        {showSoutienForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="flex items-center gap-2 text-lg font-bold text-blue-900">
                  <AppIcon name="Wallet" className="h-5 w-5 text-orange-600" />
                  {t('partnerSpace.declareSupport')}
                </h2>
                <button onClick={() => setShowSoutienForm(false)} className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600" aria-label={t('common.close')}>
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
                    className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-bold py-2.5 rounded-xl transition"
                  >
                    {t('partnerSpace.submit')}
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

        {showProfileForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <form onSubmit={handleSaveProfile} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-slate-950">{t('partnerInstitution.editTitle')}</h2>
                  <p className="mt-1 text-sm text-slate-500">{t('partnerInstitution.editDescription')}</p>
                </div>
                <button type="button" onClick={() => setShowProfileForm(false)} className="rounded-full p-2 text-slate-400 hover:bg-slate-100">
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

function PartnerActions({ projetsOuverts, activitesOuvertes, mesSoutiens, onSupport, onProjects, onActivities, onSupports, t }) {
  const pending = mesSoutiens.filter(soutien => soutien.statutPaiement === 'EN_ATTENTE').length;
  const paid = mesSoutiens.filter(soutien => soutien.statutPaiement === 'PAYE').length;
  const rejected = mesSoutiens.filter(soutien => soutien.statutPaiement === 'REMBOURSE').length;

  return (
    <section className="mb-6 rounded-3xl border border-orange-100 bg-white p-5 shadow-sm">
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
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-orange-500"
        >
          <AppIcon name="Wallet" className="h-4 w-4" />
          {t('partnerSpace.proposeSupport')}
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <PartnerActionCard
          icon="Rocket"
          title={t('partnerSpace.openProjects')}
          value={projetsOuverts.length}
          description={projetsOuverts.length > 0 ? t('partnerSpace.projectsAvailable', { count: projetsOuverts.length, defaultValue: `${projetsOuverts.length} projet(s) ouvert(s)` }) : t('partnerSpace.noOpenProjects')}
          onClick={onProjects}
        />
        <PartnerActionCard
          icon="Calendar"
          title={t('partnerSpace.openActivities')}
          value={activitesOuvertes.length}
          description={activitesOuvertes.length > 0 ? t('partnerSpace.activitiesAvailable', { count: activitesOuvertes.length, defaultValue: `${activitesOuvertes.length} activité(s) ouverte(s)` }) : t('partnerSpace.noOpenActivities')}
          onClick={onActivities}
        />
        <PartnerActionCard
          icon="Wallet"
          title={t('partnerSpace.mySupports')}
          value={mesSoutiens.length}
          description={mesSoutiens.length > 0
            ? t('partnerSpace.supportStatusSummary', { pending, paid, rejected, defaultValue: `${pending} en attente · ${paid} payé(s) · ${rejected} refusé(s)` })
            : t('partnerSpace.noSupports')}
          onClick={onSupports}
          highlight={pending > 0}
        />
      </div>
    </section>
  );
}

function buildPartnerActivityItems({ mesSoutiens, projetsOuverts, activitesOuvertes, t }) {
  const supportItems = mesSoutiens.map(soutien => ({
    key: `soutien-${soutien.id}`,
    icon: 'Wallet',
    title: soutien.projetTitre || soutien.activiteTitre || t('partnerSpace.supportFallback'),
    description: `${soutien.montant} € · ${supportStatusLabel(soutien.statutPaiement, t)}`,
    date: soutien.dateCreation || soutien.datePaiement,
    to: '/partenaire?tab=soutiens',
  }));

  const projectItems = projetsOuverts.map(projet => ({
    key: `projet-${projet.id}`,
    icon: 'Rocket',
    title: projet.titre,
    description: projet.budgetDemande ? `${t('partnerSpace.budget')}: ${projet.budgetDemande} €` : t('partnerSpace.openProjects'),
    date: projet.dateModification || projet.dateCreation,
    to: '/partenaire?tab=projets',
  }));

  const activityItems = activitesOuvertes.map(activite => ({
    key: `activite-${activite.id}`,
    icon: 'Calendar',
    title: activite.titre,
    description: activite.lieu || t('partnerSpace.openActivities'),
    date: activite.dateModification || activite.dateCreation || activite.dateDebut,
    to: '/partenaire?tab=activites',
  }));

  return [...supportItems, ...projectItems, ...activityItems];
}

function PartnerActionCard({ icon, title, value, description, onClick, highlight = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${
        highlight ? 'border-amber-200 bg-amber-50' : 'border-slate-100 bg-slate-50 hover:bg-white'
      }`}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${highlight ? 'bg-white text-amber-700' : 'bg-orange-50 text-orange-600'}`}>
          <AppIcon name={icon} className="h-5 w-5" />
        </span>
        <span className={`text-2xl font-black ${highlight ? 'text-amber-800' : 'text-slate-950'}`}>{value}</span>
      </div>
      <h3 className="font-black text-slate-950">{title}</h3>
      <p className="mt-1 text-sm leading-5 text-slate-500">{description}</p>
    </button>
  );
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

function ContactLine({ icon, value }) {
  if (!value) return null;
  return (
    <p className="flex items-center gap-2">
      <AppIcon name={icon} className="h-4 w-4 shrink-0 text-orange-500" />
      <span className="break-all">{value}</span>
    </p>
  );
}

function ProfileInput({ label, value, onChange, type = 'text', required = false }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-slate-700">{label}</span>
      <input
        type={type}
        required={required}
        value={value}
        onChange={event => onChange(event.target.value)}
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
