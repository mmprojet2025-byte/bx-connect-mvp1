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

export default function Activites() {
  const { isAuthenticated, isAdmin, isReferent } = useAuth();
  const { t, i18n } = useTranslation();

  const [activites, setActivites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [recherche, setRecherche] = useState('');
  const [filtreCategorie, setFiltreCategorie] = useState('');
  const [filtreGratuite, setFiltreGratuite] = useState('');
  const [options, setOptions] = useState({ categories: [], themes: [], lieux: [] });
  const [actionLoading, setActionLoading] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [nearbyMode, setNearbyMode] = useState(false);
  const [geoStatus, setGeoStatus] = useState('idle');
  const [geoMessage, setGeoMessage] = useState('');
  const peutGerer = isAdmin || isReferent;
  const gestionLink = isAdmin ? '/admin/activites' : '/referent/activites';
  const gestionLabel = isAdmin
    ? t('activities.manageActivities', { defaultValue: 'Gérer les activités' })
    : t('activities.manageMyActivities', { defaultValue: 'Gérer mes activités' });

  useEffect(() => {
    fetchActivites();
    fetchOptions();
  }, []);

  const fetchActivites = async () => {
    try {
      setError('');
      const res = await api.get('/activites');
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
  const activityStats = useMemo(() => {
    const ouvertes = activites.filter(activite => getActivitySituation(activite, t).key === 'open').length;
    const gratuites = activites.filter(activite => activite.gratuite).length;
    return { total: activites.length, ouvertes, gratuites };
  }, [activites, t]);

  const activitesAffichees = useMemo(() => {
    const filtered = activites
      .map(activite => ({
        ...activite,
        distanceKm: userLocation ? calculateDistanceKm(userLocation, activite) : null,
      }));

    if (!nearbyMode || !userLocation) return filtered;

    return filtered.sort((a, b) => {
      const distanceA = Number.isFinite(a.distanceKm) ? a.distanceKm : Number.POSITIVE_INFINITY;
      const distanceB = Number.isFinite(b.distanceKm) ? b.distanceKm : Number.POSITIVE_INFINITY;
      return distanceA - distanceB;
    });
  }, [activites, nearbyMode, userLocation]);

  const handleFiltrer = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (recherche)       params.append('q', recherche);
      if (filtreCategorie) params.append('categorie', filtreCategorie);
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
    setFiltreGratuite('');
    setNearbyMode(false);
    fetchActivites();
  };

  const handleNearbyActivities = () => {
    setGeoMessage('');
    if (!navigator.geolocation) {
      setNearbyMode(false);
      setGeoStatus('error');
      setGeoMessage(t('activities.geoUnavailable'));
      return;
    }

    setGeoStatus('loading');
    navigator.geolocation.getCurrentPosition(
      position => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setNearbyMode(true);
        setGeoStatus('success');
        setGeoMessage(t('activities.geoSuccess'));
      },
      geoError => {
        setNearbyMode(false);
        setGeoStatus('error');
        setGeoMessage(getGeolocationErrorMessage(geoError, t));
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  };

  const handleStopNearbyMode = () => {
    setNearbyMode(false);
    setUserLocation(null);
    setGeoStatus('idle');
    setGeoMessage('');
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

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">

        <PageHeader
          eyebrow={t('nav.activities')}
          title={t('activities.title')}
          description={t('ux.activities.intro', { defaultValue: 'Découvre les activités, ateliers et événements de la communauté BX-Connect.' })}
          action={peutGerer && (
            <Link
              to={gestionLink}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-blue-100 bg-white px-4 py-2 text-sm font-bold text-blue-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50"
            >
              <AppIcon name="Settings" className="h-4 w-4" />
              {gestionLabel}
            </Link>
          )}
        />

        {/* Messages */}
        {message && <Alert>{message}</Alert>}
        {error && activites.length > 0 && <Alert type="error">{error}</Alert>}

        <section className="mb-5 grid gap-3 sm:grid-cols-4">
          <ActivityStat icon="Calendar" label={t('nav.activities', { defaultValue: 'Activités' })} value={activityStats.total} />
          <ActivityStat icon="CheckCircle" label={t('activities.registrationOpen', { defaultValue: 'Inscriptions ouvertes' })} value={activityStats.ouvertes} tone="green" />
          <ActivityStat icon="Star" label={t('activities.free_only', { defaultValue: 'Gratuites' })} value={activityStats.gratuites} tone="blue" />
          <ActivityStat icon="Users" label={t('activities.myRegistrations', { defaultValue: 'Mes inscriptions' })} value={inscriptionsVisibles} tone="amber" />
        </section>

        <UpcomingActivitiesStrip
          activities={prochainesActivites}
          registrationsCount={inscriptionsVisibles}
          t={t}
          language={i18n.language}
        />

        <section className="mb-5 rounded-2xl border border-blue-100 bg-white px-4 py-3 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <h2 className="inline-flex items-center gap-2 text-sm font-black text-slate-950">
                <AppIcon name="MapPin" className="h-4 w-4 text-blue-700" />
                {t('activities.nearbyTitle')}
              </h2>
              <p className="mt-0.5 text-xs leading-5 text-slate-500">
                {t('activities.nearbyPrivacy')}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleNearbyActivities}
                disabled={geoStatus === 'loading'}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-xs font-black text-white transition hover:bg-blue-600 disabled:opacity-60"
              >
                <AppIcon name="MapPin" className="h-3.5 w-3.5" />
                {geoStatus === 'loading' ? t('activities.locating') : t('activities.nearbyButton')}
              </button>
              {nearbyMode && (
                <button
                  type="button"
                  onClick={handleStopNearbyMode}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-200"
                >
                  {t('activities.normalSort')}
                </button>
              )}
            </div>
          </div>
          {geoMessage && (
            <div className={`mt-3 rounded-xl px-3 py-2 text-xs font-semibold ${
              geoStatus === 'error' ? 'bg-amber-50 text-amber-800' : 'bg-blue-50 text-blue-800'
            }`}>
              {geoMessage}
            </div>
          )}
        </section>

        <div className="bg-white rounded-[1.25rem] border border-slate-100 shadow-sm p-4 mb-5">
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
              value={filtreGratuite}
              onChange={e => setFiltreGratuite(e.target.value)}
              className="border border-gray-300 rounded-xl px-4 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">{t('activities.free_and_paid')}</option>
              <option value="true">{t('activities.free_only')}</option>
              <option value="false">{t('activities.paid_only')}</option>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activitesAffichees.map(a => (
              <ActivityCard
                key={a.id}
                activity={a}
                isAuthenticated={isAuthenticated}
                actionLoading={actionLoading === a.id}
                onRegister={() => handleInscrire(a.id)}
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
    <section className="mb-5 rounded-[1.25rem] border border-slate-100 bg-white p-4 shadow-sm">
      <div className="mb-3">
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

function ActivityCard({ activity, isAuthenticated, actionLoading, onRegister, t, language }) {
  const situation = getActivitySituation(activity, t)
  return (
    <article className="bg-white rounded-[1.25rem] border border-slate-100 shadow-sm overflow-hidden hover:-translate-y-0.5 hover:shadow-lg transition flex flex-col">
      <div className="relative">
        <ActivityCover
          imageUrl={activity.imageUrl}
          title={activity.titre}
          categorie={activity.categorie}
          theme={activity.theme}
          className="h-32"
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

        <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
          <InfoPill label={t('activities.form_place')} value={formatActivityLocation(activity)} />
          <InfoPill
            label={t('activities.start_date')}
            value={activity.dateDebut ? new Date(activity.dateDebut).toLocaleDateString(language || 'fr-BE') : '—'}
          />
          {Number.isFinite(activity.distanceKm) && (
            <InfoPill
              label={t('activities.distance')}
              value={`${activity.distanceKm.toFixed(activity.distanceKm < 10 ? 1 : 0)} km`}
              highlight
            />
          )}
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

          {renderActivityAction({ isAuthenticated, situation, actionLoading, onRegister, t })}
        </div>
      </div>
    </article>
  )
}

function renderActivityAction({ isAuthenticated, situation, actionLoading, onRegister, t }) {
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

function getActivitySituation(activity, t) {
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

function formatActivityLocation(activity) {
  return [activity.adresse, activity.commune].filter(Boolean).join(', ') || activity.lieu || '—';
}

function calculateDistanceKm(origin, activity) {
  const latitude = Number(activity.latitude);
  const longitude = Number(activity.longitude);
  if (
    !Number.isFinite(origin?.latitude) ||
    !Number.isFinite(origin?.longitude) ||
    activity.latitude === null ||
    activity.latitude === undefined ||
    activity.latitude === '' ||
    activity.longitude === null ||
    activity.longitude === undefined ||
    activity.longitude === '' ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return null;
  }

  const earthRadiusKm = 6371;
  const deltaLatitude = toRadians(latitude - origin.latitude);
  const deltaLongitude = toRadians(longitude - origin.longitude);
  const originLatitude = toRadians(origin.latitude);
  const activityLatitude = toRadians(latitude);
  const haversine =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(originLatitude) * Math.cos(activityLatitude) * Math.sin(deltaLongitude / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function getGeolocationErrorMessage(error, t) {
  if (error?.code === 1) {
    return t('activities.geoPermissionDenied');
  }
  if (error?.code === 2) {
    return t('activities.geoPositionUnavailable');
  }
  if (error?.code === 3) {
    return t('activities.geoTimeout');
  }
  return t('activities.geoGenericError');
}

function InfoPill({ label, value, highlight = false }) {
  return (
    <div className={`rounded-xl px-3 py-2 ${highlight ? 'bg-red-50' : 'bg-slate-50'}`}>
      <p className={`text-[10px] font-semibold uppercase ${highlight ? 'text-red-500' : 'text-slate-400'}`}>{label}</p>
      <p className={`mt-0.5 font-semibold truncate ${highlight ? 'text-red-700' : 'text-slate-700'}`}>{value}</p>
    </div>
  );
}

function ActivityStat({ icon, label, value, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-50 text-slate-700',
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    amber: 'bg-amber-50 text-amber-700',
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
