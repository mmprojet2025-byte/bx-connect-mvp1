import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import api from '../../api/axios';

export default function ActiviteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin, isReferent } = useAuth();
  const { t } = useTranslation();

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
      setError('Activité introuvable.');
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
      setMessage('✅ Inscription réussie !');
      setInscrit(true);
    } catch (err) {
      setError(err.response?.data?.message || "Erreur lors de l'inscription.");
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
          <div className="text-5xl mb-4">😕</div>
          <p className="text-gray-500">{error}</p>
          <button onClick={() => navigate('/activites')} className="mt-4 text-blue-700 hover:underline text-sm">
            ← Retour aux activités
          </button>
        </div>
      </main>
      <Footer />
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-10">

        {/* Retour */}
        <button
          onClick={() => navigate('/activites')}
          className="text-blue-700 hover:underline text-sm mb-6 flex items-center gap-1"
        >
          ← Retour aux activités
        </button>

        {/* Messages */}
        {message && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4 text-sm">{message}</div>}
        {error   && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">{error}</div>}

        <div className="bg-white rounded-2xl shadow overflow-hidden">
          {/* Image */}
          {activite.imageUrl ? (
            <img src={activite.imageUrl} alt={activite.titre} className="w-full h-64 object-cover" />
          ) : (
            <div className="w-full h-48 bg-blue-50 flex items-center justify-center text-6xl">🎯</div>
          )}

          <div className="p-8">
            {/* En-tête */}
            <div className="flex justify-between items-start mb-4">
              <h1 className="text-2xl font-bold text-blue-900 flex-1 mr-4">{activite.titre}</h1>
              <span className={`text-sm px-3 py-1 rounded-full text-white font-semibold ${
                activite.statut === 'PUBLIEE' ? 'bg-green-500' :
                activite.statut === 'ANNULEE' ? 'bg-red-500' :
                activite.statut === 'TERMINEE' ? 'bg-gray-500' : 'bg-yellow-500'
              }`}>{activite.statut}</span>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2 mb-6">
              {activite.categorie && (
                <span className="bg-blue-100 text-blue-700 text-xs px-3 py-1 rounded-full font-medium">
                  🏷️ {activite.categorie}
                </span>
              )}
              {activite.theme && (
                <span className="bg-purple-100 text-purple-700 text-xs px-3 py-1 rounded-full font-medium">
                  🎨 {activite.theme}
                </span>
              )}
              <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                activite.gratuite ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
              }`}>
                {activite.gratuite ? '🆓 Gratuit' : `💶 ${activite.prix} €`}
              </span>
            </div>

            {/* Infos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-xl">
              {activite.lieu && (
                <div>
                  <p className="text-xs text-gray-400 font-semibold uppercase mb-1">Lieu</p>
                  <p className="text-sm text-gray-700">📍 {activite.lieu}</p>
                </div>
              )}
              {activite.dateDebut && (
                <div>
                  <p className="text-xs text-gray-400 font-semibold uppercase mb-1">Date de début</p>
                  <p className="text-sm text-gray-700">
                    📅 {new Date(activite.dateDebut).toLocaleDateString('fr-BE', {
                      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                </div>
              )}
              {activite.dateFin && (
                <div>
                  <p className="text-xs text-gray-400 font-semibold uppercase mb-1">Date de fin</p>
                  <p className="text-sm text-gray-700">
                    🏁 {new Date(activite.dateFin).toLocaleDateString('fr-BE', {
                      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                </div>
              )}
              {activite.capaciteMax > 0 && (
                <div>
                  <p className="text-xs text-gray-400 font-semibold uppercase mb-1">Capacité</p>
                  <p className="text-sm text-gray-700">👥 {activite.capaciteMax} personnes max</p>
                </div>
              )}
              {activite.createurPrenom && (
                <div>
                  <p className="text-xs text-gray-400 font-semibold uppercase mb-1">Organisateur</p>
                  <p className="text-sm text-gray-700">
                    👤 {activite.createurPrenom} {activite.createurNom}
                  </p>
                </div>
              )}
            </div>

            {/* Description */}
            {activite.description && (
              <div className="mb-6">
                <h2 className="text-base font-bold text-blue-900 mb-2">Description</h2>
                <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">
                  {activite.description}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 flex-wrap">
              {/* S'inscrire */}
              {activite.statut === 'PUBLIEE' && !inscrit && (
                <button
                  onClick={handleInscrire}
                  className="bg-blue-700 hover:bg-blue-600 text-white font-semibold px-6 py-3 rounded-xl transition"
                >
                  {isAuthenticated ? "✅ S'inscrire à cette activité" : "🔐 Se connecter pour s'inscrire"}
                </button>
              )}
              {inscrit && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-6 py-3 rounded-xl text-sm font-semibold">
                  ✅ Vous êtes inscrit à cette activité
                </div>
              )}

              {/* Retour */}
              <button
                onClick={() => navigate('/activites')}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-6 py-3 rounded-xl transition"
              >
                ← Retour à la liste
              </button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}