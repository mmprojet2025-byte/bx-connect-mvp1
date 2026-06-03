import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import api from '../api/axios';
import Alert from '../components/ui/Alert';
import EmptyState from '../components/ui/EmptyState';
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
      case 'VALIDATION_GROUPE':  return '✅';
      case 'REFUS_GROUPE':       return '❌';
      case 'VALIDATION_PROJET':  return '🚀';
      case 'REFUS_PROJET':       return '❌';
      case 'PAIEMENT':           return '💳';
      case 'ANNONCE':            return '📢';
      case 'ADHESION':           return '👥';
      case 'ADHESION_ACCEPTEE':  return '✅';
      case 'ADHESION_REFUSEE':   return '❌';
      case 'PRESTATION_VALIDEE': return '🤝';
      case 'PRESTATION_REFUSEE': return '❌';
      default:                   return '🔔';
    }
  };

  const nonLues = notifications.filter(n => !n.lue).length;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-10">

        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-blue-900">🔔 {t('notifications.title')}</h1>
            {nonLues > 0 && (
              <p className="text-blue-600 text-sm mt-1">{t('notifications.unreadCount', { count: nonLues })}</p>
            )}
          </div>
          {nonLues > 0 && (
            <button onClick={handleToutesLues}
              className="bg-blue-100 hover:bg-blue-200 text-blue-700 text-sm font-semibold px-4 py-2 rounded-xl transition">
              {t('notifications.markAllAsRead')}
            </button>
          )}
        </div>

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
                className={`bg-white rounded-2xl shadow p-4 flex items-start gap-3 cursor-pointer transition hover:shadow-md ${
                  !n.lue ? 'border-l-4 border-blue-500 bg-blue-50/30' : ''
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-xl flex-shrink-0">
                  {typeIcon(n.type)}
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
                    className="text-gray-300 hover:text-red-400 text-lg leading-none"
                    aria-label={t('common.delete')}
                  >
                    ✕
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
