import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, Linking, Alert
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import {
  deleteNotification,
  getNotificationsPage,
  getUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from '../api/notifications';
import AppIcon from '../components/AppIcon';
import {
  EmptyState as SharedEmptyState,
  ErrorState as SharedErrorState,
  LoadingState,
} from '../components/MobileUI';

const NOTIFICATIONS_PAGE_SIZE = 20;

export default function NotificationsScreen({ navigation }) {
  const { t, i18n } = useTranslation();
  const { isMembre, isReferent, isAdmin, isSuperAdmin, isPartenaire } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [pagination, setPagination] = useState({
    page: 0,
    size: NOTIFICATIONS_PAGE_SIZE,
    totalElements: 0,
    totalPages: 0,
    last: true,
  });

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async (page = 0, append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError('');
    setMessage('');
    try {
      const [pageData, count] = await Promise.all([
        getNotificationsPage(page, NOTIFICATIONS_PAGE_SIZE),
        getUnreadCount(),
      ]);
      setNotifications(prev => append ? mergeNotifications(prev, pageData.content) : pageData.content);
      setUnreadCount(count);
      setPagination({
        page: pageData.page,
        size: pageData.size,
        totalElements: pageData.totalElements,
        totalPages: pageData.totalPages,
        last: pageData.last,
      });
    } catch (err) {
      if (!append) setNotifications([]);
      setError(getApiError(err, t, t('notifications.errorLoad')));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (!loadingMore && !pagination.last) {
      fetchNotifications(pagination.page + 1, true);
    }
  };

  const handleMarquerLue = async (id) => {
    setError('');
    try {
      const wasUnread = notifications.some(n => n.id === id && !n.lue);
      await markNotificationRead(id);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, lue: true } : n)
      );
      if (wasUnread) {
        setUnreadCount(prev => Math.max(prev - 1, 0));
      }
    } catch (err) {
      setError(getApiError(err, t, t('notifications.errorMarkAsRead')));
    }
  };

  const handleMarquerToutesLues = async () => {
    setActionLoading(true);
    setError('');
    setMessage('');
    try {
      await markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, lue: true })));
      setUnreadCount(0);
      setMessage(t('notifications.allMarkedAsRead'));
      fetchNotifications(0, false);
    } catch (err) {
      setError(getApiError(err, t, t('notifications.errorMarkAllAsRead')));
    } finally {
      setActionLoading(false);
    }
  };

  const handleSupprimer = async (id) => {
    Alert.alert(
      t('common.delete'),
      t('notifications.confirmDelete'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => supprimerNotification(id),
        },
      ],
    );
  };

  const supprimerNotification = async (id) => {
    setError('');
    try {
      const wasUnread = notifications.some(n => n.id === id && !n.lue);
      await deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      if (wasUnread) {
        setUnreadCount(prev => Math.max(prev - 1, 0));
      } else {
        refreshUnreadCount();
      }
    } catch (err) {
      setError(getApiError(err, t, t('notifications.errorDelete')));
    }
  };

  const refreshUnreadCount = async () => {
    try {
      setUnreadCount(await getUnreadCount());
    } catch {
      // Le compteur n'est pas bloquant pour l'affichage de la liste.
    }
  };

  const handleAction = async (notification) => {
    if (!notification.lue) {
      await handleMarquerLue(notification.id);
    }

    const target = resolveActionTarget(notification, {
      isMembre,
      isReferent,
      isAdmin,
      isSuperAdmin,
      isPartenaire,
    });

    if (!target) {
      setMessage(t('notifications.actionAvailableWeb'));
      return;
    }

    if (target.external) {
      await Linking.openURL(target.url);
      return;
    }

    navigation.getParent()?.navigate(target.tab, target.params);
  };

  const renderNotification = ({ item }) => (
    <TouchableOpacity
      style={[styles.notifCard, !item.lue && styles.notifCardUnread]}
      onPress={() => !item.lue && handleMarquerLue(item.id)}
      activeOpacity={0.8}
    >
      <View style={styles.notifLeft}>
        <View style={[styles.notifIcon, { backgroundColor: typeColor(item.type) }]}>
          <AppIcon name={typeIcon(item.type)} size={20} color={typeIconColor(item.type)} />
        </View>
        {!item.lue && <View style={styles.unreadDot} />}
      </View>

      <View style={styles.notifContent}>
        <View style={styles.titleRow}>
          <Text style={[styles.notifTitle, !item.lue && styles.notifTitleUnread]} numberOfLines={2}>
            {item.titre || item.message || t('notifications.title')}
          </Text>
          <View style={styles.badgeRow}>
            <Text style={[styles.typeBadge, { color: typeIconColor(item.type), backgroundColor: typeColor(item.type) }]}>
              {formatType(item.type, t)}
            </Text>
            <Text style={[styles.readBadge, !item.lue && styles.unreadBadge]}>
              {item.lue ? t('notifications.read') : t('notifications.unread')}
            </Text>
          </View>
        </View>

        {item.message && item.titre && (
          <Text style={styles.notifMessage} numberOfLines={3}>{item.message}</Text>
        )}

        {item.lienAction && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleAction(item)}
          >
            <AppIcon name="chevron-forward" size={14} color="#fff" />
            <Text style={styles.actionButtonText}>{t('notifications.openAction')}</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.notifDate}>{formatDate(item.dateCreation || item.date, i18n.language, t)}</Text>
      </View>

      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={() => handleSupprimer(item.id)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityLabel={t('common.delete')}
      >
        <AppIcon name="trash" size={18} color="#EF4444" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{t('notifications.title')}</Text>
          <Text style={styles.headerSub}>
            {unreadCount > 0 ? t('notifications.unreadCount', { count: unreadCount }) : t('notifications.allCaughtUp')}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.btnLight} onPress={() => fetchNotifications(0, false)}>
            <Text style={styles.btnLightText}>{t('common.retry')}</Text>
          </TouchableOpacity>
          {unreadCount > 0 && (
            <TouchableOpacity
              style={[styles.btnToutesLues, actionLoading && styles.btnDisabled]}
              onPress={handleMarquerToutesLues}
              disabled={actionLoading}
            >
              {actionLoading
                ? <ActivityIndicator color="#38BDF8" size="small" />
                : <Text style={styles.btnToutesLuesText}>{t('notifications.markAllAsReadShort')}</Text>
              }
            </TouchableOpacity>
          )}
        </View>
      </View>

      {message !== '' && (
        <View style={styles.successBox}>
          <Text style={styles.successText}>{message}</Text>
        </View>
      )}

      {error !== '' && notifications.length > 0 && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {loading ? (
        <LoadingState label={t('common.loading')} />
      ) : error !== '' && notifications.length === 0 ? (
        <SharedErrorState
          title={t('common.loadErrorTitle')}
          text={error || t('common.loadErrorDescription')}
          retryLabel={t('common.retry')}
          onRetry={() => fetchNotifications(0, false)}
        />
      ) : notifications.length === 0 ? (
        <SharedEmptyState
          icon="bell"
          illustrationSource={require('../assets/images/placeholders/notifications.png')}
          title={t('notifications.emptyShort')}
          text={t('notifications.emptyDescriptionMobile')}
          actionLabel={t('common.retry')}
          onAction={() => fetchNotifications(0, false)}
        />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderNotification}
          ListFooterComponent={!pagination.last ? (
            <TouchableOpacity
              style={[styles.loadMoreButton, loadingMore && styles.btnDisabled]}
              onPress={handleLoadMore}
              disabled={loadingMore}
            >
              {loadingMore ? (
                <ActivityIndicator color="#38BDF8" size="small" />
              ) : (
                <>
                  <AppIcon name="chevron-down" size={16} color="#38BDF8" />
                  <Text style={styles.loadMoreText}>{t('notifications.loadMore')}</Text>
                </>
              )}
            </TouchableOpacity>
          ) : null}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onRefresh={() => fetchNotifications(0, false)}
          refreshing={false}
        />
      )}
    </View>
  );
}

