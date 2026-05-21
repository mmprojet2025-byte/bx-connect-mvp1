import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import api from '../../api/axios';

export default function PaiementSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const [paiement, setPaiement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (sessionId) {
      verifierSession();
    } else {
      setLoading(false);
    }
  }, [sessionId]);

  const verifierSession = async () => {
    try {
      const res = await api.get(`/stripe/session/${sessionId}`);
      setPaiement(res.data);
    } catch {
      setError('Impossible de vérifier le paiement.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="bg-white rounded-2xl shadow p-8 max-w-md w-full text-center">

          {loading ? (
            <div>
              <div className="text-5xl mb-4">⏳</div>
              <p className="text-gray-500">Vérification du paiement...</p>
            </div>
          ) : error ? (
            <div>
              <div className="text-5xl mb-4">⚠️</div>
              <h1 className="text-xl font-bold text-gray-700 mb-2">Vérification impossible</h1>
              <p className="text-gray-500 text-sm mb-6">{error}</p>
              <Link to="/dashboard" className="bg-blue-700 text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-blue-600 transition">
                Retour au dashboard
              </Link>
            </div>
          ) : (
            <div>
              {/* Icône succès */}
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">✅</span>
              </div>

              <h1 className="text-2xl font-bold text-green-700 mb-2">Paiement réussi !</h1>
              <p className="text-gray-500 text-sm mb-6">
                Merci pour votre soutien à BX-CONNECT. Votre contribution fait la différence !
              </p>

              {/* Détails du paiement */}
              {paiement && (
                <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Montant</span>
                    <span className="font-bold text-green-700">{paiement.montant} €</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Statut</span>
                    <span className="font-semibold text-green-600">
                      {paiement.statutPaiement === 'PAYE' ? '✅ Payé' : paiement.statutPaiement}
                    </span>
                  </div>
                  {paiement.activiteTitre && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Activité</span>
                      <span className="font-medium text-blue-900">{paiement.activiteTitre}</span>
                    </div>
                  )}
                  {paiement.projetTitre && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Projet</span>
                      <span className="font-medium text-blue-900">{paiement.projetTitre}</span>
                    </div>
                  )}
                  {paiement.datePaiement && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Date</span>
                      <span className="text-gray-600">
                        {new Date(paiement.datePaiement).toLocaleDateString('fr-BE', {
                          day: '2-digit', month: '2-digit', year: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-3">
                <Link
                  to="/paiement/historique"
                  className="bg-blue-700 hover:bg-blue-600 text-white font-semibold py-2.5 rounded-xl transition text-sm"
                >
                  📋 Voir l'historique des paiements
                </Link>
                <Link
                  to="/dashboard"
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl transition text-sm"
                >
                  🏠 Retour au dashboard
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}