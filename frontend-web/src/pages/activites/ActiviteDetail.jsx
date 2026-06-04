import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import api from '../../api/axios';
import { userFriendlyError } from '../../utils/userFriendlyError';
import StatusBadge from '../../components/StatusBadge';
import ActivityCover from '../../components/ActivityCover';
import AppIcon from '../../components/ui/AppIcons';

export default function ActiviteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { t, i18n } = useTranslation();

  const [activite, setActivite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [inscrit, setInscrit] = useState(false);

  useEffect(() => {
    fetchActivite();
  }, [id]);

  const fetchActivite = async () => {
    try {
      const res = await api.get(`/activites/${id}`);
      setActivite(res.data);
    } catch {
      setError(t('activities.not_found'));
    } finally {
      setLoading(false);
    }
  };

  const handleInscrire = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    try {
      await api.post('/inscriptions', { activiteId: parseInt(id) });
      setMessage(t('activities.success_register'));
      setInscrit(true);
    } catch (err) {
      setError(userFriendlyError(err, t('activities.error_register')));
    }
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1 flex items-center justify-center">
        <p className="text-gray-400">{t('common.loading')}</p>
      </main>
      <Footer />
    </div>
  );

  if (error && !activite) return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <AppIcon name="AlertTriangle" className="mx-auto mb-4 h-12 w-12 text-orange-300" />
          <p className="text-gray-500">{error}</p>
          <button onClick={() => navigate('/activites')} className="mt-4 text-blue-700 hover:underline text-sm">
            {t('activities.back_to_activities')}
          </button>
        </div>
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

        <div className="bg-white rounded-2xl shadow overflow-hidden">
          <div className="relative">
            <ActivityCover imageUrl={activite.imageUrl} title={activite.titre} className="h-72" />
            <div className="absolute left-5 top-5">
              <StatusBadge status={activite.statut}>
                {t(`statuses.${activite.statut}`, { defaultValue: activite.statut })}
              </StatusBadge>
            </div>
          </div>

          <div className="grid lg:grid-cols-[1fr_320px] gap-8 p-6 md:p-8">
            <section>
              <h1 className="text-3xl font-bold text-blue-900 leading-tight">{activite.titre}</h1>
              {activite.description && (
                <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line mt-4">
                  {activite.description}
                </p>
              )}

              <div className="flex flex-wrap gap-2 mt-6">
              {activite.categorie && (
                <span className="bg-blue-100 text-blue-700 text-xs px-3 py-1 rounded-full font-medium">
                  {activite.categorie}
                </span>
              )}
              {activite.theme && (
                <span className="bg-teal-100 text-teal-700 text-xs px-3 py-1 rounded-full font-medium">
                  {activite.theme}
                </span>
              )}
              <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                activite.gratuite ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
              }`}>
                {activite.gratuite ? t('activities.free') : t('activities.price_value', { price: activite.prix })}
              </span>
              </div>
            </section>

            <aside className="bg-gray-50 rounded-2xl p-5 h-fit">
              <div className="grid gap-4">
              {activite.lieu && (
                <InfoBlock>
                  <p className="text-xs text-gray-400 font-semibold uppercase mb-1">{t('activities.form_place')}</p>
                  <p className="text-sm font-semibold text-gray-700">{activite.lieu}</p>
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

              <div className="flex flex-col gap-3 mt-5">
              {/* S'inscrire */}
              {activite.statut === 'PUBLIEE' && !inscrit && (
                <button
                  onClick={handleInscrire}
                  className="bg-blue-700 hover:bg-blue-600 text-white font-semibold px-6 py-3 rounded-xl transition text-center"
                >
                  {isAuthenticated ? t('activities.register_this') : t('activities.login_to_register')}
                </button>
              )}
              {inscrit && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-6 py-3 rounded-xl text-sm font-semibold">
                  {t('activities.already_registered')}
                </div>
              )}

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
