import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import AppIcon from '../components/AppIcon';
import { Badge, Card, COLORS, EmptyState, SectionHeader } from '../components/MobileUI';

export default function ReferentRequestsScreen() {
  const { t, i18n } = useTranslation();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const groupesRes = await api.get('/referent/groupes');
      const groupes = groupesRes.data || [];
      const responses = await Promise.all(
        groupes.map(async (groupe) => {
          const res = await api.get(`/referent/groupes/${groupe.id}/demandes`);
          return (res.data || []).map((request) => ({
            ...request,
            groupeId: groupe.id,
            groupeNom: groupe.nom,
          }));
        }),
      );
      setRequests(responses.flat());
    } catch (err) {
      setError(getApiError(err, t, t('referentMobile.requestsLoadError')));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const confirmAction = (request, action) => {
    const accepted = action === 'accepter';
    Alert.alert(
      accepted ? t('referentMobile.acceptRequest') : t('referentMobile.refuseRequest'),
      accepted ? t('referentMobile.confirmAccept') : t('referentMobile.confirmRefuse'),
      [
        { text: t('common.cancel', { defaultValue: 'Annuler' }), style: 'cancel' },
        {
          text: accepted ? t('referentMobile.accept') : t('referentMobile.refuse'),
          style: accepted ? 'default' : 'destructive',
          onPress: () => processRequest(request, action),
        },
      ],
    );
  };

  const processRequest = async (request, action) => {
    setProcessingId(`${request.groupeId}-${request.id}`);
    setError('');
    setMessage('');
    try {
      await api.patch(`/referent/groupes/${request.groupeId}/demandes/${request.id}/${action}`);
      setMessage(action === 'accepter' ? t('referentMobile.requestAccepted') : t('referentMobile.requestRefused'));
      await loadRequests();
    } catch (err) {
      setError(getApiError(err, t, t('referentMobile.requestProcessError')));
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.bxBlue} />
        <Text style={styles.loadingText}>{t('referentMobile.requestsLoading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <SectionHeader
          title={t('referentMobile.requestsTitle')}
          subtitle={t('referentMobile.requestsSubtitle', { count: requests.length })}
          icon="warning"
        />
      </View>

      {message ? <InfoBox text={message} tone="success" /> : null}
      {error ? <InfoBox text={error} tone="danger" /> : null}

      {requests.length === 0 ? (
        <EmptyState
          icon="check"
          title={t('referentMobile.noRequests')}
          text={t('referentMobile.noRequestsText')}
          actionLabel={t('common.retry')}
          onAction={() => loadRequests()}
        />
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => `${item.groupeId}-${item.id}`}
          renderItem={({ item }) => (
            <RequestCard
              request={item}
              language={i18n.language}
              processing={processingId === `${item.groupeId}-${item.id}`}
              onAccept={() => confirmAction(item, 'accepter')}
              onRefuse={() => confirmAction(item, 'refuser')}
              t={t}
            />
          )}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadRequests(true)} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

function RequestCard({ request, language, processing, onAccept, onRefuse, t }) {
  const name = `${request.prenom || ''} ${request.nom || ''}`.trim() || t('referentMobile.unknownMember');

  return (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{name[0]?.toUpperCase() || '?'}</Text>
        </View>
        <View style={styles.cardText}>
          <Text style={styles.title}>{name}</Text>
          <Text style={styles.subtitle} numberOfLines={1}>{request.email || t('common.notAvailable')}</Text>
        </View>
        <Badge label={t('statuses.EN_ATTENTE')} color="#d97706" soft />
      </View>

      <View style={styles.metaBox}>
        <Meta label={t('navigation.groups')} value={request.groupeNom || t('common.notAvailable')} />
        <Meta label={t('partner.date')} value={formatDate(request.dateAdhesion || request.dateCreation, language, t)} />
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={[styles.acceptButton, processing && styles.disabled]} disabled={processing} onPress={onAccept}>
          <AppIcon name="check" size={16} color="#fff" />
          <Text style={styles.actionText}>{t('referentMobile.accept')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.refuseButton, processing && styles.disabled]} disabled={processing} onPress={onRefuse}>
          <AppIcon name="close" size={16} color="#fff" />
          <Text style={styles.actionText}>{t('referentMobile.refuse')}</Text>
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
  list: { padding: 14, paddingBottom: 28 },
  card: { marginBottom: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#0f766e', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  cardText: { flex: 1 },
  title: { color: COLORS.bxBlue, fontSize: 15, fontWeight: '900' },
  subtitle: { color: COLORS.muted, fontSize: 12, marginTop: 2 },
  metaBox: { marginTop: 12, backgroundColor: '#f8fafc', borderRadius: 12, padding: 10 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  metaLabel: { color: COLORS.muted, fontSize: 11 },
  metaValue: { color: COLORS.bxBlue, fontSize: 11, fontWeight: '900', maxWidth: '58%', textAlign: 'right' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  acceptButton: { flex: 1, minHeight: 44, backgroundColor: COLORS.success, borderRadius: 14, paddingVertical: 11, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  refuseButton: { flex: 1, minHeight: 44, backgroundColor: COLORS.danger, borderRadius: 14, paddingVertical: 11, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  actionText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  disabled: { opacity: 0.55 },
  infoBox: { marginHorizontal: 14, marginTop: 10, padding: 12, borderRadius: 10, borderLeftWidth: 4 },
  infoText: { fontSize: 13, lineHeight: 18 },
});
