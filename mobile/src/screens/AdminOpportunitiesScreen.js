import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import AppIcon from '../components/AppIcon';
import { Badge, Card, COLORS, EmptyState, SectionHeader } from '../components/MobileUI';

export default function AdminOpportunitiesScreen() {
  const { t, i18n } = useTranslation();
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadOpportunities();
  }, []);

  const loadOpportunities = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const res = await api.get('/annonces/admin/opportunites');
      setOpportunities(res.data || []);
    } catch (err) {
      setError(getApiError(err, t, t('adminMobile.opportunitiesLoadError', {
        defaultValue: 'Impossible de charger les opportunités.',
      })));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const confirmAction = (opportunity, action) => {
    const accepted = action === 'publier';
    Alert.alert(
      accepted
        ? t('adminMobile.publishOpportunity', { defaultValue: 'Publier l’opportunité' })
        : t('adminMobile.refuseOpportunity', { defaultValue: 'Refuser l’opportunité' }),
      accepted
        ? t('adminMobile.confirmPublishOpportunity', { defaultValue: 'Cette opportunité deviendra visible publiquement.' })
        : t('adminMobile.confirmRefuseOpportunity', { defaultValue: 'Cette opportunité sera refusée et ne sera pas publiée.' }),
      [
        { text: t('common.cancel', { defaultValue: 'Annuler' }), style: 'cancel' },
        {
          text: accepted
            ? t('adminMobile.publish', { defaultValue: 'Publier' })
            : t('adminMobile.refuse', { defaultValue: 'Refuser' }),
          style: accepted ? 'default' : 'destructive',
          onPress: () => processOpportunity(opportunity, action),
        },
      ],
    );
  };

  const processOpportunity = async (opportunity, action) => {
    setProcessingId(opportunity.id);
    setMessage('');
    setError('');
    try {
      await api.patch(`/annonces/admin/${opportunity.id}/${action}`);
      setMessage(action === 'publier'
        ? t('adminMobile.opportunityPublished', { defaultValue: 'Opportunité publiée.' })
        : t('adminMobile.opportunityRefused', { defaultValue: 'Opportunité refusée.' }));
      await loadOpportunities();
    } catch (err) {
      setError(getApiError(err, t, t('adminMobile.opportunityProcessError', {
        defaultValue: 'Impossible de traiter cette opportunité.',
      })));
    } finally {
      setProcessingId(null);
    }
  };

  const pendingCount = opportunities.filter((item) => item.statutModeration === 'EN_ATTENTE').length;

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
          title={t('adminMobile.opportunitiesTitle', { defaultValue: 'Opportunités à modérer' })}
          subtitle={t('adminMobile.opportunitiesSubtitle', {
            count: pendingCount,
            defaultValue: `${pendingCount} en attente`,
          })}
          icon="warning"
        />
      </View>

      {message ? <InfoBox text={message} tone="success" /> : null}
      {error ? <InfoBox text={error} tone="danger" /> : null}

      {opportunities.length === 0 ? (
        <EmptyState
          icon="check"
          title={t('adminMobile.noOpportunities', { defaultValue: 'Aucune opportunité' })}
          text={t('adminMobile.noOpportunitiesText', { defaultValue: 'Les publications partenaires à modérer apparaîtront ici.' })}
          actionLabel={t('common.retry')}
          onAction={() => loadOpportunities()}
        />
      ) : (
        <FlatList
          data={opportunities}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <OpportunityCard
              opportunity={item}
              language={i18n.language}
              processing={processingId === item.id}
              onPublish={() => confirmAction(item, 'publier')}
              onRefuse={() => confirmAction(item, 'refuser')}
              t={t}
            />
          )}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadOpportunities(true)} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

