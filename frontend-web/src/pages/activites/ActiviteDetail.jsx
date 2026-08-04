import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import api from '../../api/axios';
import { userFriendlyError } from '../../utils/userFriendlyError';
import StatusBadge from '../../components/StatusBadge';
import ActivityCover from '../../components/ActivityCover';
import AppIcon from '../../components/ui/AppIcons';
import LoadingState from '../../components/ui/LoadingState';
import ErrorState from '../../components/ui/ErrorState';

async function fetchActivite({ id, t, setActivite, setError, setLoading }) {
  try {
    const res = await api.get(`/activites/${id}`);
    setActivite(res.data);
  } catch {
    setError(t('activities.not_found'));
  } finally {
    setLoading(false);
  }
}

export default function ActiviteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, isMembre } = useAuth();
  const { t, i18n } = useTranslation();
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);

  const [activite, setActivite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchActivite({ id, t, setActivite, setError, setLoading });
  }, [id, t]);

  const locationDetails = useMemo(() => buildLocationDetails(activite), [activite]);

  useEffect(() => {
    if (!locationDetails?.hasCoordinates || !mapContainerRef.current) return undefined;

    const coordinates = [locationDetails.latitude, locationDetails.longitude];
    const map = L.map(mapContainerRef.current, {
      scrollWheelZoom: false,
      attributionControl: true,
    }).setView(coordinates, 14);
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    L.marker(coordinates, {
      icon: L.divIcon({
        className: '',
        html: '<span style="display:block;width:18px;height:18px;border-radius:999px;background:#1d4ed8;border:3px solid white;box-shadow:0 8px 20px rgba(15,23,42,.25)"></span>',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      }),
    })
      .addTo(map)
      .bindPopup(locationDetails.label || activite?.titre || 'BX-Connect');

    setTimeout(() => map.invalidateSize(), 0);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [activite?.titre, locationDetails]);

  const handleInscrire = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (!isMembre || !activite?.peutSInscrire) return;
    setActionLoading(true);
    setError('');
    setMessage('');
    try {
      const response = await api.post('/inscriptions', { activiteId: parseInt(id) });
      setMessage(registrationSuccessMessage(response.data, activite, t));
      await fetchActivite({ id, t, setActivite, setError, setLoading });
    } catch (err) {
      setError(userFriendlyError(err, t('activities.error_register')));
    } finally {
      setActionLoading(false);
    }
  };

  const handleAnnulerInscription = async () => {
    if (!activite?.inscriptionId) return;
    setActionLoading(true);
    setError('');
    setMessage('');
    try {
      await api.delete(`/inscriptions/${activite.inscriptionId}`);
      setMessage(t('activities.success_cancel_registration'));
      await fetchActivite({ id, t, setActivite, setError, setLoading });
    } catch (err) {
      setError(userFriendlyError(err, t('activities.error_cancel_registration')));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-10">
        <LoadingState label={t('common.loading')} />
      </main>
      <Footer />
    </div>
  );

  if (error && !activite) return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-10">
        <ErrorState
          title={t('activities.not_found')}
          description={error}
          actionLabel={t('activities.back_to_activities')}
          action={() => navigate('/activites')}
        />
      </main>
      <Footer />
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-10">

        {/* Retour */}
        <button
          onClick={() => navigate('/activites')}
          className="text-blue-700 hover:underline text-sm mb-6 flex items-center gap-1"
        >
          {t('activities.back_to_activities')}
        </button>

        {/* Messages */}
        {message && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4 text-sm">{message}</div>}
        {error   && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">{error}</div>}

        <div className="overflow-hidden rounded-xl bg-white shadow">
          <div className="relative">
            <ActivityCover
              imageUrl={activite.imageUrl}
              title={activite.titre}
              categorie={activite.categorie}
              theme={activite.theme}
              className="h-64 sm:h-72 lg:h-80"
            />
            <div className="absolute left-5 top-5">
              <StatusBadge status={activite.statut}>
                {t(`statuses.${activite.statut}`, { defaultValue: activite.statut })}
              </StatusBadge>
            </div>
          </div>

          <div className="grid lg:grid-cols-[1fr_320px] gap-8 p-6 md:p-8">
            <section className="min-w-0">
              <div className="border-b border-slate-100 pb-5">
                <div className="flex flex-wrap gap-2">
                  {activite.categorie && (
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                      {activite.categorie}
                    </span>
                  )}
                  {activite.theme && (
                    <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-medium text-teal-700">
                      {activite.theme}
                    </span>
                  )}
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                    activite.gratuite ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                  }`}>
                    {activite.gratuite ? t('activities.free') : t('activities.price_value', { price: activite.prix })}
                  </span>
                </div>
                <h1 className="mt-4 text-3xl font-bold leading-tight text-blue-900">{activite.titre}</h1>
                {(locationDetails?.label || activite.dateDebut) && (
                  <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold text-slate-500">
                    {locationDetails?.label && (
                      <span className="inline-flex items-center gap-1.5">
                        <AppIcon name="MapPin" className="h-4 w-4 text-blue-600" />
                        {locationDetails.label}
                      </span>
                    )}
                    {activite.dateDebut && (
                      <span className="inline-flex items-center gap-1.5">
                        <AppIcon name="Calendar" className="h-4 w-4 text-blue-600" />
                        {new Date(activite.dateDebut).toLocaleDateString(i18n.language || 'fr-BE')}
                      </span>
                    )}
                  </p>
                )}
              </div>

              {activite.description && (
                <section className="mt-6 rounded-lg border border-slate-100 bg-slate-50 px-5 py-4">
                  <h2 className="text-sm font-black uppercase tracking-wide text-slate-500">
                    {t('activities.description')}
                  </h2>
                  <p className="mt-3 whitespace-pre-line text-sm leading-7 text-gray-600">
                    {activite.description}
                  </p>
                </section>
              )}
            </section>

            <aside className="h-fit rounded-xl bg-gray-50 p-5">
              <div className="grid gap-4">
              {locationDetails?.label && (
                <InfoBlock>
                  <p className="text-xs text-gray-400 font-semibold uppercase mb-1">{t('activities.form_place')}</p>
                  <p className="text-sm font-semibold text-gray-700">{locationDetails.label}</p>
                </InfoBlock>
              )}
              {activite.dateDebut && (
                <InfoBlock>
                  <p className="text-xs text-gray-400 font-semibold uppercase mb-1">{t('activities.start_date')}</p>
                  <p className="text-sm font-semibold text-gray-700">
                    {new Date(activite.dateDebut).toLocaleDateString(i18n.language || 'fr-BE', {
                      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                </InfoBlock>
              )}
              {activite.dateFin && (
                <InfoBlock>
                  <p className="text-xs text-gray-400 font-semibold uppercase mb-1">{t('activities.end_date')}</p>
                  <p className="text-sm font-semibold text-gray-700">
                    {new Date(activite.dateFin).toLocaleDateString(i18n.language || 'fr-BE', {
                      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                </InfoBlock>
              )}
              {activite.capaciteMax > 0 && (
                <InfoBlock>
                  <p className="text-xs text-gray-400 font-semibold uppercase mb-1">{t('activities.capacity')}</p>
                  <p className="text-sm font-semibold text-gray-700">{t('activities.people_max', { count: activite.capaciteMax })}</p>
                </InfoBlock>
              )}
              {activite.createurPrenom && (
                <InfoBlock>
                  <p className="text-xs text-gray-400 font-semibold uppercase mb-1">{t('activities.organizer')}</p>
                  <p className="text-sm font-semibold text-gray-700">{activite.createurPrenom} {activite.createurNom}</p>
                </InfoBlock>
              )}
              </div>

              {locationDetails?.routeUrl && (
                <div className="mt-5 rounded-lg border border-blue-100 bg-white p-3">
                  {locationDetails.hasCoordinates ? (
                    <div
                      ref={mapContainerRef}
                      className="h-48 overflow-hidden rounded-xl border border-slate-100"
                      aria-label={t('activities.locationMapAria')}
                    />
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm font-semibold text-slate-500">
                      {t('groups.addressWithoutCoordinates')}
                    </div>
                  )}
                  <a
                    href={locationDetails.routeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-600"
                  >
                    <AppIcon name="MapPin" className="h-4 w-4" />
                    {t('location.openRoute')}
                  </a>
                </div>
              )}

              <div className="flex flex-col gap-3 mt-5">
              <DetailActivityAction
                activite={activite}
                isAuthenticated={isAuthenticated}
                isMembre={isMembre}
                loading={actionLoading}
                onRegister={handleInscrire}
                onCancelRegistration={handleAnnulerInscription}
                t={t}
              />

              {/* Retour */}
              <button
                onClick={() => navigate('/activites')}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-6 py-3 rounded-xl transition"
              >
                {t('activities.back_to_list')}
              </button>
              </div>
            </aside>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function InfoBlock({ children }) {
  return <div className="border-b border-white pb-3 last:border-0 last:pb-0">{children}</div>;
}

function DetailActivityAction({ activite, isAuthenticated, isMembre, loading, onRegister, onCancelRegistration, t }) {
  const situation = getActivitySituation(activite, t);

  if (situation.key === 'registered') {
    return (
      <div className="space-y-2">
        <div className="bg-green-50 border border-green-200 text-green-700 px-6 py-3 rounded-xl text-sm font-semibold">
          {situation.label}
        </div>
        <button
          type="button"
          disabled={loading}
          onClick={onCancelRegistration}
          className="w-full rounded-xl border border-amber-200 bg-amber-50 px-6 py-3 text-sm font-semibold text-amber-800 transition hover:bg-amber-100 disabled:opacity-60"
        >
          {t('activities.cancel_registration')}
        </button>
      </div>
    );
  }

  if (situation.key !== 'open') {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-100 px-6 py-3 text-sm font-semibold text-slate-600">
        {situation.label}
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <button
        type="button"
        onClick={onRegister}
        className="bg-blue-700 hover:bg-blue-600 text-white font-semibold px-6 py-3 rounded-xl transition text-center"
      >
        {t('activities.login_to_register')}
      </button>
    );
  }

  if (situation.key === 'open' && isMembre) {
    return (
      <button
        type="button"
        disabled={loading}
        onClick={onRegister}
        className="bg-blue-700 hover:bg-blue-600 disabled:opacity-60 text-white font-semibold px-6 py-3 rounded-xl transition text-center"
      >
        {loading ? t('common.saving') : t('activities.register_this')}
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-100 px-6 py-3 text-sm font-semibold text-slate-600">
      {t('activities.memberOnlyRegistration')}
    </div>
  );
}

function buildLocationDetails(activite) {
  if (!activite) return null;

  const rawLatitude = activite.latitude;
  const rawLongitude = activite.longitude;
  const latitude = Number(rawLatitude);
  const longitude = Number(rawLongitude);
  const hasCoordinates =
    rawLatitude !== null &&
    rawLatitude !== undefined &&
    rawLatitude !== '' &&
    rawLongitude !== null &&
    rawLongitude !== undefined &&
    rawLongitude !== '' &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude);
  const label = [activite.adresse, activite.commune].filter(Boolean).join(', ') || activite.lieu || '';
  const routeQuery = hasCoordinates ? `${latitude},${longitude}` : label;

  if (!routeQuery) return null;

  return {
    latitude,
    longitude,
    hasCoordinates,
    label,
    routeUrl: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(routeQuery)}`,
  };
}

