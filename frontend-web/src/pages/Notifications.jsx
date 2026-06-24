import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import api from '../api/axios';
import Alert from '../components/ui/Alert';
import EmptyState from '../components/ui/EmptyState';
import PageHeader from '../components/ui/PageHeader';
import AppIcon from '../components/ui/AppIcons';
import { confirmSensitiveAction, userFriendlyError } from '../utils/userFriendlyError';
import LoadingState from '../components/ui/LoadingState';
import ErrorState from '../components/ui/ErrorState';
import { dashboardRouteForRole, resolveNotificationRoute, hasExactNotificationRoute } from '../utils/notificationRoute';

export default function Notifications() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
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
    if (!confirmSensitiveAction(t('notifications.confirmDelete'))) return;
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) { setError(userFriendlyError(err, t('notifications.errorLoad'))); }
  };

  const handleOpenNotification = async (notification) => {
    if (!notification.lue) await handleMarquerLue(notification.id);
    const route = resolveNotificationRoute(notification, user?.role);
    if (!hasExactNotificationRoute(notification, user?.role)) {
      toast(t('notifications.smartFallback', {
        defaultValue: 'Destination exacte indisponible : ouverture de la meilleure page liée.',
      }));
    }
    navigate(route);
  };

  const typeIcon = (type) => {
    const normalizedType = String(type || '').toUpperCase();
    if (normalizedType.startsWith('PRESTATION_')) return normalizedType.includes('REFUSE') ? 'XCircle' : 'ClipboardList';
    if (normalizedType.includes('SOUTIEN') || normalizedType.includes('SUPPORT')) return 'Handshake';
    if (normalizedType.includes('OPPORTUNITE') || normalizedType.includes('OPPORTUNITY')) return 'Megaphone';
    if (normalizedType.includes('PRESENCE') || normalizedType.includes('ATTENDANCE')) return 'ClipboardList';

    switch (normalizedType) {
      case 'VALIDATION_GROUPE':  return 'CheckCircle';
      case 'REFUS_GROUPE':       return 'XCircle';
      case 'VALIDATION_PROJET':  return 'Rocket';
      case 'REFUS_PROJET':       return 'XCircle';
      case 'VALIDATION_REFERENT_PROJET': return 'CheckCircle';
      case 'REFUS_REFERENT_PROJET': return 'XCircle';
      case 'PAIEMENT':           return 'Wallet';
      case 'ANNONCE':            return 'Megaphone';
      case 'MESSAGE':            return 'MessageCircle';
      case 'ACTIVITE_PUBLIEE':   return 'Calendar';
      case 'INSCRIPTION_CONFIRMEE': return 'Calendar';
      case 'ADHESION':           return 'Users';
      case 'ADHESION_ACCEPTEE':  return 'CheckCircle';
      case 'ADHESION_REFUSEE':   return 'XCircle';
      case 'PRESTATION_VALIDEE': return 'CheckCircle';
      case 'PRESTATION_REFUSEE': return 'XCircle';
      default:                   return 'Bell';
    }
  };

  const nonLues = notifications.filter(n => !n.lue).length;
  const isImportantNotification = (type) => {
    const normalizedType = String(type || '').toUpperCase();
    return [
      'VALIDATION_GROUPE',
      'VALIDATION_PROJET',
      'VALIDATION_REFERENT_PROJET',
      'REFUS_REFERENT_PROJET',
      'ADHESION',
      'PAIEMENT',
      'MESSAGE',
      'ACTIVITE_PUBLIEE',
    ].includes(normalizedType)
      || normalizedType.startsWith('PRESTATION_')
      || normalizedType.includes('SOUTIEN')
      || normalizedType.includes('SUPPORT')
      || normalizedType.includes('OPPORTUNITE')
      || normalizedType.includes('OPPORTUNITY');
  };
  const importantes = notifications.filter(n => !n.lue && isImportantNotification(n.type)).length;
  const lues = notifications.length - nonLues;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">

        <PageHeader
          eyebrow={t('nav.notifications')}
          title={t('notifications.title')}
          description={nonLues > 0 ? t('notifications.unreadCount', { count: nonLues }) : t('notifications.emptyDescription')}
          action={nonLues > 0 && (
            <button onClick={handleToutesLues}
              className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500">
              <AppIcon name="CheckCircle" className="h-4 w-4" />
              {t('notifications.markAllAsRead')}
            </button>
          )}
        />

        {error && notifications.length > 0 && <Alert type="error">{error}</Alert>}

        {!isAuthenticated ? (
          <EmptyState
            icon="Lock"
            title={t('notifications.loginRequiredTitle')}
            description={t('notifications.loginRequiredDescription')}
            actionLabel={t('nav.login')}
            actionTo="/login"
          />
        ) : loading ? (
          <LoadingState label={t('common.loading')} />
        ) : error && notifications.length === 0 ? (
          <ErrorState
            title={t('common.loadErrorTitle')}
            description={error || t('common.loadErrorDescription')}
            actionLabel={t('common.retry')}
            action={fetchNotifications}
          />
        ) : notifications.length === 0 ? (
          <EmptyState
            icon="Bell"
            title={t('notifications.emptyTitle')}
            description={t('notifications.emptyDescription')}
            actionLabel={t('nav.dashboard')}
            actionTo={dashboardRouteForRole(user?.role)}
          />
        ) : (
          <>
            <section className="mb-5 grid gap-3 sm:grid-cols-3">
              <NotificationStat icon="Bell" label={t('notifications.title')} value={notifications.length} />
              <NotificationStat icon="AlertTriangle" label={t('notifications.unread', { defaultValue: 'Non lues' })} value={nonLues} tone="blue" />
              <NotificationStat icon="CheckCircle" label={t('notifications.read', { defaultValue: 'Lues' })} value={lues} hint={importantes > 0 ? t('notifications.importantCount', { count: importantes }) : undefined} tone="green" />
            </section>
            <div className="space-y-2.5">
            {notifications.map(n => (
              <div
                key={n.id}
                onClick={() => !n.lue && handleMarquerLue(n.id)}
                onKeyDown={event => {
                  if ((event.key === 'Enter' || event.key === ' ') && !n.lue) {
                    event.preventDefault();
                    handleMarquerLue(n.id);
                  }
                }}
                role="button"
                tabIndex={0}
                className={`rounded-2xl border p-3.5 flex items-start gap-3 cursor-pointer transition hover:-translate-y-0.5 hover:shadow-lg ${
                  !n.lue ? 'border-indigo-200 bg-gradient-to-r from-indigo-50 to-white shadow-sm' : 'border-slate-100 bg-white shadow-sm'
                }`}
              >
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm ${n.lue ? 'bg-slate-50 text-slate-500' : 'bg-white text-indigo-700'}`}>
                  <AppIcon name={typeIcon(n.type)} className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${!n.lue ? 'font-bold text-slate-950' : 'font-medium text-slate-700'}`}>
                    {n.titre}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{n.message}</p>
                  {(n.lienAction || resolveNotificationRoute(n, user?.role)) && (
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); handleOpenNotification(n); }}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 transition hover:bg-blue-100"
                    >
                      <AppIcon name="Eye" className="h-3.5 w-3.5" />
                      {t('common.open')}
                    </button>
                  )}
                  <p className="text-xs text-slate-400 mt-1">
                    {new Date(n.dateCreation).toLocaleDateString(i18n.language || 'fr-BE', {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${n.lue ? 'bg-gray-100 text-slate-500' : 'bg-blue-100 text-blue-600'}`}>
                    {n.lue ? t('notifications.read') : t('notifications.unread')}
                  </span>
                  {!n.lue && <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
                  <button
                    onClick={e => { e.stopPropagation(); handleSupprimer(n.id); }}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-300 transition hover:bg-red-50 hover:text-red-500"
                    aria-label={t('common.delete')}
                  >
                    <AppIcon name="XCircle" className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

function NotificationStat({ icon, label, value, hint, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-50 text-slate-700',
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
  };
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{label}</p>
          <p className="mt-1 text-xl font-black text-slate-950">{value}</p>
          {hint && <p className="mt-0.5 text-xs font-semibold text-slate-500">{hint}</p>}
        </div>
        <span className={`grid h-9 w-9 place-items-center rounded-xl ${tones[tone] || tones.slate}`}>
          <AppIcon name={icon} className="h-4 w-4" />
        </span>
      </div>
    </div>
  );
}