function mergeNotifications(current, next) {
  const byId = new Map(current.map(notification => [notification.id, notification]));
  next.forEach(notification => byId.set(notification.id, notification));
  return Array.from(byId.values());
}

function typeIcon(type) {
  switch (type) {
    case 'INSCRIPTION': return 'activity';
    case 'PROJET': return 'project';
    case 'ANNONCE': return 'alert';
    case 'PAIEMENT': return 'wallet';
    case 'MESSAGE': return 'message';
    case 'GROUPE': return 'group';
    default: return 'bell';
  }
}

function typeIconColor(type) {
  switch (type) {
    case 'INSCRIPTION': return '#38BDF8';
    case 'PROJET': return '#22C55E';
    case 'ANNONCE': return '#ca8a04';
    case 'PAIEMENT': return '#db2777';
    case 'MESSAGE': return '#7c3aed';
    case 'GROUPE': return '#0f766e';
    default: return '#64748b';
  }
}

function typeColor(type) {
  switch (type) {
    case 'INSCRIPTION': return '#E0F2FE';
    case 'PROJET': return '#dcfce7';
    case 'ANNONCE': return '#fef9c3';
    case 'PAIEMENT': return '#fce7f3';
    case 'MESSAGE': return '#ede9fe';
    case 'GROUPE': return '#ccfbf1';
    default: return '#f1f5f9';
  }
}

