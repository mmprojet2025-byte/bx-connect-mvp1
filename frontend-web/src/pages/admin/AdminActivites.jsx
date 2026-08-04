import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../api/axios';
import Navbar from '../../components/Navbar';
import { confirmSensitiveAction, userFriendlyError } from '../../utils/userFriendlyError';
import ActivityCover from '../../components/ActivityCover';
import StatusBadge from '../../components/StatusBadge';
import AppIcon from '../../components/ui/AppIcons';
import PageHeader from '../../components/ui/PageHeader';
import LocationPicker from '../../components/location/LocationPicker';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import LoadingState from '../../components/ui/LoadingState';

const STATUTS = ['BROUILLON', 'PUBLIEE', 'ANNULEE', 'TERMINEE'];
const emptyForm = {
  titre: '',
  description: '',
  dateDebut: '',
  dateFin: '',
  lieu: '',
  adresse: '',
  commune: '',
  latitude: '',
  longitude: '',
  gratuite: true,
  prix: '',
  capaciteMax: 0,
  categorie: '',
  theme: '',
};

async function fetchActivites({ t, setActivites, setError, setLoading }) {
  try {
    const res = await api.get('/activites/admin/toutes');
    setActivites(res.data);
  } catch (err) {
    setError(userFriendlyError(err, t('admin.error_load')));
  } finally {
    setLoading(false);
  }
}

