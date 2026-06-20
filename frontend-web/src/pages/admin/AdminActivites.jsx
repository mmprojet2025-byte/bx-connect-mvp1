import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../api/axios';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import { confirmSensitiveAction, userFriendlyError } from '../../utils/userFriendlyError';
import ActivityCover from '../../components/ActivityCover';
import StatusBadge from '../../components/StatusBadge';
import AppIcon from '../../components/ui/AppIcons';
import PageHeader from '../../components/ui/PageHeader';
import SectionCard from '../../components/ui/SectionCard';
import LocationPicker from '../../components/location/LocationPicker';

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

  useEffect(() => { fetchActivites(); }, []);

  const fetchActivites = async () => {
    try {
      const res = await api.get('/activites/admin/toutes');
      setActivites(res.data);
    } catch (err) {
      setError(userFriendlyError(err, t('admin.error_load')));
    } finally {
      setLoading(false);
    }
  };

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
    try {
      const res = await api.patch(`/activites/${id}/statut?statut=${statut}`);
      setActivites(prev => prev.map(a => a.id === id ? res.data : a));
      setMessage(t('admin.statusUpdatedWithValue', { status: t(`statuses.${statut}`, { defaultValue: statut }) }));
      setError('');
    } catch (err) {
      setError(userFriendlyError(err, t('admin.errorStatusChange')));
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
  const stats = {
    total: activites.length,
    publiees: activites.filter(a => a.statut === 'PUBLIEE').length,
    brouillons: activites.filter(a => a.statut === 'BROUILLON').length,
    gratuites: activites.filter(a => a.gratuite).length,
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-10">
        <PageHeader
          eyebrow={t('nav.activities')}
          title={t('admin.activities_title')}
          description={t('statistics.activitiesTotal', { count: activites.length })}
          action={(
            <button
              type="button"
              onClick={showForm ? resetForm : openCreateForm}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-600"
            >
              <AppIcon name={showForm ? 'XCircle' : 'PlusCircle'} className="h-4 w-4" />
              {showForm ? t('common.cancel') : t('admin.createActivity')}
            </button>
          )}
        />

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <AdminStatCard icon="Calendar" label={t('common.total', { defaultValue: 'Total' })} value={stats.total} tone="blue" />
          <AdminStatCard icon="CheckCircle" label={t('statuses.PUBLIEE', { defaultValue: 'Publiées' })} value={stats.publiees} tone="green" />
          <AdminStatCard icon="Clock" label={t('statuses.BROUILLON', { defaultValue: 'Brouillons' })} value={stats.brouillons} tone="amber" />
          <AdminStatCard icon="Wallet" label={t('activities.free', { defaultValue: 'Gratuites' })} value={stats.gratuites} tone="violet" />
        </div>

        {message && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4 text-sm">{message}</div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">{error}</div>
        )}

        {showForm && (
          <form onSubmit={enregistrerActivite} className="mb-6 grid rounded-3xl border border-slate-100 bg-white p-5 shadow-sm md:grid-cols-2 gap-4">
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
            <details className="md:col-span-2 rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <summary className="cursor-pointer text-sm font-bold text-blue-900">
                Localisation avancée
              </summary>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Input label="Adresse" value={form.adresse} onChange={value => setForm({ ...form, adresse: value })} />
                <Input label="Commune" value={form.commune} onChange={value => setForm({ ...form, commune: value })} />
                <Input label="Latitude" type="number" step="any" value={form.latitude} onChange={value => setForm({ ...form, latitude: value })} />
                <Input label="Longitude" type="number" step="any" value={form.longitude} onChange={value => setForm({ ...form, longitude: value })} />
                <LocationPicker
                  address={form.adresse}
                  commune={form.commune}
                  latitude={form.latitude}
                  longitude={form.longitude}
                  onCoordinatesChange={(latitude, longitude) => setForm(current => ({ ...current, latitude, longitude }))}
                />
              </div>
            </details>
            <details className="md:col-span-2 rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <summary className="cursor-pointer text-sm font-bold text-blue-900">
                Paramètres avancés
              </summary>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
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
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:bg-gray-300"
              >
                <AppIcon name={editingId ? 'Save' : 'PlusCircle'} className="h-4 w-4" />
                {creating ? t('common.saving') : editingId ? t('common.saveChanges') : t('admin.createActivity')}
              </button>
            </div>
          </form>
        )}

        <SectionCard className="mb-6" title={t('common.filters', { defaultValue: 'Filtres' })}>
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
        </SectionCard>

        {loading ? (
          <p className="text-gray-400 text-center py-10">{t('admin.loading')}</p>
        ) : (
          <>
            <div className="md:hidden space-y-4">
              {activitesFiltrees.length === 0 ? (
                <div className="bg-white rounded-2xl shadow p-8 text-center text-gray-400 text-sm">{t('activities.no_search_results')}</div>
              ) : (
                activitesFiltrees.map(a => (
                  <article key={a.id} className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
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
                      <InfoLine label={t('admin.creator')} value={`${a.createurPrenom || ''} ${a.createurNom || ''}`.trim() || '—'} />
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <p className="text-xs text-gray-400">{t('users.status')}</p>
                          <StatusBadge status={a.statut}>{t(`statuses.${a.statut}`, { defaultValue: a.statut })}</StatusBadge>
                        </div>
                        <select
                          value={a.statut}
                          onChange={e => changerStatut(a.id, e.target.value)}
                          className="w-full text-xs px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
                          style={{ background: statutColor(a.statut), color: '#fff' }}
                        >
                          {STATUTS.map(s => (
                            <option key={s} value={s} style={{ background: '#fff', color: '#333' }}>{t(`statuses.${s}`, { defaultValue: s })}</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-2">
                        <button
                          onClick={() => modifierActivite(a)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-100 px-3 py-2 text-xs font-medium text-blue-700 transition hover:bg-blue-200"
                        >
                          <AppIcon name="Edit" className="h-3.5 w-3.5" />
                          {t('common.edit')}
                        </button>
                        <button
                          onClick={() => supprimerActivite(a.id, a.titre)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-red-100 px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-200"
                        >
                          <AppIcon name="XCircle" className="h-3.5 w-3.5" />
                          {t('common.delete')}
                        </button>
                      </div>
                    </div>
                    </div>
                  </article>
                ))
              )}
            </div>

            <div className="hidden overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm md:block">
              <div className="overflow-x-auto">
              <table className="w-full border-collapse" style={{ minWidth: '700px' }}>
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{t('admin.titleLabel')}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{t('activities.form_place')}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{t('activities.start_date')}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{t('admin.creator')}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{t('users.status')}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{t('users.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {activitesFiltrees.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-gray-400 text-sm">{t('activities.no_search_results')}</td>
                    </tr>
                  ) : (
                    activitesFiltrees.map((a, i) => (
                      <tr key={a.id} className={`border-b border-gray-50 transition hover:bg-blue-50/50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                        <td className="px-4 py-3">
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
                        <td className="px-4 py-3 text-sm text-gray-600">{a.lieu || '—'}</td>
                        <td className="px-4 py-3 text-xs text-gray-400">
                          {a.dateDebut ? new Date(a.dateDebut).toLocaleDateString(i18n.language) : '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{a.createurPrenom} {a.createurNom}</td>
                        <td className="px-4 py-3">
                          <select
                            value={a.statut}
                            onChange={e => changerStatut(a.id, e.target.value)}
                            className="text-xs px-2 py-1 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
                            style={{ background: statutColor(a.statut), color: '#fff' }}
                          >
                            {STATUTS.map(s => (
                              <option key={s} value={s} style={{ background: '#fff', color: '#333' }}>{t(`statuses.${s}`, { defaultValue: s })}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => modifierActivite(a)}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-100 px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-200"
                            >
                              <AppIcon name="Edit" className="h-3.5 w-3.5" />
                              {t('common.edit')}
                            </button>
                            <button
                              onClick={() => supprimerActivite(a.id, a.titre)}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-200"
                            >
                              <AppIcon name="XCircle" className="h-3.5 w-3.5" />
                              {t('common.delete')}
                            </button>
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

      <Footer />
    </div>
  );
}

function toDateTimeLocalValue(value) {
  if (!value) return '';
  return String(value).slice(0, 16);
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

function statutColor(statut) {
  switch (statut) {
    case 'PUBLIEE':  return '#28a745';
    case 'ANNULEE':  return '#dc3545';
    case 'TERMINEE': return '#6c757d';
    default:         return '#ffc107';
  }
}
