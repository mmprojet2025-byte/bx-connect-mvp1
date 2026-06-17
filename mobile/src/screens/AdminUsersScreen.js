import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import AppIcon from '../components/AppIcon';
import { Badge, Card, COLORS, EmptyState, SectionHeader } from '../components/MobileUI';

export default function AdminUsersScreen() {
  const { t } = useTranslation();
  const { isSuperAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    chargerUtilisateurs();
  }, []);

  const chargerUtilisateurs = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const endpoint = isSuperAdmin ? '/super-admin/admins' : '/admin/utilisateurs';
      const res = await api.get(endpoint);
      setUsers(res.data || []);
    } catch (err) {
      setError(getApiError(err, t, t('adminMobile.usersLoadError')));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filteredUsers = users.filter((user) => {
    const text = `${user.prenom || ''} ${user.nom || ''} ${user.email || ''} ${user.role || ''}`;
    return text.toLowerCase().includes(search.toLowerCase());
  });

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.bxBlue} />
        <Text style={styles.loadingText}>{t('adminMobile.usersLoading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <SectionHeader
          title={t('adminMobile.usersTitle')}
          subtitle={isSuperAdmin ? t('adminMobile.platformUsersSubtitle') : t('adminMobile.usersSubtitle')}
          icon="group"
        />
        <View style={styles.searchBox}>
          <AppIcon name="search" size={18} color={COLORS.muted} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder={t('adminMobile.searchUsers')}
            placeholderTextColor="#94a3b8"
          />
        </View>
      </View>

      {error ? (
        <EmptyState
          icon="warning"
          title={t('common.error')}
          text={error}
          actionLabel={t('common.retry')}
          onAction={() => chargerUtilisateurs()}
        />
      ) : filteredUsers.length === 0 ? (
        <EmptyState
          icon="group"
          title={t('adminMobile.noUsers')}
          text={t('adminMobile.noUsersText')}
          actionLabel={t('common.retry')}
          onAction={() => chargerUtilisateurs()}
        />
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <UserCard user={item} t={t} />}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => chargerUtilisateurs(true)} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

function UserCard({ user, t }) {
  const fullName = `${user.prenom || ''} ${user.nom || ''}`.trim() || t('adminMobile.unknownUser');
  const active = user.actif !== false;

  return (
    <Card style={styles.card}>
      <View style={styles.cardTop}>
        <View style={[styles.avatar, { backgroundColor: roleColor(user.role) }]}>
          <Text style={styles.avatarText}>{initials(user)}</Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.name} numberOfLines={1}>{fullName}</Text>
          <Text style={styles.email} numberOfLines={1}>{user.email || t('common.notAvailable')}</Text>
        </View>
        <Badge
          label={active ? t('common.active') : t('common.inactive')}
          color={active ? COLORS.success : COLORS.danger}
          soft
        />
      </View>
      <View style={styles.metaRow}>
        <Text style={styles.metaLabel}>{t('users.role')}</Text>
        <Text style={[styles.metaValue, { color: roleColor(user.role) }]}>
          {t(`roles.${user.role}`, { defaultValue: user.role || t('common.notAvailable') })}
        </Text>
      </View>
    </Card>
  );
}

function initials(user) {
  return `${user.prenom?.[0] || ''}${user.nom?.[0] || ''}`.toUpperCase() || '?';
}

function roleColor(role) {
  if (role === 'REFERENT') return '#0f766e';
  if (role === 'PARTENAIRE') return COLORS.impactOrange;
  return COLORS.info;
}

function getApiError(err, t, fallback) {
  if (err.response?.status === 401) return t('errors.session_expired');
  if (err.response?.status === 403) return t('errors.forbidden');
  return fallback;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.page },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: COLORS.page },
  loadingText: { marginTop: 12, color: COLORS.muted, fontSize: 14 },
  header: { backgroundColor: '#fff', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: { flex: 1, color: '#0f172a', fontSize: 14 },
  list: { padding: 14, paddingBottom: 28 },
  card: { marginBottom: 12 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  userInfo: { flex: 1 },
  name: { color: COLORS.bxBlue, fontSize: 15, fontWeight: '900', lineHeight: 20 },
  email: { color: COLORS.muted, fontSize: 12, marginTop: 2, lineHeight: 16 },
  metaRow: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eef2f7',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaLabel: { color: COLORS.muted, fontSize: 12 },
  metaValue: { fontSize: 12, fontWeight: '900' },
});
