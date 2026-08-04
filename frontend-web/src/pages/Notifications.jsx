import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import {
  deleteNotification,
  getNotificationsPage,
  markAllNotificationsRead,
  markNotificationRead,
} from '../api/notifications';
import Alert from '../components/ui/Alert';
import EmptyState from '../components/ui/EmptyState';
import AppIcon from '../components/ui/AppIcons';
import { confirmSensitiveAction, userFriendlyError } from '../utils/userFriendlyError';
import LoadingState from '../components/ui/LoadingState';
import ErrorState from '../components/ui/ErrorState';
import { dashboardRouteForRole, resolveNotificationRoute, hasExactNotificationRoute } from '../utils/notificationRoute';

const NOTIFICATIONS_PAGE_SIZE = 20;

async function fetchNotifications({
  page = 0,
  append = false,
  t,
  setNotifications,
  setPagination,
  setLoading,
  setLoadingMore,
  setError,
}) {
  if (append) setLoadingMore(true);
  else setLoading(true);
  setError('');
  try {
    const pageData = await getNotificationsPage(page, NOTIFICATIONS_PAGE_SIZE);
    setNotifications(prev => append ? mergeNotifications(prev, pageData.content) : pageData.content);
    setPagination({
      page: pageData.page,
      size: pageData.size,
      totalElements: pageData.totalElements,
      totalPages: pageData.totalPages,
      last: pageData.last,
    });
  } catch (err) { setError(userFriendlyError(err, t('notifications.errorLoad'))); }
  finally {
    setLoading(false);
    setLoadingMore(false);
  }
}

