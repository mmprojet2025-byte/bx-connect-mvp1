import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import api from '../../api/axios';
import { userFriendlyError } from '../../utils/userFriendlyError';
import AppIcon from '../../components/ui/AppIcons';
import { useTranslation } from 'react-i18next';

export default function PaiementStripe() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Paramètres passés via l'URL ou le state
  const projetId   = searchParams.get('projetId');
  const activiteId = searchParams.get('activiteId');
  const titre      = searchParams.get('titre') || 'BX-CONNECT';

  const [montant, setMontant] = useState('10');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const MONTANTS_RAPIDES = [5, 10, 25, 50, 100];

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  const handlePayer = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = {
        montant: parseFloat(montant),
        fournisseur: 'STRIPE',
        message,
      };
      if (projetId)   payload.projetId   = parseInt(projetId);
      if (activiteId) payload.activiteId = parseInt(activiteId);

      const res = await api.post('/stripe/checkout', payload);

      // Rediriger vers Stripe Checkout
      if (res.data.checkoutUrl) {
        window.location.href = res.data.checkoutUrl;
      } else {
        setError(t('payment.checkoutUrlMissing'));
      }
    } catch (err) {
      setError(userFriendlyError(err, t('common.error')));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-10">

        {/* En-tête */}
        <div className="text-center mb-8">
          <AppIcon name="CreditCard" className="mx-auto mb-3 h-12 w-12 text-blue-700" />
          <h1 className="text-2xl font-bold text-blue-900">{t('payment.stripeTitle')}</h1>
          <p className="mt-1 inline-flex items-center justify-center gap-1.5 text-gray-500 text-sm">
            <AppIcon name={projetId ? 'Rocket' : 'Folder'} className="h-4 w-4" />
            {projetId ? t('nav.projects') : t('nav.activities')} : <strong>{decodeURIComponent(titre)}</strong>
          </p>
        </div>

        {/* Erreur */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">
            <span className="inline-flex items-center gap-2"><AppIcon name="XCircle" className="h-4 w-4" />{error}</span>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow p-6">
          <form onSubmit={handlePayer} className="space-y-5">

            {/* Montants rapides */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                {t('payment.chooseAmount')}
              </label>
              <div className="grid grid-cols-5 gap-2 mb-3">
                {MONTANTS_RAPIDES.map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMontant(m.toString())}
                    className={`py-2 rounded-xl text-sm font-bold border-2 transition ${
                      montant === m.toString()
                        ? 'border-blue-700 bg-blue-700 text-white'
                        : 'border-gray-200 text-gray-600 hover:border-blue-400'
                    }`}
                  >
                    {m}€
                  </button>
                ))}
              </div>

              {/* Montant personnalisé */}
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">€</span>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={montant}
                  onChange={e => setMontant(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl pl-8 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder={t('payment.customAmount')}
                />
              </div>
            </div>

            {/* Message optionnel */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                {t('payment.optionalMessage')}
              </label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={3}
                placeholder={t('payment.supportMessagePlaceholder')}
                className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
              />
            </div>

            {/* Récapitulatif */}
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('payment.amount')}</span>
                <span className="font-bold text-blue-900">{montant} €</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-gray-600">{t('payment.provider')}</span>
                <span className="inline-flex items-center gap-1.5 font-semibold text-gray-700"><AppIcon name="CreditCard" className="h-4 w-4" />{t('payment.stripeSecure')}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-gray-600">{t('payment.target')}</span>
                <span className="font-semibold text-gray-700 truncate ml-2">
                  {decodeURIComponent(titre)}
                </span>
              </div>
            </div>

            {/* Bouton payer */}
            <button
              type="submit"
              disabled={loading || !montant || parseFloat(montant) < 1}
              className="w-full bg-blue-700 hover:bg-blue-600 disabled:bg-gray-300 text-white font-bold py-3.5 rounded-xl transition text-base"
            >
              {loading ? (
                <span className="inline-flex items-center justify-center gap-2"><AppIcon name="Clock" className="h-4 w-4" />{t('payment.redirecting')}</span>
              ) : (
                <span className="inline-flex items-center justify-center gap-2"><AppIcon name="CreditCard" className="h-4 w-4" />{t('payment.payWithStripe', { amount: montant })}</span>
              )}
            </button>

            {/* Sécurité */}
            <p className="text-center text-xs text-gray-400">
              <span className="inline-flex items-center justify-center gap-1.5"><AppIcon name="Lock" className="h-3.5 w-3.5" />{t('payment.securityNote')}</span>
            </p>

          </form>
        </div>

        {/* Retour */}
        <button
          onClick={() => navigate(-1)}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 text-center text-sm text-gray-500 hover:underline"
        >
          <AppIcon name="Home" className="h-4 w-4" />
          {t('activities.back_to_list')}
        </button>

      </main>

      <Footer />
    </div>
  );
}
