import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import Navbar from '../../components/Navbar';
import api from '../../api/axios';
import AppIcon from '../../components/ui/AppIcons';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import LoadingState from '../../components/ui/LoadingState';

const OPPORTUNITY_CATEGORIES = ['EMPLOI', 'STAGE', 'FORMATION', 'EVENEMENT', 'APPEL_PROJET', 'PUBLICITE'];

export default function Annonces() {
  const { t, i18n } = useTranslation();
  const { user, isAuthenticated, isAdmin, isReferent } = useAuth();
  const [annonces, setAnnonces] = useState([]);
  const [adminOpportunities, setAdminOpportunities] = useState([]);
  const [activeFilter, setActiveFilter] = useState('TOUT');
  const [loading, setLoading] = useState(true);
  const [loadingOpportunities, setLoadingOpportunities] = useState(false);
  const [opportunityActionId, setOpportunityActionId] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [mesGroupes, setMesGroupes] = useState([]);
  const [form, setForm] = useState({
    titre: '', contenu: '', type: isReferent ? 'GROUPE' : 'GLOBALE', groupeId: null, epinglee: false
  });

  const peutPublier = isAdmin || isReferent;
  const filteredAnnonces = annonces.filter(a => {
    return activeFilter === 'TOUT'
      || (activeFilter === 'ANNONCES' && !a.categorieOpportunite)
      || (activeFilter === 'OPPORTUNITES' && a.categorieOpportunite)
      || a.categorieOpportunite === activeFilter;
  });
  const filters = buildAnnouncementFilters(t, annonces);

  useEffect(() => {
    fetchAnnonces();
    if (isReferent) fetchMesGroupes();
    if (isAdmin) fetchAdminOpportunities();
  }, [isAuthenticated, isReferent, isAdmin]);

  const fetchAnnonces = async () => {
    try {
      const endpoint = isAuthenticated ? '/annonces/mes-annonces' : '/annonces/globales';
      const res = await api.get(endpoint);
      setAnnonces(res.data);
    } catch { setError(t('announcements.errorLoad')); }
    finally { setLoading(false); }
  };

  const fetchMesGroupes = async () => {
    try {
      const res = await api.get('/groupes/referent/mes-groupes');
      setMesGroupes(res.data);
      if (res.data.length > 0) {
        setForm(prev => ({ ...prev, type: 'GROUPE', groupeId: prev.groupeId || res.data[0].id }));
      }
    } catch {}
  };

  const fetchAdminOpportunities = async () => {
    setLoadingOpportunities(true);
    try {
      const res = await api.get('/annonces/admin/opportunites');
      setAdminOpportunities(Array.isArray(res.data) ? res.data : []);
    } catch {
      setError(t('announcements.errorLoadOpportunities'));
    } finally {
      setLoadingOpportunities(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(''); setError('');
    if (isReferent && !form.groupeId) {
      setError(t('announcements.noReferentGroup'));
      return;
    }
    try {
      const payload = isReferent
        ? { ...form, type: 'GROUPE', epinglee: false }
        : { ...form };
      if (!isReferent && form.type === 'GLOBALE') payload.groupeId = null;
      await api.post('/annonces', payload);
      setMessage(t('announcements.published'));
      setShowForm(false);
      setForm({
        titre: '',
        contenu: '',
        type: isReferent ? 'GROUPE' : 'GLOBALE',
        groupeId: isReferent && mesGroupes.length > 0 ? mesGroupes[0].id : null,
        epinglee: false
      });
      fetchAnnonces();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || t('announcements.errorPublish'));
    }
  };

  const handleEpingler = async (id) => {
    try {
      await api.patch(`/annonces/${id}/epingler`);
      fetchAnnonces();
    } catch { setError(t('announcements.errorPin')); }
  };

  const handleSupprimer = async (id) => {
    if (!window.confirm(t('announcements.confirmDelete'))) return;
    try {
      await api.delete(`/annonces/${id}`);
      setAnnonces(prev => prev.filter(a => a.id !== id));
    } catch { setError(t('announcements.errorDelete')); }
  };

  const handleModerateOpportunity = async (id, action) => {
    setOpportunityActionId(`${action}-${id}`);
    setMessage('');
    setError('');
    try {
      await api.patch(`/annonces/admin/${id}/${action}`);
      setMessage(action === 'publier'
        ? t('announcements.opportunityPublished')
        : t('announcements.opportunityRejected'));
      await Promise.all([fetchAdminOpportunities(), fetchAnnonces()]);
      setTimeout(() => setMessage(''), 3000);
    } catch {
      setError(action === 'publier'
        ? t('announcements.errorOpportunityPublish')
        : t('announcements.errorOpportunityReject'));
    } finally {
      setOpportunityActionId(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-5">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-blue-900">
            <AppIcon name="Megaphone" className="h-6 w-6" />
            {t('nav.announcements')}
          </h1>
          {peutPublier && (
            <button onClick={() => setShowForm(!showForm)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-600">
              <AppIcon name={showForm ? 'XCircle' : 'PlusCircle'} className="h-4 w-4" />
              {showForm ? t('common.cancel') : t('announcements.new')}
            </button>
          )}
        </div>

        {message && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4 text-sm">{message}</div>}
        {error && annonces.length > 0 && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">{error}</div>}

        {isAdmin && (loadingOpportunities || adminOpportunities.length > 0) && (
          <section id="moderation-opportunites" className="mb-5 rounded-xl border border-amber-100 bg-white p-4 shadow-sm">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-bold text-blue-900">
                  <AppIcon name="Shield" className="h-5 w-5 text-amber-600" />
                  {t('adminMobile.opportunitiesTitle', { defaultValue: 'Opportunités à modérer' })}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {t('announcements.moderationDescription')}
                </p>
              </div>
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                {t('announcements.pendingCount', { count: adminOpportunities.filter(opportunity => opportunity.statutModeration === 'EN_ATTENTE').length })}
              </span>
            </div>

            {loadingOpportunities ? (
              <p className="py-6 text-center text-sm font-semibold text-slate-400">{t('announcements.loadingOpportunities')}</p>
            ) : (
              <div className="space-y-2.5">
                {adminOpportunities.map(opportunity => (
                  <article key={opportunity.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-700">
                            {opportunityCategoryLabel(opportunity.categorieOpportunite, t)}
                          </span>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${opportunityStatusStyle(opportunity.statutModeration)}`}>
                            {opportunityStatusLabel(opportunity.statutModeration, t)}
                          </span>
                        </div>
                        <h3 className="font-bold text-slate-950">{opportunity.titre}</h3>
                        {opportunity.descriptionCourte && (
                          <p className="mt-1 text-sm font-semibold text-slate-600">{opportunity.descriptionCourte}</p>
                        )}
                        <OpportunityMeta opportunity={opportunity} t={t} />
                        <p className="mt-2 text-xs font-semibold text-slate-400">
                          {t('common.by')} {opportunity.auteurPrenom} {opportunity.auteurNom} ({opportunity.auteurRole}) ·{' '}
                          {opportunity.dateCreation
                            ? new Date(opportunity.dateCreation).toLocaleDateString('fr-BE', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : t('common.unknownDate')}
                        </p>
                      </div>
                      {opportunity.statutModeration === 'EN_ATTENTE' && (
                        <div className="flex shrink-0 flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleModerateOpportunity(opportunity.id, 'publier')}
                            disabled={opportunityActionId === `publier-${opportunity.id}` || opportunityActionId === `refuser-${opportunity.id}`}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-green-500 disabled:opacity-50"
                          >
                            <AppIcon name="CheckCircle" className="h-3.5 w-3.5" />
                            {t('common.publish')}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleModerateOpportunity(opportunity.id, 'refuser')}
                            disabled={opportunityActionId === `refuser-${opportunity.id}` || opportunityActionId === `publier-${opportunity.id}`}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                          >
                            <AppIcon name="XCircle" className="h-3.5 w-3.5" />
                            {t('common.reject')}
                          </button>
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        <section className="mb-3 rounded-xl border border-slate-100 bg-white p-1.5 shadow-sm">
          <div className="messaging-scroll flex gap-1 overflow-x-auto">
              {filters.map(filter => (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setActiveFilter(filter.id)}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-black transition ${
                    activeFilter === filter.id
                      ? 'bg-blue-700 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                  }`}
                >
                  {filter.label}
                  {annonces.length >= 10 && filter.count > 0 && (
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                      activeFilter === filter.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {filter.count}
                    </span>
                  )}
                </button>
              ))}
              {isAdmin && adminOpportunities.length > 0 && (
                <a href="#moderation-opportunites" className="inline-flex shrink-0 items-center rounded-lg px-2.5 py-1.5 text-xs font-black text-amber-700 transition hover:bg-amber-50">
                  {t('announcements.filters.moderation')}
                </a>
              )}
          </div>
        </section>

        {/* Formulaire */}
        {showForm && peutPublier && (
          <div className="bg-white rounded-xl shadow p-5 mb-5">
            <h2 className="text-lg font-bold text-blue-900 mb-4">{t('announcements.new')}</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.title')} *</label>
                <input required value={form.titre} onChange={e => setForm({...form, titre: e.target.value})}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('announcements.content')} *</label>
                <textarea required value={form.contenu} onChange={e => setForm({...form, contenu: e.target.value})} rows={4}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {isAdmin && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.type')}</label>
                    <select value={form.type} onChange={e => setForm({...form, type: e.target.value})}
                      className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
                      <option value="GLOBALE">{t('announcements.globalOption')}</option>
                      <option value="GROUPE">{t('announcements.groupOption')}</option>
                    </select>
                  </div>
                )}
                {(form.type === 'GROUPE' || isReferent) && mesGroupes.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('projects.group')}</label>
                    <select value={form.groupeId || ''} onChange={e => setForm({...form, groupeId: parseInt(e.target.value)})}
                      className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
                      {mesGroupes.map(g => <option key={g.id} value={g.id}>{g.nom}</option>)}
                    </select>
                  </div>
                )}
              </div>
              {isAdmin && (
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="epinglee" checked={form.epinglee} onChange={e => setForm({...form, epinglee: e.target.checked})} />
                  <label htmlFor="epinglee" className="inline-flex items-center gap-1.5 text-sm text-gray-700">
                    <AppIcon name="Pin" className="h-4 w-4" />
                    {t('announcements.pinThis')}
                  </label>
                </div>
              )}
              <button type="submit" className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-600">
                <AppIcon name="Megaphone" className="h-4 w-4" />
                {t('announcements.publish')}
              </button>
            </form>
          </div>
        )}

        {/* Liste */}
        {loading ? (
          <LoadingState label={t('common.loading')} />
        ) : error && annonces.length === 0 ? (
          <ErrorState
            title={t('common.loadErrorTitle')}
            description={error}
            actionLabel={t('common.retry')}
            action={fetchAnnonces}
          />
        ) : filteredAnnonces.length === 0 ? (
          <EmptyState
            icon={annonces.length === 0 ? 'Megaphone' : 'Search'}
            title={annonces.length === 0
              ? t('announcements.empty')
              : t('announcements.noResults')}
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
            {filteredAnnonces.map(a => (
              <AnnouncementFeedItem
                key={a.id}
                announcement={a}
                canManage={isAdmin || (isReferent && a.auteurEmail === user?.email)}
                isAdmin={isAdmin}
                onPin={handleEpingler}
                onDelete={handleSupprimer}
                language={i18n.language}
                t={t}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function OpportunityMeta({ opportunity, t, compact = false }) {
  const deadline = opportunity.dateLimite || opportunity.dateExpiration;
  const items = [
    opportunity.nombrePlaces
      ? { icon: 'Users', label: t('opportunityFields.placesValue', { count: opportunity.nombrePlaces }) }
      : null,
    deadline && !compact
      ? {
          icon: 'Clock',
          label: `${t('opportunityFields.deadlineShort')} ${new Date(deadline).toLocaleDateString('fr-BE')}`,
        }
      : null,
    opportunity.modeCandidature
      ? { icon: 'Send', label: opportunityModeLabel(opportunity.modeCandidature, t) }
      : null,
    opportunity.publicCible
      ? { icon: 'Users', label: opportunityTargetLabel(opportunity.publicCible, t) }
      : null,
    opportunity.miseEnAvant
      ? { icon: 'Star', label: t('opportunityFields.featuredShort') }
      : null,
  ].filter(Boolean);

  if (items.length === 0) return null;

  return (
    <div className={`${compact ? 'mt-1' : 'mb-3 mt-2'} flex flex-wrap gap-1.5`}>
      {items.map(item => (
        <span
          key={`${item.icon}-${item.label}`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-bold text-slate-600"
        >
          <AppIcon name={item.icon} className="h-3.5 w-3.5 text-orange-500" />
          {item.label}
        </span>
      ))}
    </div>
  );
}

function AnnouncementFeedItem({ announcement, canManage, isAdmin, onPin, onDelete, language, t }) {
  const isOpportunity = Boolean(announcement.categorieOpportunite);
  const externalUrl = announcement.lienExterne ? normalizeExternalUrl(announcement.lienExterne) : '';
  const deadline = announcement.dateLimite || announcement.dateExpiration;
  const deadlineLabel = deadline ? formatDeadline(deadline, language, t) : '';
  const author = [announcement.auteurPrenom, announcement.auteurNom].filter(Boolean).join(' ').trim();
  const meta = [
    author || t('announcements.unknownAuthor'),
    announcement.auteurRole,
    formatShortDate(announcement.dateCreation, language),
  ].filter(Boolean).join(' · ');
  const accent = isOpportunity ? 'bg-orange-500' : announcement.type === 'GROUPE' ? 'bg-teal-500' : 'bg-blue-500';

  const handleOpen = () => {
    if (externalUrl) window.open(externalUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <article
      role={externalUrl ? 'link' : undefined}
      tabIndex={externalUrl ? 0 : undefined}
      onClick={externalUrl ? handleOpen : undefined}
      onKeyDown={event => {
        if (externalUrl && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          handleOpen();
        }
      }}
      className={`group relative border-b border-slate-100 bg-white px-3 py-2 transition hover:border-blue-100 hover:bg-slate-50 ${externalUrl ? 'cursor-pointer' : ''}`}
    >
      <span className={`absolute inset-y-0 left-0 w-[3px] ${accent}`} />
      <div className="flex items-start gap-2.5 pl-1">
        <div className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg ${isOpportunity ? 'bg-orange-50 text-orange-700' : 'bg-blue-50 text-blue-700'}`}>
          <AppIcon name={isOpportunity ? 'Megaphone' : 'FileText'} className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            {announcement.epinglee && <AppIcon name="Pin" className="h-3.5 w-3.5 text-blue-600" />}
            <h3 className="truncate text-sm font-black text-slate-950">{announcement.titre}</h3>
            {isOpportunity && (
              <span className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                {opportunityCategoryLabel(announcement.categorieOpportunite, t)}
              </span>
            )}
            {!isOpportunity && announcement.type === 'GROUPE' && announcement.groupeNom && (
              <span className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                {announcement.groupeNom}
              </span>
            )}
            {deadlineLabel && (
              <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-black text-orange-700">
                {deadlineLabel}
              </span>
            )}
          </div>
          <p className="mt-0.5 line-clamp-1 text-xs leading-4 text-slate-600">
            {announcement.descriptionCourte || announcement.contenu}
          </p>
          {isOpportunity && <OpportunityMeta opportunity={announcement} t={t} compact />}
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-400">
            <span>{meta}</span>
            {externalUrl && (
              <span className="inline-flex items-center gap-1 text-blue-700">
                <AppIcon name="Globe" className="h-3 w-3" />
                {t('announcements.openLink')}
              </span>
            )}
          </div>
        </div>
        {canManage && (
          <div className="flex shrink-0 items-center gap-1 opacity-100 sm:opacity-0 sm:transition sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
            {isAdmin && (
              <button
                type="button"
                onClick={event => { event.stopPropagation(); onPin(announcement.id); }}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-blue-50 hover:text-blue-700"
                aria-label={announcement.epinglee ? t('announcements.unpin') : t('announcements.pin')}
              >
                <AppIcon name="Pin" className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={event => { event.stopPropagation(); onDelete(announcement.id); }}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-300 transition hover:bg-red-50 hover:text-red-600"
              aria-label={t('common.delete')}
            >
              <AppIcon name="XCircle" className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

function opportunityCategoryLabel(category, t) {
  const labels = {
    EMPLOI: t('opportunityCategories.EMPLOI'),
    STAGE: t('opportunityCategories.STAGE'),
    FORMATION: t('opportunityCategories.FORMATION'),
    EVENEMENT: t('opportunityCategories.EVENEMENT'),
    APPEL_PROJET: t('opportunityCategories.APPEL_PROJET'),
    PUBLICITE: t('opportunityCategories.PUBLICITE'),
  };
  return labels[category] || t('partnerSpace.opportunity', { defaultValue: 'Opportunité' });
}

function opportunityModeLabel(mode, t) {
  return t(`opportunityFields.modes.${mode}`, { defaultValue: mode || '-' });
}

function opportunityTargetLabel(target, t) {
  return t(`opportunityFields.targets.${target}`, { defaultValue: target || '-' });
}

function opportunityStatusLabel(status, t) {
  const labels = {
    EN_ATTENTE: t('opportunityModeration.EN_ATTENTE'),
    PUBLIEE: t('opportunityModeration.PUBLIEE'),
    REFUSEE: t('opportunityModeration.REFUSEE'),
  };
  return labels[status] || status || '';
}

function opportunityStatusStyle(status) {
  const styles = {
    EN_ATTENTE: 'bg-amber-100 text-amber-800',
    PUBLIEE: 'bg-green-100 text-green-700',
    REFUSEE: 'bg-red-100 text-red-700',
  };
  return styles[status] || 'bg-slate-100 text-slate-700';
}

function buildAnnouncementFilters(t, annonces) {
  return [
    { id: 'TOUT', label: t('announcements.filters.all'), count: annonces.length },
    { id: 'ANNONCES', label: t('announcements.filters.announcements'), count: annonces.filter(a => !a.categorieOpportunite).length },
    { id: 'OPPORTUNITES', label: t('announcements.filters.opportunities'), count: annonces.filter(a => a.categorieOpportunite).length },
    ...OPPORTUNITY_CATEGORIES.map(category => ({
      id: category,
      label: opportunityCategoryLabel(category, t),
      count: annonces.filter(a => a.categorieOpportunite === category).length,
    })),
  ];
}

function formatDeadline(value, language, t) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const today = startOfDay(new Date());
  const target = startOfDay(date);
  const days = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (days === 0) return t('announcements.deadlineToday');
  if (days === 1) return t('announcements.deadlineTomorrow');
  if (days > 1 && days <= 30) return t('announcements.deadlineInDays', { count: days });
  return date.toLocaleDateString(language || 'fr-BE', { day: '2-digit', month: 'short' });
}

function formatShortDate(value, language) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(language || 'fr-BE', { day: '2-digit', month: 'short' });
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function normalizeExternalUrl(value) {
  if (!value) return '#';
  const trimmed = String(value).trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}