export default function Notifications() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [pagination, setPagination] = useState({
    page: 0,
    size: NOTIFICATIONS_PAGE_SIZE,
    totalElements: 0,
    totalPages: 0,
    last: true,
  });

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications({ t, setNotifications, setPagination, setLoading, setLoadingMore, setError });
    }
    else setLoading(false);
  }, [isAuthenticated, t]);

  const handleLoadMore = () => {
    if (!loadingMore && !pagination.last) {
      fetchNotifications({
        page: pagination.page + 1,
        append: true,
        t,
        setNotifications,
        setPagination,
        setLoading,
        setLoadingMore,
        setError,
      });
    }
  };

  const handleMarquerLue = async (id) => {
    try {
      await markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, lue: true } : n));
    } catch (err) { setError(userFriendlyError(err, t('notifications.errorLoad'))); }
  };

  const handleToutesLues = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, lue: true })));
      fetchNotifications({ t, setNotifications, setPagination, setLoading, setLoadingMore, setError });
    } catch (err) { setError(userFriendlyError(err, t('notifications.errorLoad'))); }
  };

  const handleSupprimer = async (id) => {
    if (!confirmSensitiveAction(t('notifications.confirmDelete'))) return;
    try {
      await deleteNotification(id);
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
  const filters = buildNotificationFilters(t, notifications);
  const filteredNotifications = notifications.filter(notification => {
    const category = getNotificationCategory(notification.type);
    return filter === 'all'
      || (filter === 'unread' ? !notification.lue : category === filter);
  });
  const emptyFilteredTitle = getEmptyFilteredTitle({ filter, t });

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-5">
        <header className="mb-3 flex flex-col gap-3 border-b border-slate-200 pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-black text-slate-950">
              <AppIcon name="Bell" className="h-5 w-5 text-blue-700" />
              {t('notifications.title')}
            </h1>
            <p className="mt-0.5 text-sm font-semibold text-slate-500">
              {nonLues > 0
                ? t('notifications.unreadCount', { count: nonLues })
                : t('notifications.allCaughtUp')}
              {importantes > 0 && (
                <span className="ml-2 text-amber-700">{t('notifications.importantCount', { count: importantes })}</span>
              )}
            </p>
          </div>
          {nonLues > 0 && (
            <button onClick={handleToutesLues}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-1.5 text-xs font-black text-blue-700 transition hover:border-blue-200 hover:bg-blue-100">
              <AppIcon name="CheckCircle" className="h-4 w-4" />
              {t('notifications.markAllAsReadShort')}
            </button>
          )}
        </header>

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
            action={() => fetchNotifications({ t, setNotifications, setPagination, setLoading, setLoadingMore, setError })}
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
            <section className="mb-3 rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
              <div className="messaging-scroll flex gap-1 overflow-x-auto">
                  {filters.map(item => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setFilter(item.key)}
                      className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-black transition ${
                        filter === item.key
                          ? 'bg-blue-700 text-white shadow-sm'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                      }`}
                    >
                      {item.label}
                      {item.count > 0 && (
                        <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                          filter === item.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {item.count}
                        </span>
                      )}
                    </button>
                  ))}
              </div>
            </section>

            {filteredNotifications.length === 0 ? (
              <EmptyState
                icon="Bell"
                title={emptyFilteredTitle}
                description={t('notifications.emptyFilterDescription')}
              />
            ) : (
              <>
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  {filteredNotifications.map(n => (
                    <NotificationInboxItem
                      key={n.id}
                      notification={n}
                      category={getNotificationCategory(n.type)}
                      icon={typeIcon(n.type)}
                      important={isImportantNotification(n.type)}
                      actor={getNotificationActor(n)}
                      actionable={Boolean(n.lienAction || hasExactNotificationRoute(n, user?.role))}
                      dateLabel={formatNotificationDate(n.dateCreation, i18n.language, t)}
                      onOpen={() => handleOpenNotification(n)}
                      onMarkRead={() => handleMarquerLue(n.id)}
                      onDelete={() => handleSupprimer(n.id)}
                      t={t}
                    />
                  ))}
                </div>
                {!pagination.last && (
                  <div className="mt-4 flex justify-center">
                    <button
                      type="button"
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loadingMore && <AppIcon name="RefreshCw" className="h-4 w-4 animate-spin" />}
                      {t('notifications.loadMore')}
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function mergeNotifications(current, next) {
  const byId = new Map(current.map(notification => [notification.id, notification]));
  next.forEach(notification => byId.set(notification.id, notification));
  return Array.from(byId.values());
}

function NotificationInboxItem({
  notification,
  category,
  icon,
  important,
  actor,
  actionable,
  dateLabel,
  onOpen,
  onMarkRead,
  onDelete,
  t,
}) {
  const accent = getCategoryAccent(category);
  const cardAction = actionable ? onOpen : (!notification.lue ? onMarkRead : undefined);
  const isClickable = Boolean(cardAction);

  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <article
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={cardAction}
      onKeyDown={event => {
        if (isClickable && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          cardAction();
        }
      }}
      className={`group relative flex items-start gap-2 overflow-hidden border-b border-slate-100 px-3 py-1.5 transition hover:bg-slate-50 ${
        notification.lue
          ? 'bg-white opacity-70'
          : 'bg-white'
      } ${isClickable ? 'cursor-pointer' : ''}`}
    >
      <span className={`absolute inset-y-0 left-0 w-[3px] ${accent.bar}`} />
      <div className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md ${notification.lue ? accent.iconMuted : accent.icon}`}>
        <AppIcon name={icon} className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1 pr-2">
        <div className="flex min-w-0 items-baseline gap-2">
          {!notification.lue && (
            <span
              className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${important ? 'bg-amber-500' : 'bg-blue-600'}`}
              aria-label={important ? t('notifications.important') : t('notifications.unread')}
            />
          )}
          <p className={`min-w-0 truncate text-sm ${notification.lue ? 'font-semibold text-slate-500' : 'font-black text-slate-950'}`}>
            {actor ? (
              <>
                <span>{actor}</span>
                <span className="mx-1 font-semibold text-slate-400">·</span>
                <span className={notification.lue ? 'text-slate-600' : 'text-slate-900'}>{notification.titre}</span>
              </>
            ) : (
              notification.titre
            )}
          </p>
          <span className="shrink-0 text-[11px] font-semibold text-slate-400">{dateLabel}</span>
        </div>
        {notification.message && (
          <p className={`mt-0.5 line-clamp-1 text-xs leading-4 ${notification.lue ? 'text-slate-400' : 'text-slate-600'}`}>
            {notification.message}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-0.5 opacity-100 sm:opacity-0 sm:transition sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
        {!notification.lue && (
          <button
            type="button"
            onClick={event => { event.stopPropagation(); onMarkRead(); }}
            className="inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-400 transition hover:bg-blue-50 hover:text-blue-700"
            aria-label={t('notifications.markAsRead')}
          >
            <AppIcon name="CheckCircle" className="h-3.5 w-3.5" />
          </button>
        )}
        {actionable && (
          <button
            type="button"
            onClick={event => { event.stopPropagation(); onOpen(); }}
            className="inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label={t('common.open')}
          >
            <AppIcon name="ArrowRight" className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={event => { event.stopPropagation(); onDelete(); }}
          className="inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-300 transition hover:bg-red-50 hover:text-red-600"
          aria-label={t('notifications.delete')}
        >
          <AppIcon name="XCircle" className="h-3.5 w-3.5" />
        </button>
      </div>
    </article>
  );
}

function buildNotificationFilters(t, notifications) {
  const countByCategory = notifications.reduce((acc, notification) => {
    const category = getNotificationCategory(notification.type);
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {});
  return [
    { key: 'all', label: t('notifications.filters.all'), count: notifications.length },
    { key: 'unread', label: t('notifications.filters.unread'), count: notifications.filter(n => !n.lue).length },
    { key: 'message', label: t('notifications.filters.messages'), count: countByCategory.message || 0 },
    { key: 'activity', label: t('notifications.filters.activities'), count: countByCategory.activity || 0 },
    { key: 'group', label: t('notifications.filters.groups'), count: countByCategory.group || 0 },
    { key: 'project', label: t('notifications.filters.projects'), count: countByCategory.project || 0 },
  ];
}

function getNotificationCategory(type) {
  const normalizedType = String(type || '').toUpperCase();
  if (normalizedType === 'MESSAGE') return 'message';
  if (normalizedType.includes('ACTIVITE') || normalizedType.includes('INSCRIPTION') || normalizedType.includes('PRESENCE') || normalizedType.includes('ATTENDANCE')) return 'activity';
  if (normalizedType.includes('PROJET') || normalizedType.includes('PROJECT')) return 'project';
  if (normalizedType.includes('GROUPE') || normalizedType.includes('ADHESION')) return 'group';
  if (normalizedType.includes('PAIEMENT') || normalizedType.includes('SOUTIEN') || normalizedType.includes('SUPPORT') || normalizedType.startsWith('PRESTATION_')) return 'money';
  return 'other';
}

function typeIcon(type) {
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
}

function getCategoryAccent(category) {
  const accents = {
    message: { bar: 'bg-blue-500', icon: 'bg-blue-50 text-blue-700', iconMuted: 'bg-slate-50 text-blue-400' },
    activity: { bar: 'bg-emerald-500', icon: 'bg-emerald-50 text-emerald-700', iconMuted: 'bg-slate-50 text-emerald-400' },
    project: { bar: 'bg-violet-500', icon: 'bg-violet-50 text-violet-700', iconMuted: 'bg-slate-50 text-violet-400' },
    group: { bar: 'bg-teal-500', icon: 'bg-teal-50 text-teal-700', iconMuted: 'bg-slate-50 text-teal-400' },
    money: { bar: 'bg-orange-500', icon: 'bg-orange-50 text-orange-700', iconMuted: 'bg-slate-50 text-orange-400' },
    other: { bar: 'bg-slate-300', icon: 'bg-slate-50 text-slate-600', iconMuted: 'bg-slate-50 text-slate-400' },
  };
  return accents[category] || accents.other;
}

function getNotificationActor(notification) {
  const direct = notification.auteur
    || notification.actor
    || notification.emetteur
    || notification.createdBy
    || notification.expediteur;
  if (direct) return String(direct);

  const firstName = notification.auteurPrenom || notification.prenomAuteur || notification.expediteurPrenom;
  const lastName = notification.auteurNom || notification.nomAuteur || notification.expediteurNom;
  return [firstName, lastName].filter(Boolean).join(' ').trim();
}

function getEmptyFilteredTitle({ filter, t }) {
  if (filter === 'unread') return t('notifications.emptyUnreadTitle');
  if (filter !== 'all') return t('notifications.emptyFilterTitle');
  return t('notifications.emptyTitle');
}

function formatNotificationDate(value, language, t) {
  if (!value) return t('notifications.dateNotProvided');
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return t('notifications.dateNotProvided');
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (isSameDay(date, today)) {
    return `${t('notifications.today')} · ${date.toLocaleTimeString(language || 'fr-BE', { hour: '2-digit', minute: '2-digit' })}`;
  }
  if (isSameDay(date, yesterday)) {
    return `${t('notifications.yesterday')} · ${date.toLocaleTimeString(language || 'fr-BE', { hour: '2-digit', minute: '2-digit' })}`;
  }
  return date.toLocaleDateString(language || 'fr-BE', { day: '2-digit', month: 'short', year: 'numeric' });
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}