export default function AdminActivites() {
  const { t, i18n } = useTranslation();
  const [activites, setActivites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [recherche, setRecherche] = useState('');
  const [filtreStatut, setFiltreStatut] = useState('');
  const [filtreCategorie, setFiltreCategorie] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [selectedActivity, setSelectedActivity] = useState(null);

  useEffect(() => {
    fetchActivites({ t, setActivites, setError, setLoading });
  }, [t]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  };

  const openCreateForm = () => {
    setMessage('');
    setError('');
    if (showForm && !editingId) {
      resetForm();
      return;
    }
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  };

  const modifierActivite = (activite) => {
    setMessage('');
    setError('');
    setEditingId(activite.id);
    setForm({
      titre: activite.titre || '',
      description: activite.description || '',
      dateDebut: toDateTimeLocalValue(activite.dateDebut),
      dateFin: toDateTimeLocalValue(activite.dateFin),
      lieu: activite.lieu || '',
      adresse: activite.adresse || '',
      commune: activite.commune || '',
      latitude: activite.latitude ?? '',
      longitude: activite.longitude ?? '',
      gratuite: activite.gratuite ?? true,
      prix: activite.prix ?? '',
      capaciteMax: activite.capaciteMax ?? 0,
      categorie: activite.categorie || '',
      theme: activite.theme || '',
    });
    setShowForm(true);
  };

  const enregistrerActivite = async (e) => {
    e.preventDefault();
    setCreating(true);
    setMessage('');
    setError('');
    const payload = {
      ...form,
      prix: form.gratuite ? null : Number(form.prix),
      capaciteMax: Number(form.capaciteMax) || 0,
      latitude: form.latitude === '' ? null : Number(form.latitude),
      longitude: form.longitude === '' ? null : Number(form.longitude),
    };
    try {
      if (editingId) {
        const res = await api.put(`/activites/${editingId}`, payload);
        setActivites(prev => prev.map(a => a.id === editingId ? res.data : a));
        setMessage(t('admin.activityUpdated'));
      } else {
        const res = await api.post('/activites', payload);
        setActivites(prev => [res.data, ...prev]);
        setMessage(t('activities.success_create'));
      }
      resetForm();
    } catch (err) {
      setError(userFriendlyError(err, editingId ? t('admin.errorActivityUpdate') : t('activities.error_create')));
    } finally {
      setCreating(false);
    }
  };

  const changerStatut = async (id, statut) => {
    if (!confirmSensitiveAction(t('admin.confirmActivityStatusChange', {
      status: t(`statuses.${statut}`, { defaultValue: statut }),
    }))) return;
    try {
      const res = await api.patch(`/activites/${id}/statut?statut=${statut}`);
      setActivites(prev => prev.map(a => a.id === id ? res.data : a));
      setMessage(t('admin.statusUpdatedWithValue', { status: t(`statuses.${statut}`, { defaultValue: statut }) }));
      setError('');
      return res.data;
    } catch (err) {
      setError(userFriendlyError(err, t('admin.errorStatusChange')));
      return null;
    }
  };

  const supprimerActivite = async (id, titre) => {
    if (!confirmSensitiveAction(t('admin.confirmDeleteActivity', { title: titre }))) return;
    try {
      await api.delete(`/activites/${id}`);
      setActivites(prev => prev.filter(a => a.id !== id));
      setMessage(t('admin.activityDeleted'));
      setError('');
    } catch (err) {
      setError(userFriendlyError(err, t('admin.errorDelete')));
    }
  };

  const activitesFiltrees = activites.filter(a => {
    const matchRecherche = a.titre?.toLowerCase().includes(recherche.toLowerCase()) ||
      a.lieu?.toLowerCase().includes(recherche.toLowerCase());
    const matchStatut = filtreStatut ? a.statut === filtreStatut : true;
    const matchCategorie = filtreCategorie ? a.categorie === filtreCategorie : true;
    return matchRecherche && matchStatut && matchCategorie;
  });
  const categories = [...new Set(activites.map(a => a.categorie).filter(Boolean))];
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        <PageHeader
          eyebrow={t('nav.activities')}
          title={t('admin.activities_title')}
          description={t('statistics.activitiesTotal', { count: activites.length })}
          action={(
            <button
              type="button"
              onClick={showForm ? resetForm : openCreateForm}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-600"
            >
              <AppIcon name={showForm ? 'XCircle' : 'PlusCircle'} className="h-4 w-4" />
              {showForm ? t('common.cancel') : t('admin.createActivity')}
            </button>
          )}
        />

        {message && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4 text-sm">{message}</div>
        )}
        {error && activites.length > 0 && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">{error}</div>
        )}

        {showForm && (
          <form onSubmit={enregistrerActivite} className="mb-4 grid rounded-2xl border border-slate-100 bg-white p-4 shadow-sm md:grid-cols-2 gap-3">
            <div className="md:col-span-2 flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-blue-900">
                {editingId ? t('common.edit') : t('admin.createActivity')}
              </h2>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-sm font-semibold text-gray-600 hover:text-gray-900"
                >
                  {t('common.cancelEdit')}
                </button>
              )}
            </div>
            <Input label={t('activities.form_title')} value={form.titre} onChange={value => setForm({ ...form, titre: value })} required />
            <Input label={t('activities.form_place')} value={form.lieu} onChange={value => setForm({ ...form, lieu: value })} />
            <Input label={t('activities.form_start')} type="datetime-local" value={form.dateDebut} onChange={value => setForm({ ...form, dateDebut: value })} required />
            <Input label={t('activities.form_end')} type="datetime-local" value={form.dateFin} onChange={value => setForm({ ...form, dateFin: value })} required />
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">{t('activities.form_description')}</label>
              <textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                rows={3}
                className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
              />
            </div>
            <details className="md:col-span-2 rounded-xl border border-slate-100 bg-slate-50 p-3">
              <summary className="cursor-pointer text-xs font-black uppercase tracking-wide text-slate-500">
                {t('admin.advancedLocation')}
              </summary>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <Input label={t('admin.address')} value={form.adresse} onChange={value => setForm({ ...form, adresse: value })} />
                <Input label={t('admin.commune')} value={form.commune} onChange={value => setForm({ ...form, commune: value })} />
                <Input label={t('admin.latitude')} type="number" step="any" value={form.latitude} onChange={value => setForm({ ...form, latitude: value })} />
                <Input label={t('admin.longitude')} type="number" step="any" value={form.longitude} onChange={value => setForm({ ...form, longitude: value })} />
                <LocationPicker
                  address={form.adresse}
                  commune={form.commune}
                  latitude={form.latitude}
                  longitude={form.longitude}
                  onCoordinatesChange={(latitude, longitude) => setForm(current => ({ ...current, latitude, longitude }))}
                />
              </div>
            </details>
            <details className="md:col-span-2 rounded-xl border border-slate-100 bg-slate-50 p-3">
              <summary className="cursor-pointer text-xs font-black uppercase tracking-wide text-slate-500">
                {t('admin.advancedSettings')}
              </summary>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <Input label={t('activities.form_category')} value={form.categorie} onChange={value => setForm({ ...form, categorie: value })} />
                <Input label={t('activities.form_theme')} value={form.theme} onChange={value => setForm({ ...form, theme: value })} />
                <Input label={t('admin.maxCapacity')} type="number" min="0" value={form.capaciteMax} onChange={value => setForm({ ...form, capaciteMax: value })} />
                <label className="flex items-center gap-2 text-sm text-gray-700 pt-7">
                  <input type="checkbox" checked={form.gratuite} onChange={e => setForm({ ...form, gratuite: e.target.checked })} />
                  {t('activities.form_free')}
                </label>
                {!form.gratuite && (
                  <Input label={t('activities.form_price')} type="number" min="0" value={form.prix} onChange={value => setForm({ ...form, prix: value })} />
                )}
              </div>
            </details>
            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={creating}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:bg-gray-300"
              >
                <AppIcon name={editingId ? 'Save' : 'PlusCircle'} className="h-4 w-4" />
                {creating ? t('common.saving') : editingId ? t('common.saveChanges') : t('admin.createActivity')}
              </button>
            </div>
          </form>
        )}

        <section className="mb-4 rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
          <div className="grid gap-3 md:grid-cols-[1fr_220px_220px]">
            <label className="relative block">
              <AppIcon name="Search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={t('admin.searchActivityPlaceholder')}
                value={recherche}
                onChange={e => { setRecherche(e.target.value); setMessage(''); setError(''); }}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </label>
            <select
              value={filtreStatut}
              onChange={e => setFiltreStatut(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">{t('common.all_statuses')}</option>
              {STATUTS.map(s => <option key={s} value={s}>{t(`statuses.${s}`, { defaultValue: s })}</option>)}
            </select>
            <select
              value={filtreCategorie}
              onChange={e => setFiltreCategorie(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">{t('activities.form_category')}</option>
              {categories.map(categorie => <option key={categorie} value={categorie}>{categorie}</option>)}
            </select>
          </div>
        </section>

        {loading ? (
          <LoadingState label={t('admin.loading')} />
        ) : error && activites.length === 0 ? (
          <ErrorState
            title={t('common.loadErrorTitle')}
            description={error}
            actionLabel={t('common.retry')}
            action={() => fetchActivites({ t, setActivites, setError, setLoading })}
          />
        ) : activites.length === 0 ? (
          <EmptyState
            icon="Calendar"
            title={t('activities.no_activities', { defaultValue: t('activities.no_activities') })}
            description={t('activities.empty_description')}
          />
        ) : (
          <>
            <div className="md:hidden space-y-4">
              {activitesFiltrees.length === 0 ? (
                <EmptyState icon="Search" title={t('activities.no_search_results')} />
              ) : (
                activitesFiltrees.map(a => (
                  <article key={a.id} className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
                    <ActivityCover
                      imageUrl={a.imageUrl}
                      title={a.titre}
                      categorie={a.categorie}
                      theme={a.theme}
                      className="h-32"
                    />
                    <div className="p-5">
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="min-w-0">
                        <h2 className="font-semibold text-blue-900 text-sm">{a.titre}</h2>
                        <p className="text-xs text-gray-500 mt-1">
                          {a.dateDebut ? new Date(a.dateDebut).toLocaleDateString(i18n.language) : '—'}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-gray-500">
                        {a.gratuite ? t('activities.free') : `${a.prix}€`}
                      </span>
                    </div>

                    <div className="grid gap-3 text-sm">
                      <InfoLine label={t('admin.responsible')} value={activityResponsible(a, t)} />
                      {participationLabel(a, t) && (
                        <InfoLine label={t('admin.participation')} value={participationLabel(a, t)} />
                      )}
                      <InfoLine label={t('admin.followUp')} value={activityFollowUp(a, t).label} />
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <p className="text-xs text-gray-400">{t('users.status')}</p>
                          <StatusBadge status={a.statut}>{t(`statuses.${a.statut}`, { defaultValue: a.statut })}</StatusBadge>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-2">
                        <button
                          onClick={() => modifierActivite(a)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-100 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-200"
                        >
                          <AppIcon name="Edit" className="h-3.5 w-3.5" />
                          {t('common.edit')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedActivity(a)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
                        >
                          <AppIcon name="Eye" className="h-3.5 w-3.5" />
                          {t('common.details')}
                        </button>
                        <Link
                          to={`/admin/activites/${a.id}/presences`}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
                        >
                          <AppIcon name="ClipboardList" className="h-3.5 w-3.5" />
                          {t('presence.title')}
                        </Link>
                        <details className="relative">
                          <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-200">
                            <AppIcon name="Settings" className="h-3.5 w-3.5" />
                            {t('common.more')}
                          </summary>
                          <div className="absolute right-0 z-20 mt-2 w-44 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                            <label className="mb-2 block px-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                              {t('users.status')}
                              <select
                                value={a.statut}
                                onChange={e => changerStatut(a.id, e.target.value)}
                                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                              >
                                {STATUTS.map(s => (
                                  <option key={s} value={s}>{t(`statuses.${s}`, { defaultValue: s })}</option>
                                ))}
                              </select>
                            </label>
                            <button
                              type="button"
                              onClick={() => supprimerActivite(a.id, a.titre)}
                              className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-xs font-medium text-red-700 transition hover:bg-red-50"
                            >
                              <AppIcon name="XCircle" className="h-3.5 w-3.5" />
                              {t('common.delete')}
                            </button>
                          </div>
                        </details>
                      </div>
                    </div>
                    </div>
                  </article>
                ))
              )}
            </div>

            <div className="hidden overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm md:block">
              <div className="overflow-x-auto">
              <table className="w-full border-collapse" style={{ minWidth: '980px' }}>
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">{t('admin.titleLabel')}</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">{t('activities.form_place')}</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">{t('activities.start_date')}</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">{t('admin.responsible')}</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">{t('admin.participation')}</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">{t('admin.followUp')}</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">{t('users.status')}</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">{t('users.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {activitesFiltrees.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-10 text-gray-400 text-sm">{t('activities.no_search_results')}</td>
                    </tr>
                  ) : (
                    activitesFiltrees.map((a, i) => (
                      <tr key={a.id} className={`border-b border-gray-50 transition hover:bg-blue-50/50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-16 shrink-0 overflow-hidden rounded-xl">
                              <ActivityCover
                                imageUrl={a.imageUrl}
                                title={a.titre}
                                categorie={a.categorie}
                                theme={a.theme}
                                className="h-12"
                              />
                            </div>
                            <div>
                              <span className="font-medium text-blue-900 text-sm">{a.titre}</span>
                              {a.gratuite
                                ? <span className="ml-2 inline-flex items-center gap-1 text-xs text-green-600"><AppIcon name="CheckCircle" className="h-3.5 w-3.5" />{t('activities.free')}</span>
                                : <span className="ml-2 inline-flex items-center gap-1 text-xs text-orange-500"><AppIcon name="Wallet" className="h-3.5 w-3.5" />{a.prix}€</span>
                              }
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-600">{a.lieu || '—'}</td>
                        <td className="px-3 py-2 text-xs text-gray-400">
                          {a.dateDebut ? new Date(a.dateDebut).toLocaleDateString(i18n.language) : '—'}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-600">{activityResponsible(a, t)}</td>
                        <td className="px-3 py-2 text-sm font-semibold text-slate-600">{participationLabel(a, t) || '—'}</td>
                        <td className="px-3 py-2">
                          <FollowUpBadge followUp={activityFollowUp(a, t)} />
                        </td>
                        <td className="px-3 py-2">
                          <StatusBadge status={a.statut}>{t(`statuses.${a.statut}`, { defaultValue: a.statut })}</StatusBadge>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => modifierActivite(a)}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-100 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-200"
                            >
                              <AppIcon name="Edit" className="h-3.5 w-3.5" />
                              {t('common.edit')}
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedActivity(a)}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
                            >
                              <AppIcon name="Eye" className="h-3.5 w-3.5" />
                              {t('common.details')}
                            </button>
                            <Link
                              to={`/admin/activites/${a.id}/presences`}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
                            >
                              <AppIcon name="ClipboardList" className="h-3.5 w-3.5" />
                              {t('presence.title')}
                            </Link>
                            <details className="relative">
                              <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-200">
                                <AppIcon name="Settings" className="h-3.5 w-3.5" />
                                {t('common.more')}
                              </summary>
                              <div className="absolute right-0 z-20 mt-2 w-44 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                                <label className="mb-2 block px-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                                  {t('users.status')}
                                  <select
                                    value={a.statut}
                                    onChange={e => changerStatut(a.id, e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                  >
                                    {STATUTS.map(s => (
                                      <option key={s} value={s}>{t(`statuses.${s}`, { defaultValue: s })}</option>
                                    ))}
                                  </select>
                                </label>
                                <button
                                  type="button"
                                  onClick={() => supprimerActivite(a.id, a.titre)}
                                  className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-xs font-medium text-red-700 transition hover:bg-red-50"
                                >
                                  <AppIcon name="XCircle" className="h-3.5 w-3.5" />
                                  {t('common.delete')}
                                </button>
                              </div>
                            </details>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              </div>
            </div>
          </>
        )}
      </main>

      {selectedActivity && (
        <ActivityFollowUpDrawer
          activity={selectedActivity}
          t={t}
          language={i18n.language}
          onClose={() => setSelectedActivity(null)}
          onEdit={() => {
            modifierActivite(selectedActivity);
            setSelectedActivity(null);
          }}
          onStatusChange={async (id, statut) => {
            const updated = await changerStatut(id, statut);
            if (updated) setSelectedActivity(updated);
          }}
          onDelete={async (id, titre) => {
            await supprimerActivite(id, titre);
            setSelectedActivity(null);
          }}
        />
      )}
    </div>
  );
}

function toDateTimeLocalValue(value) {
  if (!value) return '';
  return String(value).slice(0, 16);
}

function ActivityFollowUpDrawer({ activity, t, language, onClose, onEdit, onStatusChange, onDelete }) {
  const followUp = activityFollowUp(activity, t);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/30 p-3 backdrop-blur-sm">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label={t('common.close')}
        onClick={onClose}
      />
      <aside className="relative flex h-full w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="shrink-0 border-b border-slate-100 bg-gradient-to-r from-blue-50 via-white to-emerald-50 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-wide text-blue-700">{t('admin.activityFollowUpSheet')}</p>
              <h2 className="mt-1 truncate text-xl font-black text-slate-950">{activity.titre}</h2>
              <p className="mt-1 text-sm text-slate-500">{formatActivityDate(activity.dateDebut, language)} · {activity.lieu || t('admin.notSpecified')}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 transition hover:bg-white hover:text-slate-700"
              aria-label={t('common.close')}
            >
              <AppIcon name="XCircle" className="h-5 w-5" />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="mb-4 grid grid-cols-2 gap-2">
            <DrawerMetric label={t('admin.responsible')} value={activityResponsible(activity, t)} icon="User" />
            <DrawerMetric label={t('users.status')} value={t(`statuses.${activity.statut}`, { defaultValue: activity.statut })} icon="CheckCircle" />
            <DrawerMetric label={t('admin.participation')} value={participationLabel(activity, t) || '—'} icon="Users" />
            <DrawerMetric label={t('admin.followUp')} value={followUp.label} icon="ClipboardList" />
          </div>

          <DrawerSection title={t('admin.activityFollowUp')} icon="ClipboardList">
            <div className="space-y-2 text-sm text-slate-600">
              <SummaryLine>{t('admin.activityDateLine', { date: formatActivityDate(activity.dateDebut, language) })}</SummaryLine>
              <SummaryLine>{t('admin.activityPlaceLine', { place: activity.lieu || t('admin.notSpecified') })}</SummaryLine>
            </div>
          </DrawerSection>

          <DrawerSection title={t('admin.availableActions')} icon="Settings">
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={onEdit}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
              >
                <AppIcon name="Edit" className="h-4 w-4" />
                {t('common.edit')}
              </button>
              <Link
                to={`/admin/activites/${activity.id}/presences`}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                <AppIcon name="ClipboardList" className="h-4 w-4" />
                {t('presence.title')}
              </Link>
            </div>
            <details className="mt-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
              <summary className="cursor-pointer text-xs font-black uppercase tracking-wide text-slate-500">
                {t('common.more')}
              </summary>
              <div className="mt-3 grid gap-2">
                <label className="text-xs font-semibold text-slate-500">
                  {t('users.status')}
                  <select
                    value={activity.statut}
                    onChange={e => onStatusChange(activity.id, e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    {STATUTS.map(s => (
                      <option key={s} value={s}>{t(`statuses.${s}`, { defaultValue: s })}</option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() => onDelete(activity.id, activity.titre)}
                  className="inline-flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                >
                  <AppIcon name="XCircle" className="h-4 w-4" />
                  {t('common.delete')}
                </button>
              </div>
            </details>
          </DrawerSection>
        </div>
      </aside>
    </div>
  )
}

function DrawerMetric({ label, value, icon }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
      <AppIcon name={icon} className="mb-1 h-4 w-4 text-blue-700" />
      <p className="truncate text-sm font-black text-slate-950">{value}</p>
      <p className="truncate text-[11px] font-semibold text-slate-500">{label}</p>
    </div>
  )
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
  )
}

function SummaryLine({ children }) {
  return (
    <p className="flex items-center gap-2">
      <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
      <span>{children}</span>
    </p>
  )
}

function activityResponsible(activity, t) {
  const name = `${activity.createurPrenom || ''} ${activity.createurNom || ''}`.trim() || activity.createurEmail || '—'
  const role = activity.createurRole || activity.roleCreateur || activity.createur?.role
  return role ? `${name} · ${t(`roles.${role}`, { defaultValue: role })}` : name
}

function participationLabel(activity, t) {
  const registered = Number(activity.nombreInscrits ?? activity.nombreParticipants ?? activity.inscriptionsCount)
  if (!Number.isFinite(registered)) return ''
  const capacity = Number(activity.capaciteMax)
  if (Number.isFinite(capacity) && capacity > 0) return t('admin.registeredOverCapacity', { registered, capacity })
  return t('admin.registeredCount', { count: registered })
}

function activityFollowUp(activity, t) {
  const status = activity.statut
  if (status === 'BROUILLON') return followUpResult(t('admin.activityFollowUpStates.toReview'), 'bg-amber-50 text-amber-700')
  if (status === 'ANNULEE') return followUpResult(t('admin.activityFollowUpStates.cancelled'), 'bg-red-50 text-red-700')
  if (status === 'TERMINEE') return followUpResult(t('admin.activityFollowUpStates.finished'), 'bg-slate-50 text-slate-700')
  if (isPastActivity(activity)) return followUpResult(t('admin.activityFollowUpStates.toClose'), 'bg-orange-50 text-orange-700')
  const registered = Number(activity.nombreInscrits ?? activity.nombreParticipants ?? activity.inscriptionsCount)
  if (Number.isFinite(registered) && registered === 0) return followUpResult(t('admin.activityFollowUpStates.toPromote'), 'bg-cyan-50 text-cyan-700')
  return followUpResult(t('admin.activityFollowUpStates.ok'), 'bg-emerald-50 text-emerald-700')
}

function followUpResult(label, toneClass) {
  return { label, toneClass }
}

function FollowUpBadge({ followUp }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${followUp.toneClass}`}>
      {followUp.label}
    </span>
  )
}

function isPastActivity(activity) {
  const date = activity.dateFin || activity.dateDebut
  if (!date) return false
  return new Date(date).getTime() < Date.now()
}

function formatActivityDate(value, language) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString(language || 'fr-BE', { day: '2-digit', month: 'short', year: 'numeric' })
}

function Input({ label, value, onChange, type = 'text', required = false, min, step }) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-gray-700 mb-1">{label}</span>
      <input
        type={type}
        min={min}
        step={step}
        required={required}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
    </label>
  );
}

function InfoLine({ label, value }) {
  return (
    <div className="flex justify-between gap-4 text-xs">
      <span className="text-gray-400">{label}</span>
      <span className="font-medium text-gray-700 text-right">{value}</span>
    </div>
  );
}
