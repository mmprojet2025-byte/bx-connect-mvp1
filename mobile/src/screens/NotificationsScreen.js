import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, Linking
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function NotificationsScreen({ navigation }) {
  const { t, i18n } = useTranslation();
  const { isMembre, isReferent, isAdmin, isSuperAdmin } = useAuth();
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
    });

    if (!target) {
      setMessage(t('notifications.actionAvailableWeb'));
      return;
    }

    if (target.external) {
      await Linking.openURL(target.url);
      return;
    }

    navigation.getParent()?.navigate(target.tab);
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
          <Text style={styles.notifIconText}>{typeIcon(item.type)}</Text>
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
        <Text style={styles.deleteBtnText}>×</Text>
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
                ? <ActivityIndicator color="#2563eb" size="small" />
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

      {error !== '' && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#1e3a5f" />
          <Text style={styles.loadingText}>{t('notifications.loading')}</Text>
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>🔔</Text>
          <Text style={styles.emptyTitle}>{t('notifications.emptyShort')}</Text>
          <Text style={styles.emptyText}>
            {t('notifications.emptyDescriptionMobile')}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchNotifications}>
            <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
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
    case 'INSCRIPTION': return '🎯';
    case 'PROJET': return '🚀';
    case 'ANNONCE': return '📢';
    case 'PAIEMENT': return '💶';
    case 'MESSAGE': return '💬';
    case 'GROUPE': return '👥';
    default: return '🔔';
  }
}

function typeColor(type) {
  switch (type) {
    case 'INSCRIPTION': return '#dbeafe';
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
  if (path.includes('/groupes') && availableTabs.has('TabGroupes')) {
    return { tab: 'TabGroupes' };
  }
  if (path.includes('/activites') && availableTabs.has('TabActivities')) {
    return { tab: 'TabActivities' };
  }
  if (path.includes('/projets') && availableTabs.has('TabProjects')) {
    return { tab: 'TabProjects' };
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

function getAvailableTabs({ isMembre, isReferent, isAdmin, isSuperAdmin }) {
  if (isSuperAdmin) return new Set(['TabDashboard', 'TabProfile']);
  if (isAdmin) return new Set(['TabDashboard', 'TabNotifications', 'TabProfile']);
  if (isReferent) {
    return new Set([
      'TabDashboard',
      'TabGroupes',
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
      'TabGroupes',
      'TabProjects',
      'TabMessagerie',
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
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#1e3a5f' },
  headerSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  btnLight: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
  },
  btnLightText: { color: '#64748b', fontSize: 12, fontWeight: '800' },
  btnToutesLues: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  btnToutesLuesText: { color: '#2563eb', fontSize: 12, fontWeight: '800' },
  btnDisabled: { opacity: 0.6 },

  successBox: {
    backgroundColor: '#f0fdf4',
    borderLeftWidth: 4,
    borderLeftColor: '#16a34a',
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
  },
  successText: { color: '#15803d', fontSize: 13 },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderLeftWidth: 4,
    borderLeftColor: '#dc2626',
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
  },
  errorText: { color: '#dc2626', fontSize: 13 },

  listContent: { padding: 12, paddingBottom: 40 },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  notifCardUnread: {
    backgroundColor: '#f0f7ff',
    borderLeftWidth: 3,
    borderLeftColor: '#2563eb',
  },
  notifLeft: { position: 'relative', marginRight: 12 },
  notifIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifIconText: { fontSize: 20 },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2563eb',
    borderWidth: 2,
    borderColor: '#fff',
  },
  notifContent: { flex: 1 },
  titleRow: { marginBottom: 4 },
  notifTitle: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 5 },
  notifTitleUnread: { fontWeight: '900', color: '#1e3a5f' },
  readBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#f1f5f9',
    color: '#64748b',
    fontSize: 10,
    fontWeight: '900',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 20,
    overflow: 'hidden',
  },
  unreadBadge: { backgroundColor: '#dbeafe', color: '#2563eb' },
  notifMessage: { fontSize: 12, color: '#64748b', lineHeight: 17, marginBottom: 4 },
  actionButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#eff6ff',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 5,
  },
  actionButtonText: { color: '#2563eb', fontSize: 12, fontWeight: '900' },
  notifDate: { fontSize: 11, color: '#94a3b8' },
  deleteBtn: { padding: 4, marginLeft: 8 },
  deleteBtnText: { color: '#94a3b8', fontSize: 20, fontWeight: '900', lineHeight: 20 },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  loadingText: { marginTop: 12, color: '#64748b', fontSize: 14 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: '#1e3a5f', marginBottom: 8 },
  emptyText: { color: '#64748b', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  retryButton: {
    marginTop: 18,
    backgroundColor: '#1e3a5f',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  retryButtonText: { color: '#fff', fontWeight: '900', fontSize: 13 },
});
