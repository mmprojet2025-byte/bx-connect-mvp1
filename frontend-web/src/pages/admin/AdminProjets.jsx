import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../api/axios';
import Navbar from '../../components/Navbar';
import { confirmSensitiveAction, userFriendlyError } from '../../utils/userFriendlyError';
import StatusBadge from '../../components/StatusBadge';
import ProjectCover from '../../components/ProjectCover';
import AppIcon from '../../components/ui/AppIcons';
import PageHeader from '../../components/ui/PageHeader';
import LoadingState from '../../components/ui/LoadingState';
import ErrorState from '../../components/ui/ErrorState';
import EmptyState from '../../components/ui/EmptyState';

const STATUTS = ['BROUILLON', 'SOUMIS', 'VALIDE_REFERENT', 'REFUSE_REFERENT', 'APPROUVE', 'EN_COURS', 'TERMINE', 'REJETE', 'ARCHIVE'];
const VISIBILITES = ['GROUPE', 'COMMUNAUTE', 'PARTENAIRES', 'PUBLIC'];
const emptyForm = { titre: '', description: '', budgetDemande: '', groupeId: '', visibilite: 'PUBLIC' };

export default function AdminProjets() {
  const { t } = useTranslation();
  const [projets, setProjets] = useState([]);
  const [groupes, setGroupes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [recherche, setRecherche] = useState('');
  const [filtrePilotage, setFiltrePilotage] = useState('tous');
  const [statutTechnique, setStatutTechnique] = useState('');
  const [filtreGroupe, setFiltreGroupe] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [selectedProject, setSelectedProject] = useState(null);

  const fetchProjets = useCallback(async () => {
    try {
      const res = await api.get('/projets/admin/tous');
      setProjets(res.data);
    } catch (err) {
      setError(userFriendlyError(err, t('admin.error_load')));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchProjets();
    api.get('/admin/groupes')
      .then(res => setGroupes(Array.isArray(res.data) ? res.data : []))
      .catch(() => setGroupes([]));
  }, [fetchProjets]);

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
      groupeId: projet.groupeId ?? '',
      visibilite: projet.visibilite || 'GROUPE',
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
      groupeId: form.groupeId ? Number(form.groupeId) : null,
    };
    try {
      if (editingId) {
        const res = await api.put(`/projets/${editingId}`, payload);
        setProjets(prev => prev.map(p => p.id === editingId ? res.data : p));
        setSelectedProject(current => current?.id === editingId ? res.data : current);
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
    if (!confirmSensitiveAction(t('admin.confirmAdvancedStatusChange', {
      status: adminProjectStatusLabel(statut, t),
    }))) return;
    try {
      const res = await api.patch(`/projets/${id}/statut?statut=${statut}`);
      setProjets(prev => prev.map(p => p.id === id ? res.data : p));
      setSelectedProject(current => current?.id === id ? res.data : current);
      setMessage(t('admin.statusUpdatedWithValue', { status: adminProjectStatusLabel(statut, t) }));
      setError('');
    } catch (err) {
      setError(userFriendlyError(err, t('admin.errorStatusChange')));
    }
  };

  const deciderProjet = async (projet, approuver) => {
    try {
      const res = await api.patch(`/projets/${projet.id}/valider?approuver=${approuver}`);
      setProjets(prev => prev.map(p => p.id === projet.id ? res.data : p));
      setSelectedProject(current => current?.id === projet.id ? res.data : current);
      setMessage(approuver ? t('admin.projectFinallyApproved') : t('admin.projectFinallyRejected'));
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
      setSelectedProject(current => current?.id === id ? null : current);
      setMessage(t('admin.projectDeleted'));
      setError('');
    } catch (err) {
      setError(userFriendlyError(err, t('admin.errorDelete')));
    }
  };

  const projetsFiltres = projets.filter(p => {
    const texte = `${p.titre || ''} ${p.description || ''} ${p.porteurPrenom || ''} ${p.porteurNom || ''}`.toLowerCase();
    const matchRecherche = texte.includes(recherche.toLowerCase());
    const matchStatut = statutTechnique ? p.statut === statutTechnique : matchesProjectPilotageFilter(p, filtrePilotage);
    const matchGroupe = filtreGroupe ? p.groupeNom === filtreGroupe : true;
    return matchRecherche && matchStatut && matchGroupe;
  });
  const nomsGroupes = [...new Set(projets.map(p => p.groupeNom).filter(Boolean))];
  const stats = buildProjectStats(projets);
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        <PageHeader
          eyebrow={t('nav.projects')}
          title={t('admin.projects_title')}
          description={t('statistics.projectsTotal', { count: projets.length })}
          action={(
            <button
              type="button"
              onClick={showForm ? resetForm : openCreateForm}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-600"
            >
              <AppIcon name={showForm ? 'XCircle' : 'PlusCircle'} className="h-4 w-4" />
              {showForm ? t('common.cancel') : t('admin.createProject')}
            </button>
          )}
        />

        {message && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4 text-sm">{message}</div>
        )}
        {error && projets.length > 0 && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">{error}</div>
        )}

        {!loading && projets.length > 0 && (
          <p className="mb-3 rounded-xl border border-slate-100 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm">
            {t('admin.projectsPilotSummary', {
              total: stats.total,
              toValidate: stats.toValidate,
              inProgress: stats.inProgress,
              approved: stats.approved,
              refused: stats.refused,
            })}
          </p>
        )}

        {showForm && (
          <form onSubmit={enregistrerProjet} className="mb-4 grid rounded-2xl border border-slate-100 bg-white p-4 shadow-sm md:grid-cols-2 gap-3">
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
            <Select
              label={t('projects.group')}
              value={form.groupeId}
              onChange={value => setForm({ ...form, groupeId: value })}
              options={groupes.map(groupe => ({ value: groupe.id, label: groupe.nom }))}
              emptyLabel={t('projects.noGroup')}
            />
            <Select
              label={t('projects.visibility')}
              value={form.visibilite}
              onChange={value => setForm({ ...form, visibilite: value })}
              options={VISIBILITES.map(value => ({ value, label: t(`projectVisibility.${value}`) }))}
            />
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

        <section className="mb-4 rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
          <div className="mb-3 flex flex-wrap gap-2">
            {projectPilotageFilters(t).map(filter => (
              <button
                key={filter.id}
                type="button"
                onClick={() => { setFiltrePilotage(filter.id); setStatutTechnique(''); }}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  !statutTechnique && filtrePilotage === filter.id ? 'bg-blue-700 text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-blue-50 hover:text-blue-700'
                }`}
              >
                <AppIcon name={filter.icon} className="h-3.5 w-3.5" />
                {filter.label}
              </button>
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_220px_220px]">
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
              {nomsGroupes.map(groupe => <option key={groupe} value={groupe}>{groupe}</option>)}
            </select>
            <select
              value={statutTechnique}
              onChange={e => setStatutTechnique(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">{t('admin.moreStatuses')}</option>
              {STATUTS.map(statut => (
                <option key={statut} value={statut}>{adminProjectStatusLabel(statut, t)}</option>
              ))}
            </select>
          </div>
        </section>

        {loading ? (
          <LoadingState label={t('common.loading')} />
        ) : error && projets.length === 0 ? (
          <ErrorState
            title={t('common.loadErrorTitle')}
            description={error || t('common.loadErrorDescription')}
            actionLabel={t('common.retry')}
            action={fetchProjets}
          />
        ) : projetsFiltres.length === 0 ? (
          <EmptyState icon="Search" title={t('admin.noProjectFound')} />
        ) : (
          <div className="space-y-3">
            {projetsFiltres.map(p => (
              <article
                key={p.id}
                className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-100 hover:shadow-md"
                style={{ borderLeft: `3px solid ${statutColor(p.statut)}` }}
              >
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedProject(p)}
                    className="hidden shrink-0 overflow-hidden rounded-xl border border-slate-100 bg-slate-50 text-left transition hover:opacity-90 sm:block"
                    aria-label={t('admin.openProjectSheet', { title: p.titre })}
                  >
                    <ProjectCover imageUrl={p.imageUrl} title={p.titre} className="h-16 w-20" />
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => setSelectedProject(p)}
                          className="block text-left text-base font-black leading-tight text-blue-950 transition hover:text-blue-700"
                        >
                          {p.titre}
                        </button>
                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          {projectMetaLine(p, t)}
                        </p>
                      </div>
                      <StatusBadge status={p.statut}>
                        {adminProjectStatusLabel(p.statut, t)}
                      </StatusBadge>
                    </div>

                    {p.description && (
                      <p className="mt-2 line-clamp-2 text-sm leading-snug text-slate-600">
                        {p.description}
                      </p>
                    )}

                    {p.commentaireReferent && ['VALIDE_REFERENT', 'REFUSE_REFERENT'].includes(p.statut) && (
                      <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                        <strong>{t('referent.referentComment')} :</strong> {p.commentaireReferent}
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {['VALIDE_REFERENT', 'SOUMIS'].includes(p.statut) && (
                        <>
                          <button
                            type="button"
                            onClick={() => deciderProjet(p, true)}
                            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-500"
                          >
                            <AppIcon name="CheckCircle" className="h-3.5 w-3.5" />
                            {t('admin.finalApprove')}
                          </button>
                          <button
                            type="button"
                            onClick={() => deciderProjet(p, false)}
                            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100"
                          >
                            <AppIcon name="XCircle" className="h-3.5 w-3.5" />
                            {t('admin.finalReject')}
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => modifierProjet(p)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-100 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-200"
                      >
                        <AppIcon name="Edit" className="h-3.5 w-3.5" />
                        {t('common.edit')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedProject(p)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
                      >
                        <AppIcon name="Eye" className="h-3.5 w-3.5" />
                        {t('common.details')}
                      </button>
                      <details className="group relative">
                        <summary className="inline-flex cursor-pointer list-none items-center justify-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-200">
                          <AppIcon name="Settings" className="h-3.5 w-3.5" />
                          {t('common.more')}
                        </summary>
                        <div className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                          <label className="block px-2 pb-1 text-[10px] font-black uppercase tracking-wide text-slate-400">
                            {t('admin.advancedStatusChange')}
                          </label>
                          <select
                            value={p.statut}
                            onChange={e => changerStatut(p.id, e.target.value)}
                            className="mb-2 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
                          >
                            {STATUTS.map(s => <option key={s} value={s}>{adminProjectStatusLabel(s, t)}</option>)}
                          </select>
                          <button
                            type="button"
                            onClick={() => supprimerProjet(p.id, p.titre)}
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
            ))}
          </div>
        )}
        {selectedProject && (
          <ProjectDetailDrawer
            projet={selectedProject}
            t={t}
            onClose={() => setSelectedProject(null)}
            onEdit={() => modifierProjet(selectedProject)}
            onStatusChange={changerStatut}
            onDelete={supprimerProjet}
            onDecide={deciderProjet}
          />
        )}
      </main>

    </div>
  );
}

function ProjectDetailDrawer({ projet, t, onClose, onEdit, onStatusChange, onDelete, onDecide }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/30 p-3 backdrop-blur-sm">
      <button type="button" className="absolute inset-0 cursor-default" aria-label={t('common.close')} onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="shrink-0 border-b border-slate-100 bg-gradient-to-r from-blue-50 via-white to-violet-50 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-wide text-blue-700">{t('admin.projectSheet')}</p>
              <h2 className="mt-1 text-xl font-black leading-tight text-slate-950">{projet.titre}</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">{projectMetaLine(projet, t)}</p>
            </div>
            <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 transition hover:bg-white hover:text-slate-700" aria-label={t('common.close')}>
              <AppIcon name="XCircle" className="h-5 w-5" />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="mb-4 grid grid-cols-3 gap-2">
            <ProjectDrawerMetric label={t('admin.budgetLabel')} value={projectBudget(projet, t)} icon="Wallet" />
            <ProjectDrawerMetric label={t('projects.owner')} value={projectOwner(projet, t)} icon="User" />
            <ProjectDrawerMetric label={t('projects.group')} value={projet.groupeNom || t('projects.noGroup')} icon="Users" />
          </div>

          <ProjectDrawerSection title={t('admin.projectFollowUp')} icon="ClipboardList">
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600">
              {adminProjectWorkflowHint(projet.statut, t)}
            </p>
            {projet.statut === 'SOUMIS' && (
              <p className="mt-2 inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-800">
                {t('admin.legacyFlow')}
              </p>
            )}
            {projet.commentaireReferent && (
              <p className="mt-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800">
                <strong>{t('referent.referentComment')} :</strong> {projet.commentaireReferent}
              </p>
            )}
          </ProjectDrawerSection>

          {projet.description && (
            <ProjectDrawerSection title={t('projects.form_description')} icon="FileText">
              <p className="text-sm leading-relaxed text-slate-600">{projet.description}</p>
            </ProjectDrawerSection>
          )}

          <ProjectDrawerSection title={t('admin.availableActions')} icon="Settings">
            {['VALIDE_REFERENT', 'SOUMIS'].includes(projet.statut) && (
              <div className="mb-3 grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => onDecide(projet, true)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-500"
                >
                  <AppIcon name="CheckCircle" className="h-3.5 w-3.5" />
                  {t('admin.finalApprove')}
                </button>
                <button
                  type="button"
                  onClick={() => onDecide(projet, false)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100"
                >
                  <AppIcon name="XCircle" className="h-3.5 w-3.5" />
                  {t('admin.finalReject')}
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={onEdit}
              className="mb-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-100 px-3 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-200"
            >
              <AppIcon name="Edit" className="h-4 w-4" />
              {t('common.edit')}
            </button>
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
              <label className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-400">{t('admin.advancedStatusChange')}</label>
              <select
                value={projet.statut}
                onChange={event => onStatusChange(projet.id, event.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                {STATUTS.map(status => <option key={status} value={status}>{adminProjectStatusLabel(status, t)}</option>)}
              </select>
              <button
                type="button"
                onClick={() => onDelete(projet.id, projet.titre)}
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-100 bg-white px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
              >
                <AppIcon name="XCircle" className="h-4 w-4" />
                {t('common.delete')}
              </button>
            </div>
          </ProjectDrawerSection>
        </div>
      </aside>
    </div>
  );
}

function buildProjectStats(projets) {
  return {
    total: projets.length,
    toValidate: projets.filter(projet => ['SOUMIS', 'VALIDE_REFERENT'].includes(projet.statut)).length,
    inProgress: projets.filter(projet => ['BROUILLON', 'EN_COURS'].includes(projet.statut)).length,
    approved: projets.filter(projet => ['APPROUVE', 'TERMINE'].includes(projet.statut)).length,
    refused: projets.filter(projet => ['REFUSE_REFERENT', 'REJETE', 'REFUSE'].includes(projet.statut)).length,
  };
}

function projectPilotageFilters(t) {
  return [
    { id: 'tous', label: t('admin.projectFilters.all'), icon: 'Rocket' },
    { id: 'a-valider', label: t('admin.projectFilters.toValidate'), icon: 'Clock' },
    { id: 'en-cours', label: t('admin.projectFilters.inProgress'), icon: 'Activity' },
    { id: 'approuves', label: t('admin.projectFilters.approved'), icon: 'CheckCircle' },
    { id: 'refuses', label: t('admin.projectFilters.refused'), icon: 'XCircle' },
  ];
}

function matchesProjectPilotageFilter(projet, filter) {
  if (filter === 'a-valider') return ['SOUMIS', 'VALIDE_REFERENT'].includes(projet.statut);
  if (filter === 'en-cours') return ['BROUILLON', 'EN_COURS'].includes(projet.statut);
  if (filter === 'approuves') return ['APPROUVE', 'TERMINE'].includes(projet.statut);
  if (filter === 'refuses') return ['REFUSE_REFERENT', 'REJETE', 'REFUSE'].includes(projet.statut);
  return true;
}

function projectMetaLine(projet, t) {
  const parts = [
    t('admin.projectMetaBudget', { budget: projectBudget(projet, t) }),
    t('admin.projectMetaOwner', { owner: projectOwner(projet, t) }),
    t('admin.projectMetaCreatedAt', { date: formatProjectDate(projet.dateSoumission || projet.dateCreation) }),
  ];
  if (projet.groupeNom) parts.push(t('admin.projectMetaGroup', { group: projet.groupeNom }));
  return parts.join(' · ');
}

function projectBudget(projet, t) {
  const budget = Number(projet.budgetDemande);
  return Number.isFinite(budget) && budget > 0 ? `${budget} €` : t('admin.notSpecified');
}

function ProjectDrawerMetric({ label, value, icon }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
      <AppIcon name={icon} className="mb-1 h-4 w-4 text-blue-700" />
      <p className="truncate text-sm font-black text-slate-950">{value}</p>
      <p className="truncate text-[11px] font-semibold text-slate-500">{label}</p>
    </div>
  );
}

function ProjectDrawerSection({ title, icon, children }) {
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

function Select({ label, value, onChange, options, emptyLabel }) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-gray-700 mb-1">{label}</span>
      <select
        value={value}
        onChange={event => onChange(event.target.value)}
        className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
      >
        {emptyLabel && <option value="">{emptyLabel}</option>}
        {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function projectOwner(projet, t) {
  if (projet.groupeNom) return projet.groupeNom;
  if (projet.porteurPrenom || projet.porteurNom) {
    return `${projet.porteurPrenom || ''} ${projet.porteurNom || ''}`.trim();
  }
  return t('projects.typeInstitutional');
}

function formatProjectDate(value) {
  return value ? new Date(value).toLocaleDateString() : '—';
}

function statutColor(statut) {
  switch (statut) {
    case 'APPROUVE':  return '#28a745';
    case 'VALIDE_REFERENT': return '#0f766e';
    case 'REFUSE_REFERENT': return '#be123c';
    case 'EN_COURS':  return '#2E86AB';
    case 'TERMINE':   return '#6c757d';
    case 'REJETE':    return '#dc3545';
    case 'SOUMIS':    return '#17a2b8';
    default:          return '#ffc107';
  }
}

function adminProjectStatusLabel(status, t) {
  if (status === 'VALIDE_REFERENT') return t('admin.statusValidatedByReferent')
  if (status === 'REFUSE_REFERENT') return t('admin.statusRejectedByReferent')
  if (status === 'SOUMIS') return t('admin.statusLegacySubmitted')
  if (status === 'APPROUVE') return t('admin.statusFinallyApproved')
  if (status === 'REJETE') return t('admin.statusFinallyRejected')
  return t(`statuses.${status}`, { defaultValue: status })
}

function adminProjectWorkflowHint(status, t) {
  if (status === 'VALIDE_REFERENT') return t('admin.workflowWaitingAdminValidation')
  if (status === 'SOUMIS') return t('admin.workflowLegacySubmitted')
  if (status === 'REFUSE_REFERENT') return t('admin.workflowRejectedByReferent')
  if (status === 'APPROUVE') return t('admin.workflowFinallyApproved')
  if (status === 'REJETE') return t('admin.workflowFinallyRejected')
  return t('admin.workflowProjectGeneric')
}
