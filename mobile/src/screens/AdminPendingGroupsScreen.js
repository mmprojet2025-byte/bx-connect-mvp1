import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import AppIcon from '../components/AppIcon';
import { Badge, Card, COLORS, EmptyState, SectionHeader } from '../components/MobileUI';

export default function AdminPendingGroupsScreen() {
  const { t } = useTranslation();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const res = await api.get('/admin/groupes/en-attente');
      setGroups(res.data || []);
    } catch (err) {
      setError(getApiError(err, t, t('adminMobile.pendingGroupsLoadError')));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const confirmAction = (group, action) => {
    const accepted = action === 'valider';
    Alert.alert(
      accepted ? t('adminMobile.validateGroup') : t('adminMobile.refuseGroup'),
      accepted ? t('adminMobile.confirmValidateGroup') : t('adminMobile.confirmRefuseGroup'),
      [
        { text: t('common.cancel', { defaultValue: 'Annuler' }), style: 'cancel' },
        {
          text: accepted ? t('adminMobile.validate') : t('adminMobile.refuse'),
          style: accepted ? 'default' : 'destructive',
          onPress: () => processGroup(group, action),
        },
      ],
    );
  };

  const processGroup = async (group, action) => {
    setProcessingId(group.id);
    setMessage('');
    setError('');
    try {
      if (action === 'valider') {
        await api.patch(`/admin/groupes/${group.id}/valider`);
        setMessage(t('adminMobile.groupValidated'));
      } else {
        await api.patch(`/admin/groupes/${group.id}/refuser`, {
          motif: t('adminMobile.mobileRefusalReason'),
        });
        setMessage(t('adminMobile.groupRefused'));
      }
      await loadGroups();
    } catch (err) {
      setError(getApiError(err, t, t('adminMobile.groupProcessError')));
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.bxBlue} />
        <Text style={styles.loadingText}>{t('adminMobile.pendingGroupsLoading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <SectionHeader
          title={t('adminMobile.pendingGroupsTitle')}
          subtitle={t('adminMobile.pendingGroupsSubtitle', { count: groups.length })}
          icon="warning"
        />
      </View>

      {message ? <InfoBox text={message} tone="success" /> : null}
      {error ? <InfoBox text={error} tone="danger" /> : null}

      {groups.length === 0 ? (
        <EmptyState
          icon="check"
          title={t('adminMobile.noPendingGroups')}
          text={t('adminMobile.noPendingGroupsText')}
          actionLabel={t('common.retry')}
          onAction={() => loadGroups()}
        />
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <GroupCard
              group={item}
              processing={processingId === item.id}
              onValidate={() => confirmAction(item, 'valider')}
              onRefuse={() => confirmAction(item, 'refuser')}
              t={t}
            />
          )}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadGroups(true)} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

function GroupCard({ group, processing, onValidate, onRefuse, t }) {
  return (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.iconBox}>
          <AppIcon name="group" size={20} color={COLORS.info} />
        </View>
        <View style={styles.cardText}>
          <Text style={styles.title}>{group.nom || t('navigation.groups')}</Text>
          <Text style={styles.subtitle} numberOfLines={2}>{group.description || t('common.notAvailable')}</Text>
        </View>
        <Badge label={t('statuses.EN_ATTENTE')} color="#d97706" soft />
      </View>

      <View style={styles.metaBox}>
        <Meta label={t('groups.category')} value={group.categorie || t('common.notAvailable')} />
        <Meta label={t('groups.theme')} value={group.theme || t('common.notAvailable')} />
        <Meta label={t('adminMobile.creator')} value={creatorName(group, t)} />
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={[styles.validateButton, processing && styles.disabled]} disabled={processing} onPress={onValidate}>
          <AppIcon name="check" size={16} color="#fff" />
          <Text style={styles.actionText}>{t('adminMobile.validate')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.refuseButton, processing && styles.disabled]} disabled={processing} onPress={onRefuse}>
          <AppIcon name="close" size={16} color="#fff" />
          <Text style={styles.actionText}>{t('adminMobile.refuse')}</Text>
        </TouchableOpacity>
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

function InfoBox({ text, tone }) {
  const success = tone === 'success';
  return (
    <View style={[styles.infoBox, { borderLeftColor: success ? COLORS.success : COLORS.danger, backgroundColor: success ? '#f0fdf4' : '#fef2f2' }]}>
      <Text style={[styles.infoText, { color: success ? '#15803d' : COLORS.danger }]}>{text}</Text>
    </View>
  );
}

function creatorName(group, t) {
  const name = `${group.createurPrenom || group.createur?.prenom || ''} ${group.createurNom || group.createur?.nom || ''}`.trim();
  return name || group.createurEmail || group.emailCreateur || t('common.notAvailable');
}

function getApiError(err, t, fallback) {
  if (err.response?.status === 401) return t('errors.session_expired');
  if (err.response?.status === 403) return t('errors.forbidden');
  return err.response?.data?.message || fallback;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.page },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.page, padding: 28 },
  loadingText: { marginTop: 12, color: COLORS.muted, fontSize: 14 },
  header: { backgroundColor: '#fff', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  list: { padding: 14, paddingBottom: 28 },
  card: { marginBottom: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  iconBox: { width: 42, height: 42, borderRadius: 14, backgroundColor: COLORS.softBlue, alignItems: 'center', justifyContent: 'center' },
  cardText: { flex: 1 },
  title: { color: COLORS.bxBlue, fontSize: 15, fontWeight: '900' },
  subtitle: { color: COLORS.muted, fontSize: 12, marginTop: 2, lineHeight: 17 },
  metaBox: { marginTop: 12, backgroundColor: '#f8fafc', borderRadius: 12, padding: 10 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  metaLabel: { color: COLORS.muted, fontSize: 11 },
  metaValue: { color: COLORS.bxBlue, fontSize: 11, fontWeight: '900', maxWidth: '58%', textAlign: 'right' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  validateButton: { flex: 1, backgroundColor: COLORS.success, borderRadius: 12, paddingVertical: 11, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  refuseButton: { flex: 1, backgroundColor: COLORS.danger, borderRadius: 12, paddingVertical: 11, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  actionText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  disabled: { opacity: 0.55 },
  infoBox: { marginHorizontal: 14, marginTop: 10, padding: 12, borderRadius: 10, borderLeftWidth: 4 },
  infoText: { fontSize: 13, lineHeight: 18 },
});
