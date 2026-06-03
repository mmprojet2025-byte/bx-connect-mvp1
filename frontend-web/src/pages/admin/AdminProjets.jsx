import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../api/axios';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';

const STATUTS = ['BROUILLON', 'SOUMIS', 'APPROUVE', 'EN_COURS', 'TERMINE', 'REJETE'];
const emptyForm = { titre: '', description: '', budgetDemande: '' };

export default function AdminProjets() {
  const { t } = useTranslation();
  const [projets, setProjets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [recherche, setRecherche] = useState('');
  const [filtreStatut, setFiltreStatut] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => { fetchProjets(); }, []);

  const fetchProjets = async () => {
    try {
      const res = await api.get('/projets/admin/tous');
      setProjets(res.data);
    } catch {
      setError(t('admin.error_load'));
    } finally {
      setLoading(false);
    }
  };

  const creerProjet = async (e) => {
    e.preventDefault();
    setCreating(true);
    setMessage('');
    setError('');
    try {
      const res = await api.post('/projets', {
        ...form,
        budgetDemande: parseFloat(form.budgetDemande) || 0,
      });
      setProjets(prev => [res.data, ...prev]);
      setForm(emptyForm);
      setShowForm(false);
      setMessage(t('admin.projectCreated'));
    } catch (err) {
      setError(formatApiError(err, t, t('admin.errorProjectCreate')));
    } finally {
      setCreating(false);
    }
  };

  const changerStatut = async (id, statut) => {
    try {
      const res = await api.patch(`/projets/${id}/statut?statut=${statut}`);
      setProjets(prev => prev.map(p => p.id === id ? res.data : p));
      setMessage(t('admin.statusUpdatedWithValue', { status: t(`statuses.${statut}`, statut) }));
      setError('');
    } catch {
      setError(t('admin.errorStatusChange'));
    }
  };

  const supprimerProjet = async (id, titre) => {
    if (!window.confirm(t('admin.confirmDeleteProject', { title: titre }))) return;
    try {
      await api.delete(`/projets/${id}`);
      setProjets(prev => prev.filter(p => p.id !== id));
      setMessage(t('admin.projectDeleted'));
      setError('');
    } catch {
      setError(t('admin.errorDelete'));
    }
  };

  const projetsFiltres = projets.filter(p => {
    const matchRecherche = p.titre?.toLowerCase().includes(recherche.toLowerCase());
    const matchStatut = filtreStatut ? p.statut === filtreStatut : true;
    return matchRecherche && matchStatut;
  });

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-blue-900 mb-1">🚀 {t('admin.projects_title')}</h1>
            <p className="text-gray-500 text-sm">{t('statistics.projectsTotal', { count: projets.length })}</p>
          </div>
          <button
            type="button"
            onClick={() => setShowForm(prev => !prev)}
            className="bg-blue-700 hover:bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition"
          >
            {showForm ? t('common.cancel') : t('admin.createProject')}
          </button>
        </div>

        {message && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4 text-sm">{message}</div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">{error}</div>
        )}

        {showForm && (
          <form onSubmit={creerProjet} className="bg-white rounded-2xl shadow p-5 mb-6 grid md:grid-cols-2 gap-4">
            <Input label={t('projects.form_title')} value={form.titre} onChange={value => setForm({ ...form, titre: value })} required />
            <Input label={t('projects.form_budget')} value={form.budgetDemande} onChange={value => setForm({ ...form, budgetDemande: value })} type="number" min="0" />
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">{t('projects.form_description')}</label>
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
                {creating ? t('common.creating') : t('admin.createProject')}
              </button>
            </div>
          </form>
        )}

        {/* Badges statuts */}
        <div className="flex flex-wrap gap-2 mb-6">
          {STATUTS.map(s => {
            const count = projets.filter(p => p.statut === s).length;
            return (
              <button
                key={s}
                onClick={() => setFiltreStatut(filtreStatut === s ? '' : s)}
                className="text-xs px-3 py-1 rounded-full font-semibold border-2 transition"
                style={{
                  background: filtreStatut === s ? statutColor(s) : '#F0F4F8',
                  color: filtreStatut === s ? '#fff' : '#4A6A8A',
                  borderColor: statutColor(s),
                }}
              >
                {t(`statuses.${s}`, s)} ({count})
              </button>
            );
          })}
        </div>

        {/* Recherche */}
        <input
          type="text"
          placeholder={t('admin.searchProjectPlaceholder')}
          value={recherche}
          onChange={e => { setRecherche(e.target.value); setMessage(''); setError(''); }}
          className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm mb-6 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />

        {loading ? (
          <p className="text-gray-400 text-center py-10">{t('common.loading')}</p>
        ) : projetsFiltres.length === 0 ? (
          <div className="bg-white rounded-2xl shadow p-10 text-center text-gray-400 text-sm">
            {t('admin.noProjectFound')}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {projetsFiltres.map(p => (
              <div
                key={p.id}
                className="bg-white rounded-2xl shadow overflow-hidden"
                style={{ borderTop: `4px solid ${statutColor(p.statut)}` }}
              >
                <div className="p-5">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold text-blue-900 text-sm leading-tight">{p.titre}</h3>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full text-white ml-2 whitespace-nowrap"
                      style={{ background: statutColor(p.statut) }}
                    >
                      {t(`statuses.${p.statut}`, p.statut)}
                    </span>
                  </div>

                  {p.description && (
                    <p className="text-gray-500 text-xs leading-relaxed mb-3 line-clamp-2">
                      {p.description}
                    </p>
                  )}

                  <p className="text-xs text-gray-400 mb-1">
                    {t('admin.budgetLabel')} <strong>{p.budgetDemande ? `${p.budgetDemande} €` : t('admin.notSpecified')}</strong>
                  </p>
                  {p.porteurPrenom && (
                    <p className="text-xs text-gray-400 mb-4">
                      {t('admin.ownerLabel')} <strong>{p.porteurPrenom} {p.porteurNom}</strong>
                    </p>
                  )}

                  <div className="flex gap-2">
                    <select
                      value={p.statut}
                      onChange={e => changerStatut(p.id, e.target.value)}
                      className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      {STATUTS.map(s => <option key={s} value={s}>{t(`statuses.${s}`, s)}</option>)}
                    </select>
                    <button
                      onClick={() => supprimerProjet(p.id, p.titre)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 font-medium transition"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
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

function formatApiError(err, t, fallback) {
  if (err.response?.status === 401) return t('errors.session_expired');
  if (err.response?.status === 403) return t('errors.forbidden');
  return err.response?.data?.message || fallback;
}

function statutColor(statut) {
  switch (statut) {
    case 'APPROUVE':  return '#28a745';
    case 'EN_COURS':  return '#2E86AB';
    case 'TERMINE':   return '#6c757d';
    case 'REJETE':    return '#dc3545';
    case 'SOUMIS':    return '#17a2b8';
    default:          return '#ffc107';
  }
}
