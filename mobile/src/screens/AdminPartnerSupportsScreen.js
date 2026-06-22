import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import AppIcon from '../components/AppIcon';
import { Badge, Card, COLORS, EmptyState, SectionHeader } from '../components/MobileUI';

export default function AdminPartnerSupportsScreen() {
  const { t } = useTranslation();
  const [supports, setSupports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadSupports = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const res = await api.get('/partenaire/admin/tous');
      setSupports(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(getApiError(err, t, t('adminMobile.supportsLoadError')));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    loadSupports();
  }, [loadSupports]);

  const confirmAction = (support, action) => {
    const accepted = action === 'valider';
    Alert.alert(
      accepted
        ? t('adminMobile.approveSupport')
        : t('adminMobile.rejectSupport'),
      accepted
        ? t('adminMobile.confirmApproveSupport')
        : t('adminMobile.confirmRejectSupport'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: accepted ? t('adminMobile.validate') : t('adminMobile.refuse'),
          style: accepted ? 'default' : 'destructive',
          onPress: () => processSupport(support, action),
        },
      ],
    );
  };

  const processSupport = async (support, action) => {
    setProcessingId(support.id);
    setMessage('');
    setError('');
    try {
      await api.patch(`/partenaire/admin/${support.id}/${action}`, {
        commentaireAdmin: '',
      });
      setMessage(action === 'valider'
        ? t('adminMobile.supportApproved')
        : t('adminMobile.supportRejected'));
      await loadSupports();
    } catch (err) {
      setError(getApiError(err, t, t('adminMobile.supportProcessError')));
    } finally {
      setProcessingId(null);
    }
  };

  const pendingCount = useMemo(
    () => supports.filter((support) => support.statutPaiement === 'EN_ATTENTE').length,
    [supports],
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.bxBlue} />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <SectionHeader
          title={t('adminMobile.partnerSupportsTitle')}
          subtitle={t('adminMobile.partnerSupportsSubtitle',{
            count: pendingCount})}
          icon="wallet"
        />
      </View>

      {message ? <InfoBox text={message} tone="success" /> : null}
      {error ? <InfoBox text={error} tone="danger" /> : null}

      {supports.length === 0 ? (
        <EmptyState
          icon="wallet"
          title={t('adminMobile.noSupports')}
          text={t('adminMobile.noSupportsText')}
          actionLabel={t('common.retry')}
          onAction={() => loadSupports()}
        />
      ) : (
        <FlatList
          data={supports}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <SupportCard
              support={item}
              processing={processingId === item.id}
              onApprove={() => confirmAction(item, 'valider')}
              onReject={() => confirmAction(item, 'refuser')}
              t={t}
            />
          )}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadSupports(true)} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

function SupportCard({ support, processing, onApprove, onReject, t }) {
  const pending = support.statutPaiement === 'EN_ATTENTE';
  const target = support.projetTitre || support.activiteTitre || t('partner.supportFallback');

  return (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.iconBox}>
          <AppIcon name="wallet" size={20} color={COLORS.info} />
        </View>
        <View style={styles.cardText}>
          <Text style={styles.title} numberOfLines={1}>{target}</Text>
          <Text style={styles.subtitle} numberOfLines={1}>{partnerName(support, t)}</Text>
        </View>
        <Badge label={formatStatus(support.statutPaiement, t)} color={statusColor(support.statutPaiement)} soft />
      </View>

      <View style={styles.metaBox}>
        <Meta label={t('partner.amount')} value={`${support.montant || 0} €`} />
        <Meta label={t('partnerSupport.target')} value={support.projetTitre ? t('partnerSupport.project') : t('partnerSupport.activity')} />
        <Meta label={t('roles.PARTENAIRE')} value={partnerName(support, t)} />
        {support.reponseAdmin ? <Meta label={t('partnerSupport.adminReply')} value={support.reponseAdmin} /> : null}
      </View>

      {support.message ? <Text style={styles.message} numberOfLines={2}>{support.message}</Text> : null}

      {pending ? (
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.approveButton, processing && styles.disabled]} disabled={processing} onPress={onApprove}>
            <AppIcon name="check" size={16} color="#fff" />
            <Text style={styles.actionText}>{t('adminMobile.validate')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.rejectButton, processing && styles.disabled]} disabled={processing} onPress={onReject}>
            <AppIcon name="close" size={16} color="#fff" />
            <Text style={styles.actionText}>{t('adminMobile.refuse')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={styles.unavailableHint}>
          {t('adminMobile.supportActionUnavailable')}
        </Text>
      )}
    </Card>
  );
}

function Meta({ label, value }) {
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue} numberOfLines={1}>{value || '-'}</Text>
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

function partnerName(support, t) {
  const name = `${support.partenairePrenom || ''} ${support.partenaireNom || ''}`.trim();
  return name || support.partenaireEmail || t('common.notAvailable');
}

function formatStatus(status, t) {
  return t(`partner.supportStatuses.${status}`);
}

function statusColor(status) {
  if (status === 'PAYE') return COLORS.success;
  if (['REMBOURSE', 'ANNULE', 'ECHOUE'].includes(status)) return COLORS.danger;
  return COLORS.warning;
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
  list: { padding: 14, paddingBottom: 28 },
  card: { marginBottom: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBox: { width: 40, height: 40, borderRadius: 14, backgroundColor: COLORS.softBlue, alignItems: 'center', justifyContent: 'center' },
  cardText: { flex: 1, minWidth: 0 },
  title: { color: COLORS.bxBlue, fontSize: 15, lineHeight: 20, fontWeight: '900' },
  subtitle: { color: COLORS.muted, fontSize: 12, lineHeight: 16, marginTop: 2 },
  metaBox: { marginTop: 12, backgroundColor: '#f8fafc', borderRadius: 12, padding: 10 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  metaLabel: { color: COLORS.muted, fontSize: 11 },
  metaValue: { color: COLORS.bxBlue, fontSize: 11, fontWeight: '900', maxWidth: '58%', textAlign: 'right' },
  message: { marginTop: 10, color: COLORS.text, fontSize: 12, lineHeight: 17 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  approveButton: { flex: 1, minHeight: 44, backgroundColor: COLORS.success, borderRadius: 14, paddingVertical: 11, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  rejectButton: { flex: 1, minHeight: 44, backgroundColor: COLORS.danger, borderRadius: 14, paddingVertical: 11, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  actionText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  unavailableHint: { color: COLORS.muted, fontSize: 12, lineHeight: 17, marginTop: 12, backgroundColor: '#f8fafc', borderRadius: 10, padding: 9 },
  disabled: { opacity: 0.55 },
  infoBox: { marginHorizontal: 14, marginTop: 10, padding: 12, borderRadius: 10, borderLeftWidth: 4 },
  infoText: { fontSize: 13, lineHeight: 18 },
});
