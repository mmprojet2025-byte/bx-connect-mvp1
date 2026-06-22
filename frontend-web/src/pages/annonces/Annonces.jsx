import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import api from '../../api/axios';
import AppIcon from '../../components/ui/AppIcons';

const OPPORTUNITY_CATEGORIES = ['EMPLOI', 'STAGE', 'FORMATION', 'EVENEMENT', 'APPEL_PROJET', 'PUBLICITE'];

export default function Annonces() {
  const { t } = useTranslation();
  const { user, isAuthenticated, isAdmin, isReferent } = useAuth();
  const [annonces, setAnnonces] = useState([]);
  const [adminOpportunities, setAdminOpportunities] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('TOUTES');
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
  const hasOpportunities = annonces.some(a => a.categorieOpportunite);
  const filteredAnnonces = categoryFilter === 'TOUTES'
    ? annonces
    : annonces.filter(a => a.categorieOpportunite === categoryFilter);
  const annonceStats = {
    total: annonces.length,
    globales: annonces.filter(a => a.type === 'GLOBALE').length,
    groupes: annonces.filter(a => a.type === 'GROUPE').length,
    opportunites: annonces.filter(a => a.categorieOpportunite).length,
  };

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

  const typeStyle = (type) => {
    switch (type) {
      case 'GLOBALE': return 'bg-blue-100 text-blue-700';
      case 'GROUPE':  return 'bg-purple-100 text-purple-700';
      case 'SYSTEME': return 'bg-gray-100 text-gray-600';
      default:        return 'bg-gray-100 text-gray-600';
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
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-600">
              <AppIcon name={showForm ? 'XCircle' : 'PlusCircle'} className="h-4 w-4" />
              {showForm ? 'Annuler' : 'Nouvelle annonce'}
            </button>
          )}
        </div>

        <div className="mb-5 grid gap-3 sm:grid-cols-4">
          <AnnouncementKpi icon="Megaphone" label={t('nav.announcements')} value={annonceStats.total} />
          <AnnouncementKpi icon="Globe" label={t('announcements.globalPlural')} value={annonceStats.globales} tone="blue" />
          <AnnouncementKpi icon="Users" label={t('nav.groups')} value={annonceStats.groupes} tone="purple" />
          <AnnouncementKpi icon="Handshake" label={t('partnerSpace.opportunities')} value={annonceStats.opportunites} tone="orange" />
        </div>

        {message && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4 text-sm">{message}</div>}
        {error   && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">{error}</div>}

        {isAdmin && (
          <section className="mb-5 rounded-2xl border border-amber-100 bg-white p-4 shadow-sm">
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
            ) : adminOpportunities.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-center text-sm font-semibold text-slate-500">
                {t('announcements.noOpportunitiesToModerate')}
              </div>
            ) : (
              <div className="space-y-2.5">
                {adminOpportunities.map(opportunity => (
                  <article key={opportunity.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
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
                            className="inline-flex items-center gap-1.5 rounded-xl bg-green-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-green-500 disabled:opacity-50"
                          >
                            <AppIcon name="CheckCircle" className="h-3.5 w-3.5" />
                            {t('common.publish')}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleModerateOpportunity(opportunity.id, 'refuser')}
                            disabled={opportunityActionId === `refuser-${opportunity.id}` || opportunityActionId === `publier-${opportunity.id}`}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
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

        {hasOpportunities && (
          <div className="mb-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCategoryFilter('TOUTES')}
              className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${categoryFilter === 'TOUTES' ? 'bg-blue-700 text-white' : 'bg-white text-slate-600 hover:bg-blue-50'}`}
            >
              {t('common.all')}
            </button>
            {OPPORTUNITY_CATEGORIES.map(category => (
              <button
                key={category}
                type="button"
                onClick={() => setCategoryFilter(category)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${categoryFilter === category ? 'bg-blue-700 text-white' : 'bg-white text-slate-600 hover:bg-blue-50'}`}
              >
                {opportunityCategoryLabel(category, t)}
              </button>
            ))}
          </div>
        )}

        {/* Formulaire */}
        {showForm && peutPublier && (
          <div className="bg-white rounded-2xl shadow p-5 mb-5">
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
              <button type="submit" className="inline-flex items-center gap-2 rounded-2xl bg-blue-700 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-600">
                <AppIcon name="Megaphone" className="h-4 w-4" />
                {t('announcements.publish')}
              </button>
            </form>
          </div>
        )}

        {/* Liste */}
        {loading ? (
          <p className="text-gray-400 text-center py-10">{t('common.loading')}</p>
        ) : filteredAnnonces.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl shadow">
            <AppIcon name="Megaphone" className="mx-auto mb-3 h-10 w-10 text-blue-300" />
            <p className="text-gray-400 text-sm">{t('announcements.empty')}</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredAnnonces.map(a => (
              <div key={a.id} className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-4 ${a.epinglee ? 'border-l-4 border-blue-500' : ''}`}>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {a.epinglee && <AppIcon name="Pin" className="h-4 w-4 text-blue-500" />}
                    <h3 className="font-bold text-blue-900">{a.titre}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeStyle(a.type)}`}>
                      {a.type === 'GLOBALE' ? t('announcements.global') : a.type === 'GROUPE' ? a.groupeNom : t('announcements.system')}
                    </span>
                    {a.categorieOpportunite && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-700">
                        <AppIcon name="Megaphone" className="h-3 w-3" />
                        {opportunityCategoryLabel(a.categorieOpportunite, t)}
                      </span>
                    )}
                    {a.statutModeration && a.categorieOpportunite && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${opportunityStatusStyle(a.statutModeration)}`}>
                        {opportunityStatusLabel(a.statutModeration, t)}
                      </span>
                    )}
                  </div>
                  {(isAdmin || (isReferent && a.auteurEmail === user?.email)) && (
                    <div className="flex gap-2">
                      {isAdmin && (
                        <button onClick={() => handleEpingler(a.id)}
                          className="text-xs text-blue-600 hover:underline">
                          {a.epinglee ? t('announcements.unpin') : t('announcements.pin')}
                        </button>
                      )}
                      <button onClick={() => handleSupprimer(a.id)}
                        className="text-xs text-red-500 hover:underline">
                        {t('common.delete')}
                      </button>
                    </div>
                  )}
                </div>
                {a.descriptionCourte && (
                  <p className="mb-2 text-sm font-semibold leading-relaxed text-slate-700">{a.descriptionCourte}</p>
                )}
                <p className="text-gray-600 text-sm leading-relaxed mb-3 whitespace-pre-line line-clamp-4">{a.contenu}</p>
                {a.lienExterne && (
                  <a
                    href={normalizeExternalUrl(a.lienExterne)}
                    target="_blank"
                    rel="noreferrer"
                    className="mb-3 inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-800 transition hover:border-blue-700 hover:bg-blue-700 hover:text-white"
                  >
                    <AppIcon name="Globe" className="h-3.5 w-3.5" />
                    {t('announcements.openLink')}
                  </a>
                )}
                <p className="text-xs text-gray-400">
                  {t('common.by')} {a.auteurPrenom} {a.auteurNom} ({a.auteurRole}) ·{' '}
                  {new Date(a.dateCreation).toLocaleDateString('fr-BE', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                  })}
                </p>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

function AnnouncementKpi({ icon, label, value, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-50 text-slate-700',
    blue: 'bg-blue-50 text-blue-700',
    purple: 'bg-purple-50 text-purple-700',
    orange: 'bg-orange-50 text-orange-700',
  };
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{label}</p>
          <p className="mt-1 text-xl font-black text-slate-950">{value}</p>
        </div>
        <span className={`grid h-9 w-9 place-items-center rounded-xl ${tones[tone] || tones.slate}`}>
          <AppIcon name={icon} className="h-4 w-4" />
        </span>
      </div>
    </div>
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

function normalizeExternalUrl(value) {
  if (!value) return '#';
  const trimmed = String(value).trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}
