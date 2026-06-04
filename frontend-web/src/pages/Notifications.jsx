import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import api from '../api/axios';
import Alert from '../components/ui/Alert';
import EmptyState from '../components/ui/EmptyState';
import PageHeader from '../components/ui/PageHeader';
import AppIcon from '../components/ui/AppIcons';
import { confirmSensitiveAction, userFriendlyError } from '../utils/userFriendlyError';

export default function Notifications() {
  const { t, i18n } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAuthenticated) fetchNotifications();
    else setLoading(false);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data);
    } catch (err) { setError(userFriendlyError(err, t('notifications.errorLoad'))); }
    finally { setLoading(false); }
  };

  const handleMarquerLue = async (id) => {
    try {
      await api.patch(`/notifications/${id}/lue`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, lue: true } : n));
    } catch (err) { setError(userFriendlyError(err, t('notifications.errorLoad'))); }
  };

  const handleToutesLues = async () => {
    try {
      await api.patch('/notifications/toutes-lues');
      setNotifications(prev => prev.map(n => ({ ...n, lue: true })));
    } catch (err) { setError(userFriendlyError(err, t('notifications.errorLoad'))); }
  };

  const handleSupprimer = async (id) => {
    if (!confirmSensitiveAction('Supprimer cette notification ?')) return;
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) { setError(userFriendlyError(err, t('notifications.errorLoad'))); }
  };

  const typeIcon = (type) => {
    switch (type) {
      case 'VALIDATION_GROUPE':  return 'CheckCircle';
      case 'REFUS_GROUPE':       return 'XCircle';
      case 'VALIDATION_PROJET':  return 'Rocket';
      case 'REFUS_PROJET':       return 'XCircle';
      case 'PAIEMENT':           return 'Wallet';
      case 'ANNONCE':            return 'Bell';
      case 'ADHESION':           return 'Users';
      case 'ADHESION_ACCEPTEE':  return 'CheckCircle';
      case 'ADHESION_REFUSEE':   return 'XCircle';
      case 'PRESTATION_VALIDEE': return 'CheckCircle';
      case 'PRESTATION_REFUSEE': return 'XCircle';
      default:                   return 'Bell';
    }
  };

  const nonLues = notifications.filter(n => !n.lue).length;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-10">

        <PageHeader
          eyebrow={t('nav.notifications')}
          title={t('notifications.title')}
          description={nonLues > 0 ? t('notifications.unreadCount', { count: nonLues }) : t('notifications.emptyDescription')}
          action={nonLues > 0 && (
            <button onClick={handleToutesLues}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition">
              {t('notifications.markAllAsRead')}
            </button>
          )}
        />

        {error && <Alert type="error">{error}</Alert>}

        {!isAuthenticated ? (
          <EmptyState
            title={t('notifications.loginRequiredTitle')}
            description={t('notifications.loginRequiredDescription')}
            actionLabel={t('nav.login')}
            actionTo="/login"
          />
        ) : loading ? (
          <p className="text-gray-400 text-center py-10">{t('common.loading')}</p>
        ) : notifications.length === 0 ? (
          <EmptyState
            title={t('notifications.emptyTitle')}
            description={t('notifications.emptyDescription')}
            actionLabel={t('nav.dashboard')}
            actionTo="/dashboard"
          />
        ) : (
          <div className="space-y-3">
            {notifications.map(n => (
              <div
                key={n.id}
                onClick={() => !n.lue && handleMarquerLue(n.id)}
                className={`rounded-3xl border p-4 flex items-start gap-3 cursor-pointer transition hover:-translate-y-0.5 hover:shadow-md ${
                  !n.lue ? 'border-indigo-100 bg-indigo-50/50 shadow-sm' : 'border-slate-100 bg-white shadow-sm'
                }`}
              >
                <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-indigo-700 flex-shrink-0 shadow-sm">
                  <AppIcon name={typeIcon(n.type)} className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${!n.lue ? 'font-bold text-blue-900' : 'font-medium text-gray-700'}`}>
                    {n.titre}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.message}</p>
                  {n.lienAction && (
                    <Link
                      to={n.lienAction}
                      onClick={e => { e.stopPropagation(); if (!n.lue) handleMarquerLue(n.id); }}
                      className="inline-flex mt-2 text-xs font-semibold text-blue-700 hover:underline"
                    >
                      {t('common.open')}
                    </Link>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(n.dateCreation).toLocaleDateString(i18n.language || 'fr-BE', {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${n.lue ? 'bg-gray-100 text-gray-500' : 'bg-blue-100 text-blue-700'}`}>
                    {n.lue ? t('notifications.read') : t('notifications.unread')}
                  </span>
                  {!n.lue && <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
                  <button
                    onClick={e => { e.stopPropagation(); handleSupprimer(n.id); }}
                    className="text-gray-300 hover:text-red-400 leading-none"
                    aria-label={t('common.delete')}
                  >
                    <AppIcon name="XCircle" className="h-4 w-4" />
                  </button>
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
