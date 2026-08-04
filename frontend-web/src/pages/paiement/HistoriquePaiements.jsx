import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import api from '../../api/axios';
import AppIcon from '../../components/ui/AppIcons';
import { useTranslation } from 'react-i18next';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import LoadingState from '../../components/ui/LoadingState';

async function fetchHistorique({ t, setPaiements, setError, setLoading }) {
  try {
    const res = await api.get('/stripe/historique');
    setPaiements(res.data);
  } catch {
    setError(t('payment.historyLoadError'));
  } finally {
    setLoading(false);
  }
}

export default function HistoriquePaiements() {
  const { t, i18n } = useTranslation();
  const [paiements, setPaiements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtre, setFiltre] = useState('TOUS');

  useEffect(() => {
    fetchHistorique({ t, setPaiements, setError, setLoading });
  }, [t]);

  const FILTRES = ['TOUS', 'PAYE', 'EN_ATTENTE', 'ANNULE', 'ECHOUE'];

  const paiementsFiltres = paiements.filter(p =>
    filtre === 'TOUS' || p.statutPaiement === filtre
  );

  const totalPaye = paiements
    .filter(p => p.statutPaiement === 'PAYE')
    .reduce((sum, p) => sum + (p.montant || 0), 0);

  const statutStyle = (statut) => {
    switch (statut) {
      case 'PAYE':       return 'bg-green-100 text-green-700';
      case 'EN_ATTENTE': return 'bg-yellow-100 text-yellow-700';
      case 'ANNULE':     return 'bg-gray-100 text-gray-600';
      case 'ECHOUE':     return 'bg-red-100 text-red-700';
      case 'REMBOURSE':  return 'bg-purple-100 text-purple-700';
      default:           return 'bg-gray-100 text-gray-600';
    }
  };

  const fournisseurIcon = () => 'CreditCard';

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-10">

        {/* En-tête */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-blue-900">
              <AppIcon name="Folder" className="h-6 w-6" />
              {t('payment.historyTitle')}
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {t('payment.totalPaid')} <strong className="text-green-700">{totalPaye.toFixed(2)} €</strong>
            </p>
          </div>
          <Link
            to="/activites"
            className="inline-flex items-center gap-2 rounded-2xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-600"
          >
            <AppIcon name="PlusCircle" className="h-4 w-4" />
            {t('payment.newSupport')}
          </Link>
        </div>

        {/* Erreur */}
        {error && paiements.length > 0 && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">
            {error}
          </div>
        )}

        {/* Filtres */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {FILTRES.map(f => (
            <button
              key={f}
              onClick={() => setFiltre(f)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                filtre === f
                  ? 'bg-blue-700 text-white border-blue-700'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Liste */}
        {loading ? (
          <LoadingState label={t('common.loading')} />
        ) : error && paiements.length === 0 ? (
          <ErrorState
            title={t('common.loadErrorTitle')}
            description={error}
            actionLabel={t('common.retry')}
            action={() => fetchHistorique({ t, setPaiements, setError, setLoading })}
          />
        ) : paiementsFiltres.length === 0 ? (
          <EmptyState
            icon={paiements.length === 0 ? 'CreditCard' : 'Search'}
            title={filtre === 'TOUS' ? t('payment.empty') : t('payment.emptyStatus', { status: filtre })}
            actionLabel={t('payment.discoverActivitiesToSupport')}
            actionTo="/activites"
          />
        ) : (
          <div className="space-y-3">
            {paiementsFiltres.map(p => (
              <div key={p.id} className="bg-white rounded-2xl shadow p-5 flex items-center justify-between gap-4">

                {/* Icône fournisseur */}
                <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-blue-700 flex-shrink-0">
                  <AppIcon name={fournisseurIcon(p.fournisseur)} className="h-6 w-6" />
                </div>

                {/* Infos */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-blue-900 text-sm truncate">
                    {p.activiteTitre ? (
                      <span className="inline-flex items-center gap-1.5"><AppIcon name="Folder" className="h-4 w-4" />{p.activiteTitre}</span>
                    ) : p.projetTitre ? (
                      <span className="inline-flex items-center gap-1.5"><AppIcon name="Rocket" className="h-4 w-4" />{p.projetTitre}</span>
                    ) : t('payment.bxSupport')}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {p.fournisseur || 'STRIPE'} ·{' '}
                    {p.dateCreation ? new Date(p.dateCreation).toLocaleDateString(i18n.language || 'fr-BE', {
                      day: '2-digit', month: '2-digit', year: 'numeric'
                    }) : '—'}
                  </p>
                  {p.message && (
                    <p className="text-xs text-gray-500 mt-1 italic truncate">"{p.message}"</p>
                  )}
                </div>

                {/* Montant + statut */}
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-blue-900 text-base">{p.montant} €</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statutStyle(p.statutPaiement)}`}>
                    {p.statutPaiement}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

      </main>

      <Footer />
    </div>
  );
}
