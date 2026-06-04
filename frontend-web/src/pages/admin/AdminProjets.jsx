import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../api/axios';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import { confirmSensitiveAction, userFriendlyError } from '../../utils/userFriendlyError';
import StatusBadge from '../../components/StatusBadge';
import ProjectCover from '../../components/ProjectCover';
import AppIcon from '../../components/ui/AppIcons';
import PageHeader from '../../components/ui/PageHeader';
import SectionCard from '../../components/ui/SectionCard';

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
  const [filtreGroupe, setFiltreGroupe] = useState('');
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
    const texte = `${p.titre || ''} ${p.description || ''} ${p.porteurPrenom || ''} ${p.porteurNom || ''}`.toLowerCase();
    const matchRecherche = texte.includes(recherche.toLowerCase());
    const matchStatut = filtreStatut ? p.statut === filtreStatut : true;
    const matchGroupe = filtreGroupe ? p.groupeNom === filtreGroupe : true;
    return matchRecherche && matchStatut && matchGroupe;
  });
  const groupes = [...new Set(projets.map(p => p.groupeNom).filter(Boolean))];
  const stats = {
    total: projets.length,
    soumis: projets.filter(p => p.statut === 'SOUMIS').length,
    actifs: projets.filter(p => ['APPROUVE', 'EN_COURS'].includes(p.statut)).length,
    budget: projets.reduce((total, projet) => total + (Number(projet.budgetDemande) || 0), 0),
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-10">
        <PageHeader
          eyebrow={t('nav.projects')}
          title={t('admin.projects_title')}
          description={t('statistics.projectsTotal', { count: projets.length })}
          action={(
            <button
              type="button"
              onClick={showForm ? resetForm : openCreateForm}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-600"
            >
              <AppIcon name={showForm ? 'XCircle' : 'PlusCircle'} className="h-4 w-4" />
              {showForm ? t('common.cancel') : t('admin.createProject')}
            </button>
          )}
        />

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <AdminStatCard icon="Rocket" label={t('common.total', { defaultValue: 'Total' })} value={stats.total} tone="blue" />
          <AdminStatCard icon="Clock" label={t('statuses.SOUMIS', { defaultValue: 'Soumis' })} value={stats.soumis} tone="amber" />
          <AdminStatCard icon="CheckCircle" label={t('statuses.EN_COURS', { defaultValue: 'Actifs' })} value={stats.actifs} tone="green" />
          <AdminStatCard icon="Wallet" label={t('admin.budgetLabel')} value={`${stats.budget} €`} tone="violet" />
        </div>

        {message && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4 text-sm">{message}</div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">{error}</div>
        )}

        {showForm && (
          <form onSubmit={enregistrerProjet} className="mb-6 grid rounded-3xl border border-slate-100 bg-white p-5 shadow-sm md:grid-cols-2 gap-4">
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
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:bg-gray-300"
              >
                <AppIcon name={editingId ? 'Save' : 'PlusCircle'} className="h-4 w-4" />
                {creating ? t('common.saving') : editingId ? t('common.saveChanges') : t('admin.createProject')}
              </button>
            </div>
          </form>
        )}

        <SectionCard className="mb-6" title={t('common.filters', { defaultValue: 'Filtres' })}>
          <div className="mb-4 flex flex-wrap gap-2">
            {STATUTS.map(s => {
              const count = projets.filter(p => p.statut === s).length;
              return (
                <button
                  key={s}
                  onClick={() => setFiltreStatut(filtreStatut === s ? '' : s)}
                  className="rounded-full border-2 px-3 py-1 text-xs font-semibold transition hover:-translate-y-0.5"
                  style={{
                    background: filtreStatut === s ? statutColor(s) : '#F8FAFC',
                    color: filtreStatut === s ? '#fff' : '#4A6A8A',
                    borderColor: statutColor(s),
                  }}
                >
                  {t(`statuses.${s}`, s)} ({count})
                </button>
              );
            })}
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_240px]">
            <label className="relative block">
              <AppIcon name="Search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={t('admin.searchProjectPlaceholder')}
                value={recherche}
                onChange={e => { setRecherche(e.target.value); setMessage(''); setError(''); }}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </label>
            <select
              value={filtreGroupe}
              onChange={e => setFiltreGroupe(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">{t('nav.groups')}</option>
              {groupes.map(groupe => <option key={groupe} value={groupe}>{groupe}</option>)}
            </select>
          </div>
        </SectionCard>

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
                className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
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
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-100 px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-200"
                    >
                      <AppIcon name="Edit" className="h-3.5 w-3.5" />
                      {t('common.edit')}
                    </button>
                    <button
                      onClick={() => supprimerProjet(p.id, p.titre)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-200"
                    >
                      <AppIcon name="XCircle" className="h-3.5 w-3.5" />
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
    case 'APPROUVE':  return '#28a745';
    case 'EN_COURS':  return '#2E86AB';
    case 'TERMINE':   return '#6c757d';
    case 'REJETE':    return '#dc3545';
    case 'SOUMIS':    return '#17a2b8';
    default:          return '#ffc107';
  }
}
