import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import api from '../../api/axios';
import Alert from '../../components/ui/Alert';
import EmptyState from '../../components/ui/EmptyState';
import StatusBadge from '../../components/StatusBadge';
import ActivityCover from '../../components/ActivityCover';
import { userFriendlyError } from '../../utils/userFriendlyError';
import PageHeader from '../../components/ui/PageHeader';
import LoadingState from '../../components/ui/LoadingState';
import ErrorState from '../../components/ui/ErrorState';
import AppIcon from '../../components/ui/AppIcons';

const ACTIVITY_STATUSES = ['BROUILLON', 'PUBLIEE', 'TERMINEE', 'ANNULEE'];

export default function Activites() {
  const { isAuthenticated, isAdmin, isReferent } = useAuth();
  const { t, i18n } = useTranslation();

  const [activites, setActivites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Filtres (V03)
  const [recherche, setRecherche] = useState('');
  const [filtreCategorie, setFiltreCategorie] = useState('');
  const [filtreTheme, setFiltreTheme] = useState('');
  const [filtreLieu, setFiltreLieu] = useState('');
  const [filtreGratuite, setFiltreGratuite] = useState('');
  const [filtreStatut, setFiltreStatut] = useState('');
  const [filtreGroupe, setFiltreGroupe] = useState('');
  const [options, setOptions] = useState({ categories: [], themes: [], lieux: [] });
  const [actionLoading, setActionLoading] = useState(null);

  // Formulaire création (Admin/Référent)
  const [showForm, setShowForm] = useState(false);
  const peutGerer = isAdmin || isReferent;

  const [form, setForm] = useState({
    titre: '', description: '', dateDebut: '', dateFin: '',
    lieu: '', gratuite: true, prix: '', capaciteMax: 0,
    categorie: '', theme: '', imageUrl: '',
  });

  useEffect(() => {
    fetchActivites();
    fetchOptions();
  }, []);

  const fetchActivites = async () => {
    try {
      setError('');
      const endpoint = peutGerer ? '/activites/admin/toutes' : '/activites';
      const res = await api.get(endpoint);
      setActivites(res.data);
    } catch {
      setError(t('activities.error_load'));
    } finally {
      setLoading(false);
    }
  };

  const fetchOptions = async () => {
    try {
      const res = await api.get('/activites/options-filtres');
      setOptions(res.data);
    } catch {
      // silencieux
    }
  };

  const groupesDisponibles = useMemo(
    () => [...new Set(activites.map(activite => activite.groupeNom).filter(Boolean))],
    [activites]
  );
  const prochainesActivites = useMemo(() => {
    const now = new Date();
    return activites
      .filter(activite => activite.dateDebut && new Date(activite.dateDebut) >= now && !['TERMINEE', 'TERMINE', 'ANNULEE'].includes(activite.statut))
      .sort((a, b) => new Date(a.dateDebut) - new Date(b.dateDebut))
      .slice(0, 3);
  }, [activites]);
  const inscriptionsVisibles = useMemo(() => {
    return activites.filter(activite => activite.inscrit || activite.dejaInscrit || activite.inscriptionId || activite.statutInscription).length;
  }, [activites]);

  const activitesAffichees = useMemo(() => activites.filter(activite => {
    const matchStatut = filtreStatut ? activite.statut === filtreStatut : true;
    const matchGroupe = filtreGroupe ? activite.groupeNom === filtreGroupe : true;
    return matchStatut && matchGroupe;
  }), [activites, filtreGroupe, filtreStatut]);

  const handleFiltrer = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (recherche)       params.append('q', recherche);
      if (filtreCategorie) params.append('categorie', filtreCategorie);
      if (filtreTheme)     params.append('theme', filtreTheme);
      if (filtreLieu)      params.append('lieu', filtreLieu);
      if (filtreGratuite !== '') params.append('gratuite', filtreGratuite);

      const res = await api.get(`/activites/filtrer?${params.toString()}`);
      setActivites(res.data);
    } catch {
      setError(t('activities.error_load'));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setRecherche(''); setFiltreCategorie('');
    setFiltreTheme(''); setFiltreLieu(''); setFiltreGratuite('');
    setFiltreStatut(''); setFiltreGroupe('');
    fetchActivites();
  };

  const handleInscrire = async (activiteId) => {
    setActionLoading(activiteId);
    try {
      await api.post('/inscriptions', { activiteId });
      const feedback = t('activities.success_register');
      setMessage(feedback);
      toast.success(feedback);
      setActivites(current => current.map(activite => activite.id === activiteId
        ? {
            ...activite,
            inscrit: true,
            dejaInscrit: true,
            nombreInscrits: typeof activite.nombreInscrits === 'number' ? activite.nombreInscrits + 1 : activite.nombreInscrits,
          }
        : activite
      ));
      fetchActivites();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      const feedback = userFriendlyError(err, t('activities.error_register'));
      setError(feedback);
      toast.error(feedback);
      setTimeout(() => setError(''), 3000);
    } finally {
      setActionLoading(null);
    }
  };

  const handlePublier = async (id) => {
    setActionLoading(id);
    try {
      await api.patch(`/activites/${id}/statut?statut=PUBLIEE`);
      const feedback = t('activities.success_publish');
      setMessage(feedback);
      toast.success(feedback);
      fetchActivites();
      setTimeout(() => setMessage(''), 3000);
    } catch {
      const feedback = t('activities.error_publish');
      setError(feedback);
      toast.error(feedback);
    } finally {
      setActionLoading(null);
    }
  };

  const handleTerminer = async (id) => {
    setActionLoading(id);
    try {
      await api.patch(`/activites/${id}/statut?statut=TERMINEE`);
      const feedback = t('activities.successComplete', { defaultValue: 'Activité marquée comme terminée.' });
      setMessage(feedback);
      toast.success(feedback);
      fetchActivites();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      const feedback = userFriendlyError(err, t('activities.errorStatusUpdate', { defaultValue: 'Impossible de modifier le statut.' }));
      setError(feedback);
      toast.error(feedback);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/activites', {
        ...form,
        prix: form.gratuite ? null : parseFloat(form.prix),
        capaciteMax: parseInt(form.capaciteMax),
      });
      const feedback = t('activities.success_create');
      setMessage(feedback);
      toast.success(feedback);
      setShowForm(false);
      setForm({ titre: '', description: '', dateDebut: '', dateFin: '', lieu: '', gratuite: true, prix: '', capaciteMax: 0, categorie: '', theme: '', imageUrl: '' });
      fetchActivites();
    } catch {
      const feedback = t('activities.error_create');
      setError(feedback);
      toast.error(feedback);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-10">

        <PageHeader
          eyebrow={peutGerer ? t('activities.manage_mode', { count: activites.length }) : t('nav.activities')}
          title={t('activities.title')}
          description={t('ux.activities.intro', { defaultValue: 'Découvre les activités, ateliers et événements de la communauté BX-Connect.' })}
          action={peutGerer && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500"
            >
              {showForm ? t('common.cancel') : t('activities.new_activity')}
            </button>
          )}
        />

        {/* Messages */}
        {message && <Alert>{message}</Alert>}
        {error && activites.length > 0 && <Alert type="error">{error}</Alert>}

        <UpcomingActivitiesStrip
          activities={prochainesActivites}
          registrationsCount={inscriptionsVisibles}
          t={t}
          language={i18n.language}
        />

        {/* ── Filtres (V03) ── */}
        <div className="bg-white rounded-[1.25rem] border border-slate-100 shadow-lg shadow-slate-900/5 p-4 mb-5">
          <h2 className="text-sm font-bold text-slate-950 mb-3">{t('activities.filters_title')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <input
              type="text"
              placeholder={t('activities.search_placeholder')}
              value={recherche}
              onChange={e => setRecherche(e.target.value)}
              className="border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <select
              value={filtreCategorie}
              onChange={e => setFiltreCategorie(e.target.value)}
              className="border border-gray-300 rounded-xl px-4 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">{t('activities.all_categories')}</option>
              {options.categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              value={filtreTheme}
              onChange={e => setFiltreTheme(e.target.value)}
              className="border border-gray-300 rounded-xl px-4 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">{t('activities.all_themes')}</option>
              {options.themes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select
              value={filtreLieu}
              onChange={e => setFiltreLieu(e.target.value)}
              className="border border-gray-300 rounded-xl px-4 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">{t('activities.all_places')}</option>
              {options.lieux.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <select
              value={filtreGratuite}
              onChange={e => setFiltreGratuite(e.target.value)}
              className="border border-gray-300 rounded-xl px-4 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">{t('activities.free_and_paid')}</option>
              <option value="true">{t('activities.free_only')}</option>
              <option value="false">{t('activities.paid_only')}</option>
            </select>
            <select
              value={filtreStatut}
              onChange={e => setFiltreStatut(e.target.value)}
              className="border border-gray-300 rounded-xl px-4 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">{t('partnerSupport.admin.allStatuses', { defaultValue: 'Tous les statuts' })}</option>
              {ACTIVITY_STATUSES.map(statut => <option key={statut} value={statut}>{t(`statuses.${statut}`, { defaultValue: statut })}</option>)}
            </select>
            <select
              value={filtreGroupe}
              onChange={e => setFiltreGroupe(e.target.value)}
              className="border border-gray-300 rounded-xl px-4 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">{t('projects.allGroups', { defaultValue: 'Tous les groupes' })}</option>
              {groupesDisponibles.map(groupe => <option key={groupe} value={groupe}>{groupe}</option>)}
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleFiltrer}
              className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-5 py-2 rounded-xl transition"
            >
              {t('activities.apply_filters')}
            </button>
            <button
              onClick={handleReset}
              className="bg-gray-100 hover:bg-gray-200 text-slate-700 text-sm font-semibold px-5 py-2 rounded-xl transition"
            >
              {t('activities.reset_filters')}
            </button>
            <span className="text-xs font-semibold text-slate-500">
              {activitesAffichees.length}/{activites.length} {t('nav.activities').toLowerCase()}
            </span>
          </div>
        </div>

        {/* ── Formulaire création ── */}
        {showForm && peutGerer && (
          <div className="bg-white rounded-[1.5rem] border border-slate-100 shadow-lg shadow-slate-900/5 p-6 mb-6">
            <h2 className="text-lg font-bold text-slate-950 mb-4">{t('activities.new_title')}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('activities.form_title')}</label>
                  <input required value={form.titre} onChange={e => setForm({...form, titre: e.target.value})}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('activities.form_place')}</label>
                  <input value={form.lieu} onChange={e => setForm({...form, lieu: e.target.value})}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('activities.form_start')}</label>
                  <input required type="datetime-local" value={form.dateDebut} onChange={e => setForm({...form, dateDebut: e.target.value})}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('activities.form_end')}</label>
                  <input required type="datetime-local" value={form.dateFin} onChange={e => setForm({...form, dateFin: e.target.value})}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('activities.form_category')}</label>
                  <input value={form.categorie} onChange={e => setForm({...form, categorie: e.target.value})}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('activities.form_theme')}</label>
                  <input value={form.theme} onChange={e => setForm({...form, theme: e.target.value})}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('activities.form_capacity')}</label>
                  <input type="number" min="0" value={form.capaciteMax} onChange={e => setForm({...form, capaciteMax: e.target.value})}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input type="checkbox" id="gratuite" checked={form.gratuite} onChange={e => setForm({...form, gratuite: e.target.checked})} />
                  <label htmlFor="gratuite" className="text-sm text-slate-700">{t('activities.form_free')}</label>
                </div>
              </div>
              {!form.gratuite && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('activities.form_price')}</label>
                  <input type="number" min="0" step="0.01" value={form.prix} onChange={e => setForm({...form, prix: e.target.value})}
                    className="w-48 border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('activities.form_description')}</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={3}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-vertical" />
              </div>
              <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition">
                {t('activities.create_btn')}
              </button>
            </form>
          </div>
        )}

        {/* ── Liste des activités ── */}
        {loading ? (
          <LoadingState label={t('common.loading')} />
        ) : error && activites.length === 0 ? (
          <ErrorState
            title={t('common.loadErrorTitle')}
            description={error || t('common.loadErrorDescription')}
            actionLabel={t('common.retry')}
            action={fetchActivites}
          />
        ) : activites.length === 0 ? (
          <EmptyState
            icon="Calendar"
            title={t('activities.no_activities')}
            description={t('activities.empty_description')}
            actionLabel={t('groups.discover')}
            actionTo="/groupes"
          />
        ) : activitesAffichees.length === 0 ? (
          <EmptyState
            icon="Search"
            title={t('activities.noFilteredActivities', { defaultValue: 'Aucune activité ne correspond aux filtres.' })}
            description={t('activities.noFilteredActivitiesDesc', { defaultValue: 'Modifie le statut, la catégorie ou le groupe pour élargir les résultats.' })}
            actionLabel={t('activities.reset_filters')}
            action={handleReset}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {activitesAffichees.map(a => (
              <ActivityCard
                key={a.id}
                activity={a}
                isAuthenticated={isAuthenticated}
                peutGerer={peutGerer}
                actionLoading={actionLoading === a.id}
                onRegister={() => handleInscrire(a.id)}
                onPublish={() => handlePublier(a.id)}
                onComplete={() => handleTerminer(a.id)}
                t={t}
                language={i18n.language}
              />
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

function UpcomingActivitiesStrip({ activities, registrationsCount, t, language }) {
  return (
    <section className="mb-5 rounded-[1.25rem] border border-slate-100 bg-white p-4 shadow-lg shadow-slate-900/5">
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-sm font-black text-slate-950">
            {t('activities.upcomingTitle', { defaultValue: 'Prochaines activités' })}
          </h2>
          <p className="text-xs text-slate-500">
            {registrationsCount > 0
              ? t('activities.myRegistrationsCount', { count: registrationsCount, defaultValue: `${registrationsCount} inscription(s) visible(s)` })
              : t('activities.upcomingHint', { defaultValue: 'Les prochaines dates publiées apparaissent ici dès qu’elles sont disponibles.' })}
          </p>
        </div>
        <Link to="/activites" className="text-xs font-bold text-blue-700 hover:underline">
          {t('common.showAll', { defaultValue: 'Voir tout' })}
        </Link>
      </div>

      {activities.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-500">
          {t('activities.noUpcoming', { defaultValue: 'Aucune activité à venir pour le moment.' })}
        </div>
      ) : (
        <div className="grid gap-2 md:grid-cols-3">
          {activities.map(activity => (
            <Link
              key={activity.id}
              to={`/activites/${activity.id}`}
              className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2 transition hover:border-blue-200 hover:bg-blue-50"
            >
              <span className="block truncate text-xs font-black text-slate-950">{activity.titre}</span>
              <span className="mt-1 flex items-center justify-between gap-2 text-[11px] font-semibold text-slate-500">
                <span className="truncate">{activity.dateDebut ? new Date(activity.dateDebut).toLocaleDateString(language || 'fr-BE') : '—'}</span>
                <span className="truncate text-blue-700">{activity.groupeNom || activity.lieu || t('nav.activities')}</span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}

function ActivityCard({ activity, isAuthenticated, peutGerer, actionLoading, onRegister, onPublish, onComplete, t, language }) {
  const situation = getActivitySituation(activity, peutGerer, t)
  return (
    <article className="bg-white rounded-[1.25rem] border border-slate-100 shadow-lg shadow-slate-900/5 overflow-hidden hover:-translate-y-0.5 hover:shadow-lg transition flex flex-col">
      <div className="relative">
        <ActivityCover
          imageUrl={activity.imageUrl}
          title={activity.titre}
          categorie={activity.categorie}
          theme={activity.theme}
          className="h-36"
        />
        <div className="absolute left-4 top-4">
          <StatusBadge status={activity.statut}>
            {t(`statuses.${activity.statut}`, { defaultValue: activity.statut })}
          </StatusBadge>
        </div>
        <div className="absolute right-4 top-4">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black shadow-sm ${situation.className}`}>
            <span aria-hidden="true">{situation.dot}</span>
            {situation.label}
          </span>
        </div>
      </div>

      <div className="p-4 flex flex-col flex-1">
        <div className="mb-2">
          <h3 className="font-black text-slate-950 text-base leading-tight">{activity.titre}</h3>
          {(activity.categorie || activity.theme || activity.groupeNom) && (
            <p className="text-xs text-blue-600 font-semibold mt-1">
              {[activity.categorie, activity.theme, activity.groupeNom].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>

        {activity.description && (
          <p className="text-slate-500 text-sm mb-3 line-clamp-2 leading-relaxed">{activity.description}</p>
        )}

        <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
          <InfoPill label={t('activities.form_place')} value={activity.lieu || '—'} />
          <InfoPill
            label={t('activities.start_date')}
            value={activity.dateDebut ? new Date(activity.dateDebut).toLocaleDateString(language || 'fr-BE') : '—'}
          />
          <InfoPill
            label={t('activities.capacity')}
            value={formatCapacity(activity, t)}
            highlight={situation.key === 'full'}
          />
          <InfoPill
            label={t('activities.form_price')}
            value={activity.gratuite ? t('activities.free') : t('activities.price_value', { price: activity.prix })}
          />
        </div>

        <div className="flex flex-wrap gap-2 mt-auto">
          <Link
            to={`/activites/${activity.id}`}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gray-100 px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-gray-200"
          >
            <AppIcon name="Eye" className="h-3.5 w-3.5" />
            {t('activities.view_detail')}
          </Link>

          {renderActivityAction({ activity, isAuthenticated, peutGerer, situation, actionLoading, onRegister, onPublish, onComplete, t })}
        </div>
      </div>
    </article>
  )
}

function renderActivityAction({ activity, isAuthenticated, peutGerer, situation, actionLoading, onRegister, onPublish, onComplete, t }) {
  if (peutGerer) {
    if (activity.statut === 'BROUILLON') {
      return (
        <button type="button" disabled={actionLoading} onClick={onPublish} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-green-600 px-3 py-2 text-xs font-black text-white transition hover:bg-green-500 disabled:opacity-60">
          <AppIcon name="CheckCircle" className="h-3.5 w-3.5" />
          {t('activities.publish')}
        </button>
      )
    }
    if (!['TERMINEE', 'TERMINE', 'ANNULEE'].includes(activity.statut)) {
      return (
        <button type="button" disabled={actionLoading} onClick={onComplete} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-black text-white transition hover:bg-slate-700 disabled:opacity-60">
          <AppIcon name="Clock" className="h-3.5 w-3.5" />
          {t('activities.complete', { defaultValue: 'Terminer' })}
        </button>
      )
    }
    return (
      <Link to="/admin/activites" className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white transition hover:bg-blue-500">
        <AppIcon name="Settings" className="h-3.5 w-3.5" />
        {t('common.manage', { defaultValue: 'Gérer' })}
      </Link>
    )
  }

  if (!isAuthenticated) {
    return (
      <Link to="/login" className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white transition hover:bg-blue-500">
        <AppIcon name="User" className="h-3.5 w-3.5" />
        {t('nav.login')}
      </Link>
    )
  }

  if (situation.key === 'registered') {
    return (
      <button type="button" disabled className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-amber-100 px-3 py-2 text-xs font-black text-amber-800">
        <AppIcon name="CheckCircle" className="h-3.5 w-3.5" />
        {t('activities.already_registered')}
      </button>
    )
  }

  if (situation.key === 'open') {
    return (
      <button type="button" disabled={actionLoading} onClick={onRegister} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white transition hover:bg-blue-500 disabled:opacity-60">
        <AppIcon name="PlusCircle" className="h-3.5 w-3.5" />
        {t('activities.register_btn')}
      </button>
    )
  }

  return (
    <button type="button" disabled className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-500">
      <AppIcon name={situation.key === 'done' ? 'Clock' : 'XCircle'} className="h-3.5 w-3.5" />
      {situation.label}
    </button>
  )
}

function getActivitySituation(activity, peutGerer, t) {
  if (peutGerer) {
    return { key: 'organizer', label: t('activities.organizer', { defaultValue: 'Organisateur' }), dot: '🔵', className: 'bg-blue-50 text-blue-800' }
  }
  if (activity.inscrit || activity.dejaInscrit || activity.inscriptionId || activity.statutInscription) {
    return { key: 'registered', label: t('activities.already_registered'), dot: '🟡', className: 'bg-amber-50 text-amber-800' }
  }
  if (['TERMINEE', 'TERMINE'].includes(activity.statut) || (activity.dateFin && new Date(activity.dateFin) < new Date())) {
    return { key: 'done', label: t('activities.done', { defaultValue: 'Terminé' }), dot: '⚫', className: 'bg-slate-100 text-slate-700' }
  }
  if (isActivityFull(activity)) {
    return { key: 'full', label: t('activities.full', { defaultValue: 'Complet' }), dot: '🔴', className: 'bg-red-50 text-red-700' }
  }
  if (activity.statut === 'PUBLIEE') {
    return { key: 'open', label: t('activities.registrationOpen', { defaultValue: 'Inscription possible' }), dot: '🟢', className: 'bg-emerald-50 text-emerald-700' }
  }
  return { key: 'closed', label: t(`statuses.${activity.statut}`, { defaultValue: activity.statut || 'Indisponible' }), dot: '⚪', className: 'bg-slate-100 text-slate-600' }
}

function isActivityFull(activity) {
  const capacity = Number(activity.capaciteMax)
  const registered = Number(activity.nombreInscrits ?? activity.nombreParticipants ?? activity.inscriptionsCount)
  return capacity > 0 && registered >= capacity
}

function formatCapacity(activity, t) {
  const capacity = Number(activity.capaciteMax)
  const registered = Number(activity.nombreInscrits ?? activity.nombreParticipants ?? activity.inscriptionsCount)
  if (capacity > 0 && Number.isFinite(registered)) return `${registered}/${capacity}`
  if (capacity > 0) return t('activities.capacity_max', { count: capacity })
  return t('activities.unlimited')
}

function InfoPill({ label, value, highlight = false }) {
  return (
    <div className={`rounded-xl px-3 py-2 ${highlight ? 'bg-red-50' : 'bg-slate-50'}`}>
      <p className={`text-[10px] font-semibold uppercase ${highlight ? 'text-red-500' : 'text-slate-400'}`}>{label}</p>
      <p className={`mt-0.5 font-semibold truncate ${highlight ? 'text-red-700' : 'text-slate-700'}`}>{value}</p>
    </div>
  );
}