function formatType(type, t) {
  if (!type) return t('notifications.genericType', { defaultValue: 'Notification' });
  return t(`notifications.types.${type}`, {
    defaultValue: t('notifications.genericType', { defaultValue: 'Notification' }),
  });
}

function resolveActionTarget(notification, roles) {
  const lienAction = notification?.lienAction;
  if (!lienAction) return null;

  if (lienAction.startsWith('http://') || lienAction.startsWith('https://')) {
    return { external: true, url: lienAction };
  }

  const path = lienAction.toLowerCase();
  const type = String(notification?.type || '').toUpperCase();
  const availableTabs = getAvailableTabs(roles);

  if (isBusinessConversationNotification(type, path) && availableTabs.has('TabBusinessConversations')) {
    const conversationId = path.match(/\/conversations-metier\/(\d+)/)?.[1];
    return conversationId
      ? { tab: 'TabBusinessConversations', params: { screen: 'Main', params: { conversationId } } }
      : { tab: 'TabBusinessConversations' };
  }

  if (path.includes('/dashboard') && availableTabs.has('TabDashboard')) {
    return { tab: 'TabDashboard' };
  }
  if ((path.includes('/utilisateurs') || path.includes('/admins')) && availableTabs.has('TabUsers')) {
    return { tab: 'TabUsers' };
  }
  if (path.includes('/demandes') && roles.isReferent) {
    return { tab: 'TabDashboard', params: { screen: 'ReferentRequestsAccess' } };
  }
  if (path.includes('/groupes/en-attente') && roles.isAdmin) {
    return { tab: 'TabDashboard', params: { screen: 'AdminPendingGroupsAccess' } };
  }
  if ((path.includes('/soutiens') || path.includes('/paiements')) && roles.isPartenaire) {
    return { tab: 'TabDashboard', params: { screen: 'SupportsAccess' } };
  }
  if (path.includes('/groupes')) {
    if (availableTabs.has('TabGroupes')) return { tab: 'TabGroupes' };
    if (roles.isAdmin) return { tab: 'TabDashboard', params: { screen: 'GroupesAccess' } };
    return null;
  }
  if (path.includes('/activites') && availableTabs.has('TabActivities')) {
    return { tab: 'TabActivities' };
  }
  if (path.includes('/projets')) {
    if (availableTabs.has('TabProjects')) {
      return { tab: 'TabProjects' };
    }
    if (availableTabs.has('TabGroupes')) {
      return { tab: 'TabGroupes', params: { screen: 'ProjectsAccess' } };
    }
    if (roles.isAdmin) {
      return { tab: 'TabDashboard', params: { screen: 'ProjectsAccess' } };
    }
    return null;
  }
  if (path.includes('/messagerie') && availableTabs.has('TabMessagerie')) {
    return { tab: 'TabMessagerie' };
  }
  if (path.includes('/notifications') && availableTabs.has('TabNotifications')) {
    return { tab: 'TabNotifications' };
  }
  if (path.includes('/profil') && availableTabs.has('TabProfile')) {
    return { tab: 'TabProfile' };
  }

  return null;
}

