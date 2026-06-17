import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import { Badge, Card, COLORS, EmptyState, SectionHeader } from '../components/MobileUI';

export default function ReferentMembersScreen() {
  const { t, i18n } = useTranslation();
  const [groups, setGroups] = useState([]);
  const [members, setMembers] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const groupesRes = await api.get('/referent/groupes');
      const groupes = groupesRes.data || [];
      const responses = await Promise.all(
        groupes.map(async (groupe) => {
          const res = await api.get(`/referent/groupes/${groupe.id}/membres`);
          return (res.data || []).map((member) => ({
            ...member,
            groupeId: groupe.id,
            groupeNom: groupe.nom,
          }));
        }),
      );
      setGroups(groupes);
      setMembers(responses.flat());
    } catch (err) {
      setError(getApiError(err, t, t('referentMobile.membersLoadError')));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filteredMembers = useMemo(() => {
    if (!selectedGroupId) return members;
    return members.filter((member) => String(member.groupeId) === selectedGroupId);
  }, [members, selectedGroupId]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.bxBlue} />
        <Text style={styles.loadingText}>{t('referentMobile.membersLoading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <SectionHeader
          title={t('referentMobile.membersTitle')}
          subtitle={t('referentMobile.membersSubtitle', { count: filteredMembers.length })}
          icon="group"
        />
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[{ id: '', nom: t('referentMobile.allGroups') }, ...groups]}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.filters}
          renderItem={({ item }) => {
            const active = String(item.id) === selectedGroupId;
            return (
              <TouchableOpacity
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setSelectedGroupId(String(item.id))}
              >
                <Text style={[styles.filterText, active && styles.filterTextActive]} numberOfLines={1}>{item.nom}</Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {error ? (
        <EmptyState
          icon="warning"
          title={t('common.error')}
          text={error}
          actionLabel={t('common.retry')}
          onAction={() => loadMembers()}
        />
      ) : filteredMembers.length === 0 ? (
        <EmptyState
          icon="group"
          title={t('referentMobile.noMembers')}
          text={t('referentMobile.noMembersText')}
          actionLabel={t('common.retry')}
          onAction={() => loadMembers()}
        />
      ) : (
        <FlatList
          data={filteredMembers}
          keyExtractor={(item) => `${item.groupeId}-${item.id}`}
          renderItem={({ item }) => <MemberCard member={item} language={i18n.language} t={t} />}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadMembers(true)} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

function MemberCard({ member, language, t }) {
  const name = `${member.prenom || ''} ${member.nom || ''}`.trim() || t('referentMobile.unknownMember');
  const status = member.statut || member.statutAdhesion || 'ACCEPTE';

  return (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{name[0]?.toUpperCase() || '?'}</Text>
        </View>
        <View style={styles.cardText}>
          <Text style={styles.title}>{name}</Text>
          <Text style={styles.subtitle} numberOfLines={1}>{member.email || t('common.notAvailable')}</Text>
        </View>
        <Badge label={t(`statuses.${status}`, { defaultValue: status })} color={statusColor(status)} soft />
      </View>
      <View style={styles.metaBox}>
        <Meta label={t('navigation.groups')} value={member.groupeNom || t('common.notAvailable')} />
        <Meta label={t('referentMobile.memberSince')} value={formatDate(member.dateAdhesion || member.dateCreation, language, t)} />
      </View>
    </Card>
  );
}

function Meta({ label, value }) {
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function statusColor(status) {
  if (status === 'ACCEPTE' || status === 'VALIDE') return COLORS.success;
  if (status === 'REFUSE') return COLORS.danger;
  return COLORS.info;
}

function formatDate(value, language, t) {
  if (!value) return t('common.notAvailable');
  return new Date(value).toLocaleDateString(language || 'fr-BE');
}

function getApiError(err, t, fallback) {
  if (err.response?.status === 401) return t('errors.session_expired');
  if (err.response?.status === 403) return t('errors.forbidden');
  return fallback;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.page },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.page, padding: 28 },
  loadingText: { marginTop: 12, color: COLORS.muted, fontSize: 14 },
  header: { backgroundColor: '#fff', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  filters: { gap: 8, paddingTop: 2 },
  filterChip: { maxWidth: 150, borderWidth: 1, borderColor: COLORS.border, backgroundColor: '#f8fafc', borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8 },
  filterChipActive: { backgroundColor: COLORS.bxBlue, borderColor: COLORS.bxBlue },
  filterText: { color: COLORS.muted, fontSize: 12, fontWeight: '800' },
  filterTextActive: { color: '#fff' },
  list: { padding: 14, paddingBottom: 28 },
  card: { marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 42, height: 42, borderRadius: 14, backgroundColor: COLORS.info, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  cardText: { flex: 1 },
  title: { color: COLORS.bxBlue, fontSize: 15, fontWeight: '900', lineHeight: 20 },
  subtitle: { color: COLORS.muted, fontSize: 12, marginTop: 2, lineHeight: 16 },
  metaBox: { marginTop: 12, backgroundColor: '#f8fafc', borderRadius: 12, padding: 10 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  metaLabel: { color: COLORS.muted, fontSize: 11 },
  metaValue: { color: COLORS.bxBlue, fontSize: 11, fontWeight: '900', maxWidth: '58%', textAlign: 'right' },
});
