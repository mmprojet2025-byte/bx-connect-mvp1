import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../api/axios';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import { confirmSensitiveAction, userFriendlyError } from '../../utils/userFriendlyError';
import StatusBadge from '../../components/StatusBadge';
import ProjectCover from '../../components/ProjectCover';

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
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => { fetchProjets(); }, []);

  const fetchProjets = async () => {
    try {
      const res = await api.get('/projets/admin/tous');
      setProjets(res.data);
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
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  };

  const modifierProjet = (projet) => {
    setMessage('');
    setError('');
    setEditingId(projet.id);
    setForm({
      titre: projet.titre || '',
      description: projet.description || '',
      budgetDemande: projet.budgetDemande ?? '',
    });
    setShowForm(true);
  };

  const enregistrerProjet = async (e) => {
    e.preventDefault();
    setCreating(true);
    setMessage('');
    setError('');
    const payload = {
      ...form,
      budgetDemande: parseFloat(form.budgetDemande) || 0,
    };
    try {
      if (editingId) {
        const res = await api.put(`/projets/${editingId}`, payload);
        setProjets(prev => prev.map(p => p.id === editingId ? res.data : p));
        setMessage(t('admin.projectUpdated'));
      } else {
        const res = await api.post('/projets', payload);
        setProjets(prev => [res.data, ...prev]);
        setMessage(t('admin.projectCreated'));
      }
      resetForm();
    } catch (err) {
      setError(userFriendlyError(err, editingId ? t('admin.errorProjectUpdate') : t('admin.errorProjectCreate')));
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
    } catch (err) {
      setError(userFriendlyError(err, t('admin.errorStatusChange')));
    }
  };

  const supprimerProjet = async (id, titre) => {
    if (!confirmSensitiveAction(t('admin.confirmDeleteProject', { title: titre }))) return;
    try {
      await api.delete(`/projets/${id}`);
      setProjets(prev => prev.filter(p => p.id !== id));
      setMessage(t('admin.projectDeleted'));
      setError('');
    } catch (err) {
      setError(userFriendlyError(err, t('admin.errorDelete')));
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
            onClick={showForm ? resetForm : openCreateForm}
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
          <form onSubmit={enregistrerProjet} className="bg-white rounded-2xl shadow p-5 mb-6 grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2 flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-blue-900">
                {editingId ? t('common.edit') : t('admin.createProject')}
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
                {creating ? t('common.saving') : editingId ? t('common.saveChanges') : t('admin.createProject')}
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
              <article
                key={p.id}
                className="bg-white rounded-2xl shadow overflow-hidden hover:-translate-y-0.5 hover:shadow-lg transition"
                style={{ borderTop: `4px solid ${statutColor(p.statut)}` }}
              >
                <div className="relative">
                  <ProjectCover imageUrl={p.imageUrl} title={p.titre} className="h-36" />
                  <div className="absolute left-4 top-4">
                    <StatusBadge status={p.statut}>
                      {t(`statuses.${p.statut}`, p.statut)}
                    </StatusBadge>
                  </div>
                </div>
                <div className="p-5">
                  <div className="mb-3">
                    <h3 className="font-bold text-blue-900 text-lg leading-tight">{p.titre}</h3>
                    {p.groupeNom && (
                      <p className="text-xs text-blue-700 font-semibold mt-1">{t('projects.group_label', { group: p.groupeNom })}</p>
                    )}
                  </div>

                  {p.description && (
                    <p className="text-gray-500 text-xs leading-relaxed mb-3 line-clamp-2">
                      {p.description}
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                    <InfoPill label={t('admin.budgetLabel')} value={p.budgetDemande ? `${p.budgetDemande} €` : t('admin.notSpecified')} />
                    <InfoPill label={t('admin.ownerLabel')} value={p.porteurPrenom ? `${p.porteurPrenom} ${p.porteurNom}` : t('admin.notSpecified')} />
                  </div>

                  <div className="flex gap-2">
                    <select
                      value={p.statut}
                      onChange={e => changerStatut(p.id, e.target.value)}
                      className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      {STATUTS.map(s => <option key={s} value={s}>{t(`statuses.${s}`, s)}</option>)}
                    </select>
                    <button
                      onClick={() => modifierProjet(p)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 font-medium transition"
                    >
                      {t('common.edit')}
                    </button>
                    <button
                      onClick={() => supprimerProjet(p.id, p.titre)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 font-medium transition"
                    >
                      {t('common.delete')}
                    </button>
                  </div>
                </div>
              </article>
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

function InfoPill({ label, value }) {
  return (
    <div className="rounded-xl bg-gray-50 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase text-gray-400">{label}</p>
      <p className="mt-0.5 font-semibold text-gray-700 truncate">{value}</p>
    </div>
  );
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
