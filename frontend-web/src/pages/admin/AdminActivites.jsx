import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../api/axios';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import { confirmSensitiveAction, userFriendlyError } from '../../utils/userFriendlyError';

const STATUTS = ['BROUILLON', 'PUBLIEE', 'ANNULEE', 'TERMINEE'];
const emptyForm = {
  titre: '',
  description: '',
  dateDebut: '',
  dateFin: '',
  lieu: '',
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
    return matchRecherche && matchStatut;
  });

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-blue-900 mb-1">🎯 {t('admin.activities_title')}</h1>
            <p className="text-gray-500 text-sm">{t('statistics.activitiesTotal', { count: activites.length })}</p>
          </div>
          <button
            type="button"
            onClick={showForm ? resetForm : openCreateForm}
            className="bg-blue-700 hover:bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition"
          >
            {showForm ? t('common.cancel') : t('admin.createActivity')}
          </button>
        </div>

        {message && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4 text-sm">{message}</div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">{error}</div>
        )}

        {showForm && (
          <form onSubmit={enregistrerActivite} className="bg-white rounded-2xl shadow p-5 mb-6 grid md:grid-cols-2 gap-4">
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
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">{t('activities.form_description')}</label>
              <textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                rows={3}
                className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
              />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={creating}
                className="bg-blue-700 hover:bg-blue-600 disabled:bg-gray-300 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition"
              >
                {creating ? t('common.saving') : editingId ? t('common.saveChanges') : t('admin.createActivity')}
              </button>
            </div>
          </form>
        )}

        {/* Filtres */}
        <div className="flex gap-3 mb-6 flex-wrap">
          <input
            type="text"
            placeholder={t('admin.searchActivityPlaceholder')}
            value={recherche}
            onChange={e => { setRecherche(e.target.value); setMessage(''); setError(''); }}
            className="flex-1 min-w-48 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <select
            value={filtreStatut}
            onChange={e => setFiltreStatut(e.target.value)}
            className="border border-gray-300 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="">{t('common.all_statuses')}</option>
            {STATUTS.map(s => <option key={s} value={s}>{t(`statuses.${s}`, { defaultValue: s })}</option>)}
          </select>
        </div>

        {loading ? (
          <p className="text-gray-400 text-center py-10">{t('admin.loading')}</p>
        ) : (
          <div className="bg-white rounded-2xl shadow overflow-hidden">
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
                      <tr key={a.id} className={`border-b border-gray-50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                        <td className="px-4 py-3">
                          <span className="font-medium text-blue-900 text-sm">{a.titre}</span>
                          {a.gratuite
                            ? <span className="ml-2 text-xs text-green-600">🆓</span>
                            : <span className="ml-2 text-xs text-orange-500">💶 {a.prix}€</span>
                          }
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
                              className="text-xs px-3 py-1 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 font-medium transition"
                            >
                              {t('common.edit')}
                            </button>
                            <button
                              onClick={() => supprimerActivite(a.id, a.titre)}
                              className="text-xs px-3 py-1 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 font-medium transition"
                            >
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

function Input({ label, value, onChange, type = 'text', required = false, min }) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-gray-700 mb-1">{label}</span>
      <input
        type={type}
        min={min}
        required={required}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
    </label>
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
