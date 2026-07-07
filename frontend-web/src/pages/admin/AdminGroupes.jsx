import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import api from '../../api/axios';
import StatusBadge from '../../components/StatusBadge';
import GroupAvatar from '../../components/GroupAvatar';
import AppIcon from '../../components/ui/AppIcons';
import PageHeader from '../../components/ui/PageHeader';
import LocationPicker from '../../components/location/LocationPicker';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import LoadingState from '../../components/ui/LoadingState';

const emptyGroupeForm = {
  nom: '',
  description: '',
  categorie: '',
  theme: '',
  objectif: '',
  adresseReunion: '',
  commune: '',
  latitude: '',
  longitude: '',
  capaciteMax: '',
  referentId: '',
};

export default function AdminGroupes() {
  const { t, i18n } = useTranslation();
  const [groupes, setGroupes] = useState([]);
  const [groupesEnAttente, setGroupesEnAttente] = useState([]);
  const [referents, setReferents] = useState([]);
  const [activites, setActivites] = useState([]);
  const [projets, setProjets] = useState([]);
  const [activitesDisponibles, setActivitesDisponibles] = useState(false);
  const [projetsDisponibles, setProjetsDisponibles] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [assigningId, setAssigningId] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [filtrePilotage, setFiltrePilotage] = useState('tous');
  const [recherche, setRecherche] = useState('');
  const [filtreStatut, setFiltreStatut] = useState('');
  const [motifRefus, setMotifRefus] = useState('');
  const [groupeARefuser, setGroupeARefuser] = useState(null);
  const [groupeForm, setGroupeForm] = useState(emptyGroupeForm);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);

  const referentsActifs = referents.filter(referent => referent.actif);

  const fetchReferents = useCallback(async () => {
    try {
      const res = await api.get('/admin/referents');
      setReferents(res.data);
    } catch {
      setError(t('referent.errorLoad'));
    }
  }, []);

  const fetchGroupes = useCallback(async () => {
    setLoading(true);
    try {
      const [groupesResult, pendingResult, activitesResult, projetsResult] = await Promise.allSettled([
        api.get('/admin/groupes'),
        api.get('/admin/groupes/en-attente'),
        api.get('/activites/admin/toutes'),
        api.get('/projets/admin/tous'),
      ]);
      if (groupesResult.status === 'rejected') throw groupesResult.reason;
      setGroupes(Array.isArray(groupesResult.value.data) ? groupesResult.value.data : []);
      setGroupesEnAttente(pendingResult.status === 'fulfilled' && Array.isArray(pendingResult.value.data)
        ? pendingResult.value.data
        : []);
      const activitiesOk = activitesResult.status === 'fulfilled' && Array.isArray(activitesResult.value.data);
      setActivites(activitiesOk ? activitesResult.value.data : []);
      setActivitesDisponibles(activitiesOk);
      const projectsOk = projetsResult.status === 'fulfilled' && Array.isArray(projetsResult.value.data);
      setProjets(projectsOk ? projetsResult.value.data : []);
      setProjetsDisponibles(projectsOk);
    } catch {
      setError(t('admin.errorGroupsLoad'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchGroupes();
    fetchReferents();
  }, [fetchGroupes, fetchReferents]);

  const handleFormChange = (field, value) => {
    setGroupeForm(prev => ({ ...prev, [field]: value }));
  };

  const handleCreateGroupe = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError('');

    try {
      await api.post('/admin/groupes', {
        ...groupeForm,
        capaciteMax: Number(groupeForm.capaciteMax) || 0,
        latitude: groupeForm.latitude === '' ? null : Number(groupeForm.latitude),
        longitude: groupeForm.longitude === '' ? null : Number(groupeForm.longitude),
        referentId: Number(groupeForm.referentId),
      });
      setMessage(t('admin.groupCreated'));
      setGroupeForm(emptyGroupeForm);
      setShowCreateForm(false);
      setFiltrePilotage('tous');
      await fetchGroupes();
      setTimeout(() => setMessage(''), 3000);
    } catch {
      setError(t('admin.errorGroupCreate'));
    } finally {
      setCreating(false);
    }
  };

  const handleAssignerReferent = async (groupeId, referentId) => {
    if (!referentId) return;
    setAssigningId(groupeId);
    setError('');

    try {
      const res = await api.patch(`/admin/groupes/${groupeId}/referent/${referentId}`);
      setGroupes(prev => prev.map(groupe => groupe.id === groupeId ? res.data : groupe));
      setSelectedGroup(current => current?.id === groupeId ? res.data : current);
      setMessage(t('admin.referentAssigned'));
      setTimeout(() => setMessage(''), 3000);
    } catch {
      setError(t('admin.errorReferentAssign'));
    } finally {
      setAssigningId(null);
    }
  };

  const handleValider = async (id) => {
    try {
      await api.patch(`/admin/groupes/${id}/valider`);
      setMessage(t('admin.groupValidated'));
      fetchGroupes();
      setTimeout(() => setMessage(''), 3000);
    } catch { setError(t('admin.errorGroupValidate')); }
  };

  const handleRefuser = async () => {
    if (!groupeARefuser) return;
    try {
      await api.patch(`/admin/groupes/${groupeARefuser}/refuser`, { motif: motifRefus || t('admin.notSpecified') });
      setMessage(t('admin.groupRefused'));
      setGroupeARefuser(null);
      setMotifRefus('');
      fetchGroupes();
      setTimeout(() => setMessage(''), 3000);
    } catch { setError(t('admin.errorGroupRefuse')); }
  };

  const referentLabel = (referent) => `${referent.prenom || ''} ${referent.nom || ''}`.trim() || referent.email;

  const referentAssigne = (groupe) => {
    const referent = referents.find(item => item.id === groupe.referentId);
    if (referent) return referentLabel(referent);
    return `${groupe.referentPrenom || ''} ${groupe.referentNom || ''}`.trim() || t('admin.noReferentAssigned');
  };

  const statutsDisponibles = [...new Set(groupes.map(groupe => groupe.statut).filter(Boolean))];
  const groupesPilotage = groupes.filter(groupe => matchesGroupPilotageFilter(groupe, filtrePilotage, groupesEnAttente));
  const groupesFiltres = groupesPilotage.filter(groupe => {
    const texte = `${groupe.nom || ''} ${groupe.description || ''} ${groupe.categorie || ''} ${groupe.theme || ''} ${referentAssigne(groupe)}`.toLowerCase();
    const matchRecherche = texte.includes(recherche.toLowerCase());
    const matchStatut = filtreStatut ? groupe.statut === filtreStatut : true;
    return matchRecherche && matchStatut;
  });
  const stats = buildGroupStats(groupes, groupesEnAttente);
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">

        <PageHeader
          eyebrow={t('nav.groups')}
          title={t('admin.groupsManagement')}
          description={t('admin.groupsDescription', { defaultValue: 'Créez les groupes, attribuez un référent et suivez leur statut.' })}
          action={(
            <button
              type="button"
              onClick={() => setShowCreateForm(current => !current)}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-600"
            >
              <AppIcon name={showCreateForm ? 'XCircle' : 'PlusCircle'} className="h-4 w-4" />
              {showCreateForm ? t('common.cancel') : t('admin.createGroup')}
            </button>
          )}
        />

        {message && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4 text-sm">{message}</div>}
        {error && groupes.length > 0 && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">{error}</div>}

        {!loading && groupes.length > 0 && (
          <p className="mb-3 rounded-xl border border-slate-100 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm">
            {t('admin.groupsPilotSummary', {
              total: stats.total,
              active: stats.active,
              withoutReferent: stats.withoutReferent,
              pending: stats.pending,
            })}
          </p>
        )}

        {showCreateForm && (
        <section className="mb-4 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-black text-blue-900">{t('admin.createGroup')}</h2>
              <p className="text-xs text-slate-500">{t('admin.createGroupCompactHint')}</p>
            </div>
          </div>
          <form onSubmit={handleCreateGroupe} className="grid gap-3 md:grid-cols-4">
            <Input
              label={t('admin.groupName')}
              value={groupeForm.nom}
              onChange={value => handleFormChange('nom', value)}
              required
            />
            <Input
              label={t('activities.form_category')}
              value={groupeForm.categorie}
              onChange={value => handleFormChange('categorie', value)}
            />
            <Input
              label={t('activities.form_theme')}
              value={groupeForm.theme}
              onChange={value => handleFormChange('theme', value)}
            />
            <Input
              label={t('admin.maxCapacity')}
              value={groupeForm.capaciteMax}
              onChange={value => handleFormChange('capaciteMax', value)}
              type="number"
              min="0"
            />
            <Input
              label={t('admin.meetingAddress')}
              value={groupeForm.adresseReunion}
              onChange={value => handleFormChange('adresseReunion', value)}
            />
            <Input
              label={t('admin.commune')}
              value={groupeForm.commune}
              onChange={value => handleFormChange('commune', value)}
            />
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">{t('admin.activeReferent')}</label>
              <select
                value={groupeForm.referentId}
                onChange={e => handleFormChange('referentId', e.target.value)}
                required
                className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="">{t('admin.selectReferent')}</option>
                {referentsActifs.map(referent => (
                  <option key={referent.id} value={referent.id}>{referentLabel(referent)}</option>
                ))}
              </select>
              {referentsActifs.length === 0 && (
                <p className="text-xs text-red-600 mt-1">{t('admin.noActiveReferent')}</p>
              )}
            </div>
            <details className="md:col-span-4 rounded-xl border border-slate-100 bg-slate-50 p-3">
              <summary className="cursor-pointer text-xs font-black uppercase tracking-wide text-slate-500">
                {t('admin.advancedLocation')}
              </summary>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <LocationPicker
                  address={groupeForm.adresseReunion}
                  commune={groupeForm.commune}
                  latitude={groupeForm.latitude}
                  longitude={groupeForm.longitude}
                  onCoordinatesChange={(latitude, longitude) => setGroupeForm(current => ({ ...current, latitude, longitude }))}
                />
                <div className="grid gap-3">
                  <Input
                    label={t('admin.latitude')}
                    value={groupeForm.latitude}
                    onChange={value => handleFormChange('latitude', value)}
                    type="number"
                    step="any"
                  />
                  <Input
                    label={t('admin.longitude')}
                    value={groupeForm.longitude}
                    onChange={value => handleFormChange('longitude', value)}
                    type="number"
                    step="any"
                  />
                </div>
              </div>
            </details>
            <details className="md:col-span-4 rounded-xl border border-slate-100 bg-slate-50 p-3">
              <summary className="cursor-pointer text-xs font-black uppercase tracking-wide text-slate-500">
                {t('admin.advancedSettings')}
              </summary>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <TextArea
                  label={t('activities.form_description')}
                  value={groupeForm.description}
                  onChange={value => handleFormChange('description', value)}
                />
                <TextArea
                  label={t('admin.objective')}
                  value={groupeForm.objectif}
                  onChange={value => handleFormChange('objectif', value)}
                />
              </div>
            </details>
            <div className="md:col-span-4 flex justify-end">
              <button
                type="submit"
                disabled={creating || referentsActifs.length === 0}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                <AppIcon name="PlusCircle" className="h-4 w-4" />
                {creating ? t('common.creating') : t('admin.createGroup')}
              </button>
            </div>
          </form>
        </section>
        )}

        <section className="mb-4 rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
          <div className="mb-3 flex flex-wrap gap-2">
            {groupFilterOptions(t).map(option => (
              <button key={option.id} type="button" onClick={() => setFiltrePilotage(option.id)}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  filtrePilotage === option.id ? 'bg-blue-700 text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-blue-50 hover:text-blue-700'
                }`}>
                <AppIcon name={option.icon} className="h-3.5 w-3.5" />
                {option.label}
              </button>
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_220px]">
            <label className="relative block">
              <AppIcon name="Search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={recherche}
                onChange={e => { setRecherche(e.target.value); setMessage(''); setError(''); }}
                placeholder={t('common.search', { defaultValue: 'Rechercher' })}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </label>
            <select
              value={filtreStatut}
              onChange={e => setFiltreStatut(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">{t('common.all_statuses')}</option>
              {statutsDisponibles.map(statut => (
                <option key={statut} value={statut}>{t(`statuses.${statut}`, { defaultValue: statut })}</option>
              ))}
            </select>
          </div>
        </section>

        {loading ? (
          <LoadingState label={t('common.loading')} />
        ) : error && groupes.length === 0 ? (
          <ErrorState
            title={t('common.loadErrorTitle')}
            description={error}
            actionLabel={t('common.retry')}
            action={fetchGroupes}
          />
        ) : groupes.length === 0 ? (
          <EmptyState
            icon="Users"
            title={t('admin.noGroups')}
          />
        ) : filtrePilotage === 'en-attente' && groupesFiltres.length === 0 ? (
          <div className="rounded-xl border border-slate-100 bg-white px-4 py-3 text-sm font-semibold text-slate-600 shadow-sm">
            <span>{t('admin.noPendingGroupsCompact')}</span>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setFiltrePilotage('tous')}
                className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
              >
                {t('admin.allGroupsTab')}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(true)}
                className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-200"
              >
                {t('admin.createGroup')}
              </button>
            </div>
          </div>
        ) : groupesFiltres.length === 0 ? (
          <EmptyState
            icon="Search"
            title={t('common.noResults', { defaultValue: 'Aucun résultat trouvé.' })}
          />
        ) : (
          <div className="space-y-4">
            {groupesFiltres.map(g => (
              <div key={g.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-start gap-4">
                    <GroupAvatar name={g.nom} />
                    <div>
                      <h3 className="font-bold text-blue-900 text-lg">{g.nom}</h3>
                      <p className="text-gray-500 text-sm mt-0.5">
                        {t('admin.referentLabel', { referent: referentAssigne(g) })}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={g.statut}>
                    {t(`statuses.${g.statut}`, { defaultValue: g.statut })}
                  </StatusBadge>
                </div>

                {g.description && <p className="line-clamp-2 text-gray-600 text-sm mb-3">{g.description}</p>}

                <div className="mb-3 flex flex-wrap gap-2">
                  <FollowUpBadge followUp={groupFollowUp(g, t)} />
                  <InfoChip>{groupMembersCapacity(g, t)}</InfoChip>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs mb-4">
                  {g.theme && <InfoChip>{g.theme}</InfoChip>}
                  {g.categorie && <InfoChip>{g.categorie}</InfoChip>}
                  {(g.adresseReunion || g.commune) && <InfoChip>{[g.adresseReunion, g.commune].filter(Boolean).join(', ')}</InfoChip>}
                  {g.capaciteMax > 0 && <InfoChip>{t('activities.capacity_max', { count: g.capaciteMax })}</InfoChip>}
                  <InfoChip>{new Date(g.dateCreation).toLocaleDateString(i18n.language || 'fr-BE')}</InfoChip>
                </div>

                {g.motifRefus && (
                  <div className="bg-red-50 rounded-xl p-3 mb-4 text-sm text-red-700">
                    <strong>{t('admin.refusalReason')} :</strong> {g.motifRefus}
                  </div>
                )}

                <details className="mb-4 rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <summary className="cursor-pointer text-xs font-black uppercase tracking-wide text-slate-500">
                    {t('admin.assignedReferent')}
                  </summary>
                  <select
                    value={g.referentId || ''}
                    onChange={e => handleAssignerReferent(g.id, e.target.value)}
                    disabled={assigningId === g.id || referentsActifs.length === 0}
                    className="mt-3 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100"
                  >
                    <option value="">{t('admin.selectReferent')}</option>
                    {g.referentId && !referentsActifs.some(referent => referent.id === g.referentId) && (
                      <option value={g.referentId} disabled>{referentAssigne(g)}</option>
                    )}
                    {referentsActifs.map(referent => (
                      <option key={referent.id} value={referent.id}>{referentLabel(referent)}</option>
                    ))}
                  </select>
                </details>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedGroup(g)}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-100 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-200"
                  >
                    <AppIcon name="ClipboardList" className="h-3.5 w-3.5" />
                    {t('admin.manageGroup')}
                  </button>
                  <Link
                    to={`/groupes/${g.id}`}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
                  >
                    <AppIcon name="Eye" className="h-3.5 w-3.5" />
                    {t('admin.viewGroup')}
                  </Link>
                </div>

                {g.statut === 'EN_ATTENTE' && (
                  <div className="mt-3 flex gap-3">
                    <button onClick={() => handleValider(g.id)}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-green-600 py-2.5 text-sm font-semibold text-white transition hover:bg-green-500">
                      <AppIcon name="CheckCircle" className="h-4 w-4" />
                      {t('admin.validateGroup')}
                    </button>
                    <button onClick={() => setGroupeARefuser(g.id)}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-red-600 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500">
                      <AppIcon name="XCircle" className="h-4 w-4" />
                      {t('admin.refuse')}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {selectedGroup && (
          <GroupFollowUpDrawer
            groupe={selectedGroup}
            referent={referentAssigne(selectedGroup)}
            activites={itemsForGroup(activites, selectedGroup)}
            projets={itemsForGroup(projets, selectedGroup)}
            activitesDisponibles={activitesDisponibles}
            projetsDisponibles={projetsDisponibles}
            referentsActifs={referentsActifs}
            assigning={assigningId === selectedGroup.id}
            t={t}
            onClose={() => setSelectedGroup(null)}
            onAssign={(referentId) => handleAssignerReferent(selectedGroup.id, referentId)}
            onValidate={() => handleValider(selectedGroup.id)}
            onRefuse={() => setGroupeARefuser(selectedGroup.id)}
          />
        )}

        {/* Modal refus */}
        {groupeARefuser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md">
              <h2 className="text-lg font-bold text-blue-900 mb-4">{t('admin.refuseGroup')}</h2>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('admin.refusalReason')}</label>
              <textarea
                value={motifRefus}
                onChange={e => setMotifRefus(e.target.value)}
                rows={3}
                placeholder={t('admin.refusalReasonPlaceholder')}
                className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none mb-4"
              />
              <div className="flex gap-3">
                <button onClick={handleRefuser}
                  className="flex-1 bg-red-600 hover:bg-red-500 text-white font-semibold py-2.5 rounded-xl transition">
                  {t('admin.confirmRefusal')}
                </button>
                <button onClick={() => { setGroupeARefuser(null); setMotifRefus(''); }}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl transition">
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

function GroupFollowUpDrawer({
  groupe,
  referent,
  activites,
  projets,
  activitesDisponibles,
  projetsDisponibles,
  referentsActifs,
  assigning,
  t,
  onClose,
  onAssign,
  onValidate,
  onRefuse,
}) {
  const followUp = groupFollowUp(groupe, t);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/30 p-3 backdrop-blur-sm">
      <button type="button" className="absolute inset-0 cursor-default" aria-label={t('common.close')} onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="shrink-0 border-b border-slate-100 bg-gradient-to-r from-blue-50 via-white to-emerald-50 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-wide text-blue-700">{t('admin.groupFollowUpSheet')}</p>
              <h2 className="mt-1 truncate text-xl font-black text-slate-950">{groupe.nom}</h2>
              <p className="mt-1 text-sm text-slate-500">{referent}</p>
            </div>
            <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 transition hover:bg-white hover:text-slate-700" aria-label={t('common.close')}>
              <AppIcon name="XCircle" className="h-5 w-5" />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="mb-4 grid grid-cols-3 gap-2">
            <DrawerMetric label={t('activities.capacity')} value={groupMembersCapacity(groupe, t)} icon="Users" />
            <DrawerMetric label={t('nav.activities')} value={activitesDisponibles ? activites.length : '—'} icon="Calendar" />
            <DrawerMetric label={t('nav.projects')} value={projetsDisponibles ? projets.length : '—'} icon="Rocket" />
          </div>

          <DrawerSection title={t('admin.groupFollowUp')} icon="ClipboardList">
            <div className="space-y-2 text-sm text-slate-600">
              <SummaryLine>{t('admin.groupStatusLine', { status: t(`statuses.${groupe.statut}`, { defaultValue: groupe.statut }) })}</SummaryLine>
              {(groupe.adresseReunion || groupe.commune) && (
                <SummaryLine>{[groupe.adresseReunion, groupe.commune].filter(Boolean).join(', ')}</SummaryLine>
              )}
              <p className={`rounded-lg px-3 py-2 text-xs font-bold ${followUp.toneClass}`}>{followUp.label}</p>
            </div>
          </DrawerSection>

          {(groupe.description || groupe.objectif) && (
            <DrawerSection title={t('admin.objective')} icon="FileText">
              {groupe.description && <p className="mb-2 text-sm text-slate-600">{groupe.description}</p>}
              {groupe.objectif && <p className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-800">{groupe.objectif}</p>}
            </DrawerSection>
          )}

          <DrawerSection title={t('admin.availableActions')} icon="Settings">
            <div className="grid gap-2 sm:grid-cols-2">
              <Link to={`/groupes/${groupe.id}`} className="inline-flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700">
                <AppIcon name="Eye" className="h-4 w-4" />
                {t('admin.viewGroup')}
              </Link>
              <Link to="/admin/activites" className="inline-flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700">
                <AppIcon name="Calendar" className="h-4 w-4" />
                {t('admin.viewLinkedActivities')}
              </Link>
              <Link to="/admin/projets" className="inline-flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700">
                <AppIcon name="Rocket" className="h-4 w-4" />
                {t('admin.viewLinkedProjects')}
              </Link>
            </div>
            <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
              <label className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-400">{t('admin.assignedReferent')}</label>
              <select
                value={groupe.referentId || ''}
                onChange={event => onAssign(event.target.value)}
                disabled={assigning || referentsActifs.length === 0}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-slate-100"
              >
                <option value="">{t('admin.selectReferent')}</option>
                {groupe.referentId && !referentsActifs.some(referentItem => referentItem.id === groupe.referentId) && (
                  <option value={groupe.referentId} disabled>{referent}</option>
                )}
                {referentsActifs.map(referentItem => (
                  <option key={referentItem.id} value={referentItem.id}>
                    {`${referentItem.prenom || ''} ${referentItem.nom || ''}`.trim() || referentItem.email}
                  </option>
                ))}
              </select>
            </div>
            {groupe.statut === 'EN_ATTENTE' && (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <button type="button" onClick={onValidate} className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500">
                  <AppIcon name="CheckCircle" className="h-4 w-4" />
                  {t('admin.validateGroup')}
                </button>
                <button type="button" onClick={onRefuse} className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-500">
                  <AppIcon name="XCircle" className="h-4 w-4" />
                  {t('admin.refuse')}
                </button>
              </div>
            )}
          </DrawerSection>
        </div>
      </aside>
    </div>
  );
}

function buildGroupStats(groupes, groupesEnAttente) {
  return {
    total: groupes.length,
    active: groupes.filter(isActiveGroup).length,
    withoutReferent: groupes.filter(groupWithoutReferent).length,
    pending: groupesEnAttente.length || groupes.filter(group => group.statut === 'EN_ATTENTE').length,
  };
}

function groupFilterOptions(t) {
  return [
    { id: 'tous', label: t('admin.allGroupsTab'), icon: 'Users' },
    { id: 'en-attente', label: t('admin.pendingTab'), icon: 'Clock' },
    { id: 'valides', label: t('admin.validatedGroups'), icon: 'CheckCircle' },
    { id: 'sans-referent', label: t('admin.groupsWithoutReferentFilter'), icon: 'User' },
    { id: 'complets', label: t('admin.fullGroups'), icon: 'AlertTriangle' },
    { id: 'inactifs', label: t('admin.inactiveGroups'), icon: 'Archive' },
  ];
}

function matchesGroupPilotageFilter(groupe, filter, pendingGroups) {
  if (filter === 'en-attente') return pendingGroups.some(item => String(item.id) === String(groupe.id)) || groupe.statut === 'EN_ATTENTE';
  if (filter === 'valides') return isActiveGroup(groupe);
  if (filter === 'sans-referent') return groupWithoutReferent(groupe);
  if (filter === 'complets') return isFullGroup(groupe);
  if (filter === 'inactifs') return isInactiveGroup(groupe);
  return true;
}

function isActiveGroup(groupe) {
  return ['VALIDE', 'ACTIF', 'ACTIVE'].includes(String(groupe.statut || '').toUpperCase());
}

function isInactiveGroup(groupe) {
  return ['INACTIF', 'REFUSE', 'REFUSEE', 'ARCHIVE'].includes(String(groupe.statut || '').toUpperCase());
}

function groupWithoutReferent(groupe) {
  return !groupe.referentId && !groupe.referentPrenom && !groupe.referentNom;
}

function isFullGroup(groupe) {
  const capacity = Number(groupe.capaciteMax);
  const members = Number(groupe.nombreMembres);
  return Number.isFinite(capacity) && capacity > 0 && Number.isFinite(members) && members >= capacity;
}

function groupMembersCapacity(groupe, t) {
  const members = Number(groupe.nombreMembres);
  const hasMembers = Number.isFinite(members);
  const capacity = Number(groupe.capaciteMax);
  if (Number.isFinite(capacity) && capacity > 0 && hasMembers) {
    return t('groups.members_capacity', { count: members, capacity });
  }
  if (Number.isFinite(capacity) && capacity > 0) return t('activities.capacity_max', { count: capacity });
  if (hasMembers) return t('admin.membersCount', { count: members });
  return t('activities.unlimited');
}

function groupFollowUp(groupe, t) {
  if (groupe.statut === 'EN_ATTENTE') return followUpResult(t('admin.groupFollowUpStates.toValidate'), 'bg-amber-50 text-amber-700');
  if (groupWithoutReferent(groupe)) return followUpResult(t('admin.groupFollowUpStates.withoutReferent'), 'bg-orange-50 text-orange-700');
  if (isFullGroup(groupe)) return followUpResult(t('admin.groupFollowUpStates.full'), 'bg-cyan-50 text-cyan-700');
  if (isInactiveGroup(groupe)) return followUpResult(t('admin.groupFollowUpStates.inactive'), 'bg-slate-50 text-slate-700');
  return followUpResult(t('admin.groupFollowUpStates.active'), 'bg-emerald-50 text-emerald-700');
}

function followUpResult(label, toneClass) {
  return { label, toneClass };
}

function FollowUpBadge({ followUp }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${followUp.toneClass}`}>
      {followUp.label}
    </span>
  );
}

function itemsForGroup(items, groupe) {
  if (!Array.isArray(items)) return [];
  return items.filter(item => {
    const groupId = item.groupeId ?? item.groupId ?? item.groupe?.id ?? item.group?.id;
    if (groupId != null && groupe.id != null && Number(groupId) === Number(groupe.id)) return true;
    const groupName = String(item.groupeNom || item.groupName || item.groupe?.nom || item.group?.nom || '').toLowerCase();
    return groupName && groupName === String(groupe.nom || '').toLowerCase();
  });
}

function DrawerMetric({ label, value, icon }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
      <AppIcon name={icon} className="mb-1 h-4 w-4 text-blue-700" />
      <p className="truncate text-sm font-black text-slate-950">{value}</p>
      <p className="truncate text-[11px] font-semibold text-slate-500">{label}</p>
    </div>
  );
}

function DrawerSection({ title, icon, children }) {
  return (
    <section className="mb-4 rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
      <h3 className="mb-2 flex items-center gap-2 text-sm font-black text-slate-950">
        <AppIcon name={icon} className="h-4 w-4 text-blue-700" />
        {title}
      </h3>
      {children}
    </section>
  );
}

function SummaryLine({ children }) {
  return (
    <p className="flex items-center gap-2">
      <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
      <span>{children}</span>
    </p>
  );
}

function Input({ label, value, onChange, type = 'text', required = false, min, step }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        min={min}
        step={step}
        value={value}
        onChange={e => onChange(e.target.value)}
        required={required}
        className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
    </div>
  );
}

function TextArea({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={3}
        className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
      />
    </div>
  );
}

function InfoChip({ children }) {
  return (
    <span className="rounded-xl bg-gray-50 px-3 py-2 font-semibold text-gray-600">
      {children}
    </span>
  );
}
