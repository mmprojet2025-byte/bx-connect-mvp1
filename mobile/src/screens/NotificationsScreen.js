import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, Linking, Alert
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import AppIcon from '../components/AppIcon';
import {
  EmptyState as SharedEmptyState,
  ErrorState as SharedErrorState,
  LoadingState,
} from '../components/MobileUI';

export default function NotificationsScreen({ navigation }) {
  const { t, i18n } = useTranslation();
  const { isMembre, isReferent, isAdmin, isSuperAdmin, isPartenaire } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data);
    } catch (err) {
      setNotifications([]);
      setError(getApiError(err, t, t('notifications.errorLoad')));
    } finally {
      setLoading(false);
    }
  };

  const handleMarquerLue = async (id) => {
    setError('');
    try {
      await api.patch(`/notifications/${id}/lue`);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, lue: true } : n)
      );
    } catch (err) {
      setError(getApiError(err, t, t('notifications.errorMarkAsRead')));
    }
  };

  const handleMarquerToutesLues = async () => {
    setActionLoading(true);
    setError('');
    setMessage('');
    try {
      await api.patch('/notifications/toutes-lues');
      setNotifications(prev => prev.map(n => ({ ...n, lue: true })));
      setMessage(t('notifications.allMarkedAsRead'));
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
      await api.delete(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      setError(getApiError(err, t, t('notifications.errorDelete')));
    }
  };

  const handleAction = async (notification) => {
    if (!notification.lue) {
      await handleMarquerLue(notification.id);
    }

    const target = resolveActionTarget(notification.lienAction, {
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

  const nonLues = notifications.filter(n => !n.lue).length;

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
          <Text style={[styles.readBadge, !item.lue && styles.unreadBadge]}>
            {item.lue ? t('notifications.read') : t('notifications.unread')}
          </Text>
        </View>

        {item.message && item.titre && (
          <Text style={styles.notifMessage} numberOfLines={3}>{item.message}</Text>
        )}

        {item.lienAction && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleAction(item)}
          >
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
            {nonLues > 0 ? t('notifications.unreadCount', { count: nonLues }) : t('notifications.allCaughtUp')}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.btnLight} onPress={fetchNotifications}>
            <Text style={styles.btnLightText}>{t('common.retry')}</Text>
          </TouchableOpacity>
          {nonLues > 0 && (
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
          onRetry={fetchNotifications}
        />
      ) : notifications.length === 0 ? (
        <SharedEmptyState
          icon="bell"
          title={t('notifications.emptyShort')}
          text={t('notifications.emptyDescriptionMobile')}
          actionLabel={t('common.retry')}
          onAction={fetchNotifications}
        />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderNotification}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onRefresh={fetchNotifications}
          refreshing={false}
        />
      )}
    </View>
  );
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

function resolveActionTarget(lienAction, roles) {
  if (!lienAction) return null;

  if (lienAction.startsWith('http://') || lienAction.startsWith('https://')) {
    return { external: true, url: lienAction };
  }

  const path = lienAction.toLowerCase();
  const availableTabs = getAvailableTabs(roles);

  if (path.includes('/dashboard') && availableTabs.has('TabDashboard')) {
    return { tab: 'TabDashboard' };
  }
  if (path.includes('/groupes')) {
    return availableTabs.has('TabGroupes')
      ? { tab: 'TabGroupes' }
      : { tab: 'TabDashboard', params: { screen: 'GroupesAccess' } };
  }
  if (path.includes('/activites') && availableTabs.has('TabActivities')) {
    return { tab: 'TabActivities' };
  }
  if (path.includes('/projets')) {
    return availableTabs.has('TabProjects')
      ? { tab: 'TabProjects' }
      : { tab: 'TabDashboard', params: { screen: 'ProjectsAccess' } };
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
  if (isSuperAdmin) return new Set(['TabDashboard', 'TabUsers', 'TabNotifications', 'TabProfile']);
  if (isAdmin) return new Set(['TabDashboard', 'TabUsers', 'TabActivities', 'TabNotifications', 'TabProfile']);
  if (isPartenaire) {
    return new Set(['TabDashboard', 'TabProjects', 'TabActivities', 'TabNotifications', 'TabProfile']);
  }
  if (isReferent) {
    return new Set([
      'TabDashboard',
      'TabActivities',
      'TabMessagerie',
      'TabNotifications',
      'TabProfile',
    ]);
  }
  if (isMembre) {
    return new Set([
      'TabDashboard',
      'TabActivities',
      'TabMessagerie',
      'TabNotifications',
      'TabProfile',
    ]);
  }
  return new Set(['TabDashboard', 'TabProfile']);
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
  return err.response?.data?.message || fallback;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eef2f7',
  },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#1E3A8A' },
  headerSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  btnLight: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 9,
    paddingVertical: 7,
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
    borderRadius: 22,
    padding: 14,
    marginBottom: 12,
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
  notifLeft: { position: 'relative', marginRight: 10 },
  notifIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
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
  notifTitle: { fontSize: 14, fontWeight: '900', color: '#1E3A8A', marginBottom: 4, lineHeight: 19 },
  notifTitleUnread: { fontWeight: '900', color: '#1E3A8A' },
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
  notifMessage: { fontSize: 12, color: '#64748b', lineHeight: 16, marginBottom: 5 },
  actionButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#F0F9FF',
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 5,
    marginBottom: 5,
  },
  actionButtonText: { color: '#38BDF8', fontSize: 11, fontWeight: '900' },
  notifDate: { fontSize: 11, color: '#94a3b8' },
  deleteBtn: {
    padding: 6,
    marginLeft: 6,
    borderRadius: 18,
    backgroundColor: '#fef2f2',
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