function getActivitySituation(activity, t) {
  if (activity?.inscrit || activity?.inscriptionId || activity?.statutInscription) {
    const label = activity.statutInscription === 'EN_ATTENTE_PAIEMENT'
      ? t('activities.payment_required')
      : t('activities.already_registered');
    return { key: 'registered', label };
  }
  if (activity?.peutSInscrire === false && activity?.raisonIndisponible) {
    return {
      key: reasonToSituationKey(activity.raisonIndisponible),
      label: unavailableReasonLabel(activity.raisonIndisponible, t),
    };
  }
  if (['TERMINEE', 'TERMINE'].includes(activity?.statut) || (activity?.dateFin && new Date(activity.dateFin) < new Date())) {
    return { key: 'done', label: t('activities.done') };
  }
  if (isActivityFull(activity)) {
    return { key: 'full', label: t('activities.full') };
  }
  if (activity?.statut === 'PUBLIEE') {
    return { key: 'open', label: t('activities.registrationOpen') };
  }
  return { key: 'closed', label: t(`statuses.${activity?.statut}`, { defaultValue: activity?.statut || t('activities.registrationUnavailable') }) };
}

function isActivityFull(activity) {
  const capacity = Number(activity?.capaciteMax);
  const registered = Number(activity?.nombreInscrits ?? activity?.nombreParticipants ?? activity?.inscriptionsCount);
  return capacity > 0 && registered >= capacity;
}

function registrationSuccessMessage(inscription, activity, t) {
  if (inscription?.statut === 'EN_ATTENTE_PAIEMENT' || activity?.gratuite === false) {
    return t('activities.success_register_payment_required');
  }
  return t('activities.success_register');
}

function unavailableReasonLabel(reason, t) {
  return t(`activities.unavailableReasons.${reason}`, {
    defaultValue: t('activities.registrationUnavailable'),
  });
}

function reasonToSituationKey(reason) {
  if (reason === 'DEJA_INSCRIT') return 'registered';
  if (reason === 'COMPLETE') return 'full';
  if (['PASSEE', 'TERMINEE'].includes(reason)) return 'done';
  if (reason === 'ANNULEE') return 'cancelled';
  return 'closed';
}
