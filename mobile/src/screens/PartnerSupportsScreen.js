import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import AppIcon from '../components/AppIcon';
import { Badge, Card, COLORS, EmptyState, SectionHeader, StatCard } from '../components/MobileUI';

export default function PartnerSupportsScreen() {
  const { t, i18n } = useTranslation();
  const [supports, setSupports] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    chargerSoutiens();
  }, []);

  const chargerSoutiens = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const [supportsRes, statsRes] = await Promise.all([
        api.get('/partenaire/mes-soutiens'),
        api.get('/partenaire/statistiques').catch(() => ({ data: null })),
      ]);
      setSupports(supportsRes.data || []);
      setStats(statsRes.data);
    } catch (err) {
      setError(getApiError(err, t, t('partner.supportsLoadError')));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.bxBlue} />
        <Text style={styles.loadingText}>{t('partner.supportsLoading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <SectionHeader
          title={t('partner.supports')}
          subtitle={t('partner.supportsSubtitle')}
          icon="wallet"
        />
        <View style={styles.statsGrid}>
          <StatCard label={t('partner.totalSupports')} value={stats?.totalSoutiens ?? supports.length} icon="wallet" color={COLORS.impactOrange} />
          <StatCard label={t('partner.totalAmount')} value={`${stats?.totalMontant || 0} €`} icon="payment" color={COLORS.success} />
        </View>
      </View>

      {error ? (
        <EmptyState
          icon="warning"
          title={t('common.error')}
          text={error}
          actionLabel={t('common.retry')}
          onAction={() => chargerSoutiens()}
        />
      ) : supports.length === 0 ? (
        <EmptyState
          icon="wallet"
          title={t('partner.noSupports')}
          text={t('partner.noSupportsText')}
          actionLabel={t('common.retry')}
          onAction={() => chargerSoutiens()}
        />
      ) : (
        <FlatList
          data={supports}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <SupportCard support={item} t={t} language={i18n.language} />}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => chargerSoutiens(true)} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

function SupportCard({ support, t, language }) {
  const isProject = !!support.projetTitre;
  const title = support.projetTitre || support.activiteTitre || t('partner.supportFallback');
  const status = support.statutPaiement || support.statut || 'EN_ATTENTE';

  return (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconBox, { backgroundColor: isProject ? '#ffedd5' : '#E0F2FE' }]}>
          <AppIcon name={isProject ? 'project' : 'activity'} size={20} color={isProject ? COLORS.impactOrange : COLORS.info} />
        </View>
        <View style={styles.cardText}>
          <Text style={styles.title} numberOfLines={2}>{title}</Text>
          <Text style={styles.subtitle}>{isProject ? t('navigation.projects') : t('navigation.activities')}</Text>
        </View>
        <Badge label={t(`partner.supportStatuses.${status}`, { defaultValue: status })} color={statusColor(status)} soft />
      </View>
      <View style={styles.metaBox}>
        <Meta label={t('partner.amount')} value={`${support.montant || 0} €`} />
        <Meta label={t('partner.date')} value={formatDate(support.dateCreation, language, t)} />
      </View>
      {support.message ? <Text style={styles.message} numberOfLines={2}>{support.message}</Text> : null}
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

function formatDate(value, language, t) {
  if (!value) return t('common.notAvailable');
  return new Date(value).toLocaleDateString(language || 'fr-BE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function statusColor(status) {
  if (status === 'PAYE' || status === 'VALIDE') return COLORS.success;
  if (status === 'REMBOURSE' || status === 'REFUSE') return COLORS.danger;
  return COLORS.impactOrange;
}

function getApiError(err, t, fallback) {
  if (err.response?.status === 401) return t('errors.session_expired');
  if (err.response?.status === 403) return t('errors.forbidden');
  return err.response?.data?.message || fallback;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.page },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: COLORS.page },
  loadingText: { marginTop: 12, color: COLORS.muted, fontSize: 14 },
  header: { backgroundColor: '#fff', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  list: { padding: 14, paddingBottom: 28 },
  card: { marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  iconBox: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cardText: { flex: 1 },
  title: { color: COLORS.bxBlue, fontSize: 15, fontWeight: '900', lineHeight: 20 },
  subtitle: { color: COLORS.muted, fontSize: 12, marginTop: 2 },
  metaBox: { marginTop: 12, backgroundColor: '#f8fafc', borderRadius: 12, padding: 10 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  metaLabel: { color: COLORS.muted, fontSize: 11 },
  metaValue: { color: COLORS.bxBlue, fontSize: 11, fontWeight: '900', maxWidth: '58%', textAlign: 'right' },
  message: { color: '#475569', fontSize: 12, lineHeight: 18, marginTop: 10, backgroundColor: '#f8fafc', borderRadius: 10, padding: 9 },
});
