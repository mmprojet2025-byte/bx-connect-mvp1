import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import api from '../../api/axios';
import AppIcon from '../../components/ui/AppIcons';
import { useAuth } from '../../context/AuthContext';
import { getDefaultRouteForRole } from '../../routes/roleRoutes';
import { useTranslation } from 'react-i18next';

async function verifierSession({ sessionId, t, setPaiement, setError, setLoading }) {
  try {
    const res = await api.get(`/stripe/session/${sessionId}`);
    setPaiement(res.data);
  } catch {
    setError(t('payment.verifyError'));
  } finally {
    setLoading(false);
  }
}

export default function PaiementSuccess() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const homeRoute = getDefaultRouteForRole(user?.role);

  const [paiement, setPaiement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (sessionId) {
      verifierSession({ sessionId, t, setPaiement, setError, setLoading });
    } else {
      setLoading(false);
    }
  }, [sessionId, t]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="bg-white rounded-2xl shadow p-8 max-w-md w-full text-center">

          {loading ? (
            <div>
              <AppIcon name="Clock" className="mx-auto mb-4 h-12 w-12 text-blue-300" />
              <p className="text-gray-500">{t('payment.verifying')}</p>
            </div>
          ) : error ? (
            <div>
              <AppIcon name="AlertTriangle" className="mx-auto mb-4 h-12 w-12 text-orange-400" />
              <h1 className="text-xl font-bold text-gray-700 mb-2">{t('payment.verifyImpossible')}</h1>
              <p className="text-gray-500 text-sm mb-6">{error}</p>
              <Link to={homeRoute} className="bg-blue-700 text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-blue-600 transition">
                {t('payment.backDashboard')}
              </Link>
            </div>
          ) : (
            <div>
              {/* Icône succès */}
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AppIcon name="CheckCircle" className="h-10 w-10 text-green-700" />
              </div>

              <h1 className="text-2xl font-bold text-green-700 mb-2">{t('payment.successTitle')}</h1>
              <p className="text-gray-500 text-sm mb-6">
                {t('payment.successMessage')}
              </p>

              {/* Détails du paiement */}
              {paiement && (
                <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">{t('payment.amount')}</span>
                    <span className="font-bold text-green-700">{paiement.montant} €</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">{t('projects.status')}</span>
                    <span className="font-semibold text-green-600">
                      {paiement.statutPaiement === 'PAYE' ? t('payment.paid') : paiement.statutPaiement}
                    </span>
                  </div>
                  {paiement.activiteTitre && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">{t('nav.activities')}</span>
                      <span className="font-medium text-blue-900">{paiement.activiteTitre}</span>
                    </div>
                  )}
                  {paiement.projetTitre && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">{t('nav.projects')}</span>
                      <span className="font-medium text-blue-900">{paiement.projetTitre}</span>
                    </div>
                  )}
                  {paiement.datePaiement && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">{t('common.date')}</span>
                      <span className="text-gray-600">
                        {new Date(paiement.datePaiement).toLocaleDateString(i18n.language || 'fr-BE', {
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
                  className="inline-flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-600 text-white font-semibold py-2.5 rounded-xl transition text-sm"
                >
                  <AppIcon name="Folder" className="h-4 w-4" />
                  {t('payment.viewHistory')}
                </Link>
                <Link
                  to={homeRoute}
                  className="inline-flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl transition text-sm"
                >
                  <AppIcon name="Home" className="h-4 w-4" />
                  {t('payment.backDashboard')}
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
