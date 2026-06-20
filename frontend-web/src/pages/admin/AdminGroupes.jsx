import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import api from '../../api/axios';
import StatusBadge from '../../components/StatusBadge';
import GroupAvatar from '../../components/GroupAvatar';
import AppIcon from '../../components/ui/AppIcons';
import PageHeader from '../../components/ui/PageHeader';
import SectionCard from '../../components/ui/SectionCard';
import LocationPicker from '../../components/location/LocationPicker';

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
  const [referents, setReferents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [assigningId, setAssigningId] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [onglet, setOnglet] = useState('en-attente');
  const [recherche, setRecherche] = useState('');
  const [filtreStatut, setFiltreStatut] = useState('');
  const [motifRefus, setMotifRefus] = useState('');
  const [groupeARefuser, setGroupeARefuser] = useState(null);
  const [groupeForm, setGroupeForm] = useState(emptyGroupeForm);

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
      const endpoint = onglet === 'en-attente'
        ? '/admin/groupes/en-attente'
        : '/admin/groupes';
      const res = await api.get(endpoint);
      setGroupes(res.data);
    } catch {
      setError(t('admin.errorGroupsLoad'));
    } finally {
      setLoading(false);
    }
  }, [onglet]);

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
      setOnglet('tous');
      await fetchGroupes();
      setTimeout(() => setMessage(''), 3000);
    } catch {
      setError(t('admin.errorGroupCreate'));
    } finally {
      setCreating(false);
    }
  };

  const handleAssignerReferent = async (groupeId, referentId) => {
    setAssigningId(groupeId);
    setError('');

    try {
      const res = await api.patch(`/admin/groupes/${groupeId}/referent/${referentId}`);
      setGroupes(prev => prev.map(groupe => groupe.id === groupeId ? res.data : groupe));
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
  const groupesFiltres = groupes.filter(groupe => {
    const texte = `${groupe.nom || ''} ${groupe.description || ''} ${groupe.categorie || ''} ${groupe.theme || ''} ${referentAssigne(groupe)}`.toLowerCase();
    const matchRecherche = texte.includes(recherche.toLowerCase());
    const matchStatut = filtreStatut ? groupe.statut === filtreStatut : true;
    return matchRecherche && matchStatut;
  });
  const stats = {
    total: groupes.length,
    enAttente: groupes.filter(groupe => groupe.statut === 'EN_ATTENTE').length,
    valides: groupes.filter(groupe => groupe.statut === 'VALIDE').length,
    referents: referentsActifs.length,
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-10">

        <PageHeader
          eyebrow={t('nav.groups')}
          title={t('admin.groupsManagement')}
          description={t('admin.groupsDescription', { defaultValue: 'Créez les groupes, attribuez un référent et suivez leur statut.' })}
        />

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <AdminStatCard icon="Users" label={t('common.total', { defaultValue: 'Total' })} value={stats.total} tone="blue" />
          <AdminStatCard icon="Clock" label={t('statuses.EN_ATTENTE', { defaultValue: 'En attente' })} value={stats.enAttente} tone="amber" />
          <AdminStatCard icon="CheckCircle" label={t('statuses.VALIDE', { defaultValue: 'Validés' })} value={stats.valides} tone="green" />
          <AdminStatCard icon="User" label={t('admin.activeReferent')} value={stats.referents} tone="violet" />
        </div>

        {message && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4 text-sm">{message}</div>}
        {error   && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">{error}</div>}

        <SectionCard className="mb-8" title={t('admin.createGroup')} subtitle={t('admin.selectReferent')}>
          <form onSubmit={handleCreateGroupe} className="grid md:grid-cols-2 gap-4">
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
              label="Adresse de réunion"
              value={groupeForm.adresseReunion}
              onChange={value => handleFormChange('adresseReunion', value)}
            />
            <Input
              label="Commune"
              value={groupeForm.commune}
              onChange={value => handleFormChange('commune', value)}
            />
            <Input
              label="Latitude"
              value={groupeForm.latitude}
              onChange={value => handleFormChange('latitude', value)}
              type="number"
              step="any"
            />
            <Input
              label="Longitude"
              value={groupeForm.longitude}
              onChange={value => handleFormChange('longitude', value)}
              type="number"
              step="any"
            />
            <LocationPicker
              address={groupeForm.adresseReunion}
              commune={groupeForm.commune}
              latitude={groupeForm.latitude}
              longitude={groupeForm.longitude}
              onCoordinatesChange={(latitude, longitude) => setGroupeForm(current => ({ ...current, latitude, longitude }))}
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
            <div className="md:col-span-2 flex justify-end">
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
        </SectionCard>

        <SectionCard className="mb-6" title={t('common.filters', { defaultValue: 'Filtres' })}>
          <div className="mb-4 flex flex-wrap gap-3">
            {[
              { id: 'en-attente', label: t('admin.pendingTab'), icon: 'Clock' },
              { id: 'tous',       label: t('admin.allGroupsTab'), icon: 'Users' },
            ].map(o => (
              <button key={o.id} onClick={() => setOnglet(o.id)}
                className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                  onglet === o.id ? 'bg-blue-700 text-white shadow-sm' : 'border border-gray-200 bg-white text-gray-600 hover:border-blue-400'
                }`}>
                <AppIcon name={o.icon} className="h-4 w-4" />
                {o.label}
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
        </SectionCard>

        {loading ? (
          <p className="text-gray-400 text-center py-10">{t('common.loading')}</p>
        ) : groupesFiltres.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl shadow">
            <AppIcon name="Users" className="mx-auto mb-3 h-10 w-10 text-blue-300" />
            <p className="text-gray-400 text-sm">
              {onglet === 'en-attente' ? t('admin.noPendingGroups') : t('admin.noGroups')}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {groupesFiltres.map(g => (
              <div key={g.id} className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
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

                {g.description && <p className="text-gray-600 text-sm mb-3">{g.description}</p>}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs mb-4">
                  {g.theme && <InfoChip>{g.theme}</InfoChip>}
                  {g.categorie && <InfoChip>{g.categorie}</InfoChip>}
                  {(g.adresseReunion || g.commune) && <InfoChip>{[g.adresseReunion, g.commune].filter(Boolean).join(', ')}</InfoChip>}
                  {g.capaciteMax > 0 && <InfoChip>{t('activities.capacity_max', { count: g.capaciteMax })}</InfoChip>}
                  <InfoChip>{new Date(g.dateCreation).toLocaleDateString(i18n.language || 'fr-BE')}</InfoChip>
                </div>

                {g.objectif && (
                  <div className="bg-blue-50 rounded-xl p-3 mb-4 text-sm text-blue-800">
                    <strong>{t('admin.objective')} :</strong> {g.objectif}
                  </div>
                )}

                {g.motifRefus && (
                  <div className="bg-red-50 rounded-xl p-3 mb-4 text-sm text-red-700">
                    <strong>{t('admin.refusalReason')} :</strong> {g.motifRefus}
                  </div>
                )}

                <div className="bg-gray-50 rounded-2xl p-3 mb-4">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{t('admin.assignedReferent')}</label>
                  <select
                    value={g.referentId || ''}
                    onChange={e => handleAssignerReferent(g.id, e.target.value)}
                    disabled={assigningId === g.id || referentsActifs.length === 0}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100"
                  >
                    {g.referentId && !referentsActifs.some(referent => referent.id === g.referentId) && (
                      <option value={g.referentId} disabled>{referentAssigne(g)}</option>
                    )}
                    {referentsActifs.map(referent => (
                      <option key={referent.id} value={referent.id}>{referentLabel(referent)}</option>
                    ))}
                  </select>
                </div>

                {g.statut === 'EN_ATTENTE' && (
                  <div className="flex gap-3">
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
      <Footer />
    </div>
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

function AdminStatCard({ icon, label, value, tone = 'blue' }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700 ring-blue-100',
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    amber: 'bg-amber-50 text-amber-700 ring-amber-100',
    violet: 'bg-violet-50 text-violet-700 ring-violet-100',
  };

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl ring-1 ${tones[tone] || tones.blue}`}>
        <AppIcon name={icon} className="h-5 w-5" />
      </div>
      <p className="text-2xl font-black text-slate-950">{value}</p>
      <p className="mt-1 text-sm font-medium text-slate-500">{label}</p>
    </div>
  );
}