function OpportunityCard({ opportunity, language, processing, onPublish, onRefuse, t }) {
  const pending = opportunity.statutModeration === 'EN_ATTENTE';

  return (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.iconBox}>
          <AppIcon name="alert" size={20} color={COLORS.warning} />
        </View>
        <View style={styles.cardText}>
          <Text style={styles.title}>{opportunity.titre || t('common.notAvailable')}</Text>
          <Text style={styles.subtitle} numberOfLines={2}>
            {opportunity.descriptionCourte || opportunity.contenu || t('common.notAvailable')}
          </Text>
        </View>
        <Badge label={formatStatus(opportunity.statutModeration, t)} color={statusColor(opportunity.statutModeration)} soft />
      </View>

      <View style={styles.metaBox}>
        <Meta label={t('partner.category', { defaultValue: 'Catégorie' })} value={formatCategory(opportunity.categorieOpportunite, t)} />
        <Meta label={t('roles.PARTENAIRE', { defaultValue: 'Partenaire' })} value={authorName(opportunity, t)} />
        <Meta label={t('partner.date', { defaultValue: 'Date' })} value={formatDate(opportunity.dateCreation, language, t)} />
      </View>

      {pending ? (
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.publishButton, processing && styles.disabled]} disabled={processing} onPress={onPublish}>
            <AppIcon name="check" size={16} color="#fff" />
            <Text style={styles.actionText}>{t('adminMobile.publish', { defaultValue: 'Publier' })}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.refuseButton, processing && styles.disabled]} disabled={processing} onPress={onRefuse}>
            <AppIcon name="close" size={16} color="#fff" />
            <Text style={styles.actionText}>{t('adminMobile.refuse', { defaultValue: 'Refuser' })}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={styles.unavailableHint}>
          {t('adminMobile.opportunityActionUnavailable', {
            defaultValue: "Cette action n'est plus disponible car l'opportunité n'est plus en attente.",
          })}
        </Text>
      )}
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

function authorName(opportunity, t) {
  const name = `${opportunity.auteurPrenom || ''} ${opportunity.auteurNom || ''}`.trim();
  return name || opportunity.auteurEmail || t('common.notAvailable');
}

function formatDate(value, language, t) {
  if (!value) return t('common.notAvailable');
  return new Date(value).toLocaleDateString(language || 'fr-BE');
}

function formatCategory(category, t) {
  return t(`partner.opportunityCategories.${category}`, { defaultValue: String(category || '').replaceAll('_', ' ') });
}

function formatStatus(status, t) {
  return t(`partner.opportunityStatuses.${status}`, { defaultValue: String(status || '').replaceAll('_', ' ') });
}

function statusColor(status) {
  if (status === 'PUBLIEE') return COLORS.success;
  if (status === 'REFUSEE') return COLORS.danger;
  return COLORS.warning;
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
  iconBox: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#fffbeb', alignItems: 'center', justifyContent: 'center' },
  cardText: { flex: 1 },
  title: { color: COLORS.bxBlue, fontSize: 15, fontWeight: '900', lineHeight: 20 },
  subtitle: { color: COLORS.muted, fontSize: 12, lineHeight: 17, marginTop: 2 },
  metaBox: { marginTop: 12, backgroundColor: '#f8fafc', borderRadius: 12, padding: 10 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  metaLabel: { color: COLORS.muted, fontSize: 11 },
  metaValue: { color: COLORS.bxBlue, fontSize: 11, fontWeight: '900', maxWidth: '58%', textAlign: 'right' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  unavailableHint: { color: COLORS.muted, fontSize: 12, lineHeight: 17, marginTop: 12, backgroundColor: '#f8fafc', borderRadius: 10, padding: 9 },
  publishButton: { flex: 1, minHeight: 44, backgroundColor: COLORS.success, borderRadius: 14, paddingVertical: 11, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  refuseButton: { flex: 1, minHeight: 44, backgroundColor: COLORS.danger, borderRadius: 14, paddingVertical: 11, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  actionText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  disabled: { opacity: 0.55 },
  infoBox: { marginHorizontal: 14, marginTop: 10, padding: 12, borderRadius: 10, borderLeftWidth: 4 },
  infoText: { fontSize: 13, lineHeight: 18 },
});