function getAvailableTabs({ isMembre, isReferent, isAdmin, isSuperAdmin, isPartenaire }) {
  if (isSuperAdmin) return new Set(['TabDashboard', 'TabUsers', 'TabBusinessConversations', 'TabNotifications', 'TabProfile']);
  if (isAdmin) return new Set(['TabDashboard', 'TabUsers', 'TabActivities', 'TabBusinessConversations', 'TabNotifications', 'TabProfile']);
  if (isPartenaire) {
    return new Set(['TabDashboard', 'TabProjects', 'TabActivities', 'TabBusinessConversations', 'TabNotifications', 'TabProfile']);
  }
  if (isReferent) {
    return new Set([
      'TabDashboard',
      'TabGroupes',
      'TabActivities',
      'TabMessagerie',
      'TabBusinessConversations',
      'TabNotifications',
      'TabProfile',
    ]);
  }
  if (isMembre) {
    return new Set([
      'TabDashboard',
      'TabGroupes',
      'TabActivities',
      'TabMessagerie',
      'TabNotifications',
      'TabProfile',
    ]);
  }
  return new Set(['TabDashboard', 'TabProfile']);
}

function isBusinessConversationNotification(type, path) {
  return type === 'BUSINESS_CONVERSATION_CREATED'
    || type === 'BUSINESS_MESSAGE'
    || path.includes('/conversations-metier');
}

function formatDate(dateStr, language, t) {
  if (!dateStr) return t('notifications.dateNotProvided');
  return new Date(dateStr).toLocaleDateString(language || 'fr-BE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getApiError(err, t, fallback) {
  if (err.response?.status === 401) {
    return t('errors.session_expired');
  }
  if (err.response?.status === 403) {
    return t('errors.forbidden');
  }
  return fallback;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eef2f7',
  },
  headerTitle: { fontSize: 16, fontWeight: '900', color: '#1E3A8A' },
  headerSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  btnLight: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 20,
  },
  btnLightText: { color: '#64748b', fontSize: 12, fontWeight: '800' },
  btnToutesLues: {
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  btnToutesLuesText: { color: '#38BDF8', fontSize: 12, fontWeight: '800' },
  btnDisabled: { opacity: 0.6 },

  successBox: {
    backgroundColor: '#f0fdf4',
    borderLeftWidth: 4,
    borderLeftColor: '#22C55E',
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
  },
  successText: { color: '#15803d', fontSize: 13 },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
  },
  errorText: { color: '#EF4444', fontSize: 13 },

  listContent: { padding: 14, paddingBottom: 28 },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    marginBottom: 9,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#eef2f7',
  },
  notifCardUnread: {
    backgroundColor: '#f0f7ff',
    borderLeftWidth: 3,
    borderLeftColor: '#38BDF8',
  },
  notifLeft: { position: 'relative', marginRight: 9 },
  notifIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#38BDF8',
    borderWidth: 2,
    borderColor: '#fff',
  },
  notifContent: { flex: 1 },
  titleRow: { marginBottom: 3 },
  notifTitle: { fontSize: 13, fontWeight: '900', color: '#1E3A8A', marginBottom: 4, lineHeight: 18 },
  notifTitleUnread: { fontWeight: '900', color: '#1E3A8A' },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 2 },
  typeBadge: {
    alignSelf: 'flex-start',
    fontSize: 9,
    fontWeight: '900',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 20,
    overflow: 'hidden',
    textTransform: 'uppercase',
  },
  readBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#f1f5f9',
    color: '#64748b',
    fontSize: 9,
    fontWeight: '900',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 20,
    overflow: 'hidden',
  },
  unreadBadge: { backgroundColor: '#E0F2FE', color: '#38BDF8' },
  notifMessage: { fontSize: 12, color: '#64748b', lineHeight: 16, marginBottom: 7 },
  actionButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2563EB',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 6,
  },
  actionButtonText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  notifDate: { fontSize: 11, color: '#94a3b8' },
  deleteBtn: {
    padding: 5,
    marginLeft: 6,
    borderRadius: 18,
    backgroundColor: '#fef2f2',
  },
  loadMoreButton: {
    alignSelf: 'center',
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginTop: 4,
  },
  loadMoreText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '900',
  },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  loadingText: { marginTop: 12, color: '#64748b', fontSize: 14 },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: '#1E3A8A', marginBottom: 8 },
  emptyText: { color: '#64748b', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  retryButton: {
    marginTop: 18,
    backgroundColor: '#1E3A8A',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  retryButtonText: { color: '#fff', fontWeight: '900', fontSize: 13 },
});
