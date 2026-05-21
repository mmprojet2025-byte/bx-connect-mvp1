import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import api from '../../api/axios';

export default function ReferentDashboard() {
  const { user } = useAuth();
  const { t } = useTranslation();

  const [dashboard, setDashboard] = useState(null);
  const [tauxRemplissage, setTauxRemplissage] = useState([]);
  const [soutiensRecus, setSoutiensRecus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [onglet, setOnglet] = useState('dashboard');

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const [dashRes, tauxRes, soutiensRes] = await Promise.all([
        api.get('/referent/dashboard'),
        api.get('/referent/taux-remplissage'),
        api.get('/referent/soutiens-recus'),
      ]);
      setDashboard(dashRes.data);
      setTauxRemplissage(tauxRes.data);
      setSoutiensRecus(soutiensRes.data);
    } catch {
      setError('Impossible de charger le dashboard référent.');
    } finally {
      setLoading(false);
    }
  };

  const handleValiderProjet = async (projetId) => {
    try {
      await api.patch(`/referent/projets/${projetId}/valider`);
      setMessage('✅ Projet approuvé !');
      fetchAll();
      setTimeout(() => setMessage(''), 3000);
    } catch {
      setError('Erreur lors de la validation.');
    }
  };

  const handleRefuserProjet = async (projetId) => {
    try {
      await api.patch(`/referent/projets/${projetId}/refuser`);
      setMessage('✅ Projet refusé.');
      fetchAll();
      setTimeout(() => setMessage(''), 3000);
    } catch {
      setError('Erreur lors du refus.');
    }
  };

  const ONGLETS = [
    { id: 'dashboard',  label: '📊 Dashboard' },
    { id: 'activites',  label: '🎯 Mes activités' },
    { id: 'projets',    label: '🚀 Projets soumis' },
    { id: 'soutiens',   label: '💰 Soutiens reçus' },
  ];

  if (loading) return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1 flex items-center justify-center">
        <p className="text-gray-400">Chargement du dashboard référent...</p>
      </main>
      <Footer />
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-10">

        {/* En-tête */}
        <div className="bg-teal-700 text-white rounded-2xl p-6 mb-6">
          <h1 className="text-2xl font-bold">👤 Dashboard Référent</h1>
          <p className="text-teal-200 mt-1 text-sm">
            Bienvenue, {user?.prenom} {user?.nom} — Rôle : RÉFÉRENT
          </p>
        </div>

        {/* Messages */}
        {message && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4 text-sm">{message}</div>}
        {error   && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">{error}</div>}

        {/* Onglets */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {ONGLETS.map(o => (
            <button
              key={o.id}
              onClick={() => setOnglet(o.id)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                onglet === o.id
                  ? 'bg-teal-700 text-white'
                  : 'bg-white text-gray-600 hover:bg-teal-50 border border-gray-200'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>

        {/* ── Dashboard ── */}
        {onglet === 'dashboard' && dashboard && (
          <div>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              <StatCard label="Mes activités"   value={dashboard.totalActivites}    color="#0d9488" />
              <StatCard label="Total inscrits"  value={dashboard.totalInscriptions} color="#2563eb" />
              <StatCard label="Projets soumis"  value={dashboard.projetsSoumis}     color="#d97706" />
            </div>

            {/* Taux de remplissage */}
            {tauxRemplissage.length > 0 && (
              <div className="bg-white rounded-2xl shadow p-6 mb-6">
                <h2 className="text-base font-bold text-blue-900 mb-4">📊 Taux de remplissage (R11)</h2>
                <div className="space-y-3">
                  {tauxRemplissage.map(a => (
                    <div key={a.activiteId}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-blue-900">{a.activiteTitre}</span>
                        <span className="text-gray-500">{a.inscrits}/{a.capaciteMax > 0 ? a.capaciteMax : '∞'}</span>
                      </div>
                      {a.capaciteMax > 0 && (
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div
                            className="h-2 rounded-full transition-all"
                            style={{
                              width: `${Math.min(a.tauxRemplissage, 100)}%`,
                              backgroundColor: a.tauxRemplissage >= 90 ? '#dc2626' :
                                               a.tauxRemplissage >= 70 ? '#d97706' : '#16a34a'
                            }}
                          />
                        </div>
                      )}
                      <p className="text-xs text-gray-400 mt-0.5">
                        {a.capaciteMax > 0 ? `${Math.round(a.tauxRemplissage)}% rempli` : 'Capacité illimitée'}
                        {' · '}{a.statut}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Projets soumis en attente */}
            {dashboard.projetsSoumisListe?.length > 0 && (
              <div className="bg-white rounded-2xl shadow p-6">
                <h2 className="text-base font-bold text-blue-900 mb-4">
                  🚀 Projets en attente de validation ({dashboard.projetsSoumis})
                </h2>
                <div className="space-y-3">
                  {dashboard.projetsSoumisListe.map(p => (
                    <div key={p.id} className="flex justify-between items-center p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
                      <div>
                        <p className="text-sm font-semibold text-blue-900">{p.titre}</p>
                        <p className="text-xs text-gray-400">{p.description?.substring(0, 60)}...</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleValiderProjet(p.id)}
                          className="bg-green-100 hover:bg-green-200 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition"
                        >
                          ✅ Valider
                        </button>
                        <button
                          onClick={() => handleRefuserProjet(p.id)}
                          className="bg-red-100 hover:bg-red-200 text-red-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition"
                        >
                          ❌ Refuser
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Mes activités ── */}
        {onglet === 'activites' && (
          <div>
            <h2 className="text-lg font-bold text-blue-900 mb-4">🎯 Mes activités créées</h2>
            {dashboard?.mesActivites?.length === 0 ? (
              <div className="text-center py-12 text-gray-400 bg-white rounded-2xl shadow">
                <div className="text-4xl mb-2">🎯</div>
                <p>Aucune activité créée pour le moment.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dashboard?.mesActivites?.map(a => (
                  <div key={a.id} className="bg-white rounded-2xl shadow p-5">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-blue-900 text-sm">{a.titre}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full text-white ${
                        a.statut === 'PUBLIEE' ? 'bg-green-500' :
                        a.statut === 'ANNULEE' ? 'bg-red-500' : 'bg-yellow-500'
                      }`}>{a.statut}</span>
                    </div>
                    <div className="text-xs text-gray-400 space-y-1">
                      {a.lieu && <p>📍 {a.lieu}</p>}
                      {a.dateDebut && <p>📅 {new Date(a.dateDebut).toLocaleDateString('fr-BE')}</p>}
                      <p>{a.gratuite ? '🆓 Gratuit' : `💶 ${a.prix} €`}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Projets soumis ── */}
        {onglet === 'projets' && (
          <div>
            <h2 className="text-lg font-bold text-blue-900 mb-4">🚀 Projets soumis en attente</h2>
            {dashboard?.projetsSoumisListe?.length === 0 ? (
              <div className="text-center py-12 text-gray-400 bg-white rounded-2xl shadow">
                <div className="text-4xl mb-2">🚀</div>
                <p>Aucun projet en attente de validation.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {dashboard?.projetsSoumisListe?.map(p => (
                  <div key={p.id} className="bg-white rounded-2xl shadow p-5">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-bold text-blue-900">{p.titre}</h3>
                        {p.description && <p className="text-gray-500 text-sm mt-1">{p.description}</p>}
                      </div>
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full ml-2">SOUMIS</span>
                    </div>
                    {p.budgetDemande && (
                      <p className="text-xs text-gray-400 mb-3">💰 Budget demandé : {p.budgetDemande} €</p>
                    )}
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleValiderProjet(p.id)}
                        className="flex-1 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold py-2 rounded-xl transition"
                      >
                        ✅ Approuver
                      </button>
                      <button
                        onClick={() => handleRefuserProjet(p.id)}
                        className="flex-1 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold py-2 rounded-xl transition"
                      >
                        ❌ Refuser
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Soutiens reçus ── */}
        {onglet === 'soutiens' && (
          <div>
            <h2 className="text-lg font-bold text-blue-900 mb-4">💰 Soutiens financiers reçus (R17)</h2>
            {soutiensRecus.length === 0 ? (
              <div className="text-center py-12 text-gray-400 bg-white rounded-2xl shadow">
                <div className="text-4xl mb-2">💰</div>
                <p>Aucun soutien reçu pour le moment.</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow overflow-hidden">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Activité</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Partenaire</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Montant</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {soutiensRecus.map((s, i) => (
                      <tr key={s.soutienId} className={`border-b border-gray-50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                        <td className="px-4 py-3 text-sm text-blue-900">{s.activiteTitre}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{s.partenaireNom || '—'}</td>
                        <td className="px-4 py-3 text-sm font-bold text-teal-700">{s.montant} €</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            s.statut === 'PAYE' ? 'bg-green-100 text-green-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>{s.statut}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </main>

      <Footer />
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className="bg-white rounded-2xl shadow p-4" style={{ borderLeft: `4px solid ${color}` }}>
      <div className="text-2xl font-bold mb-1" style={{ color }}>{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}