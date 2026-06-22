import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import AppIcon from '../components/AppIcon';
import { Badge, Card, COLORS, EmptyState, SectionHeader } from '../components/MobileUI';

export default function AdminReferentsScreen() {
  const { t, i18n } = useTranslation();
  const [referents, setReferents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const loadReferents = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const res = await api.get('/admin/referents');
      setReferents(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(getApiError(err, t, t('adminMobile.referentsLoadError', {
        defaultValue: 'Impossible de charger les référents.',
      })));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    loadReferents();
  }, [loadReferents]);

  const filteredReferents = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return referents;
    return referents.filter((referent) => {
      const text = `${referent.prenom || ''} ${referent.nom || ''} ${referent.email || ''}`;
      return text.toLowerCase().includes(query);
    });
  }, [referents, search]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.bxBlue} />
        <Text style={styles.loadingText}>{t('common.loading', { defaultValue: 'Chargement...' })}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <SectionHeader
          title={t('adminMobile.referentsTitle', { defaultValue: 'Référents' })}
          subtitle={t('adminMobile.referentsSubtitle', {
            count: referents.length,
            defaultValue: `${referents.length} référent(s)`,
          })}
          icon="profile"
        />
        <View style={styles.searchBox}>
          <AppIcon name="search" size={18} color={COLORS.muted} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder={t('common.search', { defaultValue: 'Rechercher' })}
            placeholderTextColor="#94a3b8"
          />
        </View>
      </View>

      {error ? (
        <EmptyState
          icon="warning"
          title={t('common.error', { defaultValue: 'Erreur' })}
          text={error}
          actionLabel={t('common.retry', { defaultValue: 'Réessayer' })}
          onAction={() => loadReferents()}
        />
      ) : filteredReferents.length === 0 ? (
        <EmptyState
          icon="profile"
          title={t('adminMobile.noReferents', { defaultValue: 'Aucun référent' })}
          text={t('adminMobile.noReferentsText', { defaultValue: 'Les référents apparaîtront ici.' })}
        />
      ) : (
        <FlatList
          data={filteredReferents}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <ReferentCard referent={item} language={i18n.language} t={t} />}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadReferents(true)} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

function ReferentCard({ referent, language, t }) {
  const active = referent.actif !== false;
  const fullName = `${referent.prenom || ''} ${referent.nom || ''}`.trim()
    || t('adminMobile.unknownUser', { defaultValue: 'Utilisateur' });

  return (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(referent)}</Text>
        </View>
        <View style={styles.cardText}>
          <Text style={styles.name} numberOfLines={1}>{fullName}</Text>
          <Text style={styles.email} numberOfLines={1}>{referent.email || t('common.notAvailable', { defaultValue: 'Non renseigné' })}</Text>
        </View>
        <Badge
          label={active ? t('common.active', { defaultValue: 'Actif' }) : t('common.inactive', { defaultValue: 'Inactif' })}
          color={active ? COLORS.success : COLORS.danger}
          soft
        />
      </View>
      <View style={styles.metaBox}>
        <Meta label={t('users.status', { defaultValue: 'Statut' })} value={active ? t('common.active', { defaultValue: 'Actif' }) : t('common.inactive', { defaultValue: 'Inactif' })} />
        <Meta label={t('users.registration', { defaultValue: 'Inscription' })} value={formatDate(referent.dateInscription, language, t)} />
      </View>
      <Text style={styles.readOnlyHint}>
        {t('adminMobile.referentsReadOnlyHint', {
          defaultValue: 'Création et modifications avancées disponibles sur le web.',
        })}
      </Text>
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

function initials(user) {
  return `${user.prenom?.[0] || ''}${user.nom?.[0] || ''}`.toUpperCase() || '?';
}

function formatDate(value, language, t) {
  if (!value) return t('common.notAvailable', { defaultValue: 'Non renseigné' });
  return new Date(value).toLocaleDateString(language || 'fr-BE');
}

function getApiError(err, t, fallback) {
  if (err.response?.status === 401) return t('errors.session_expired', { defaultValue: 'Session expirée.' });
  if (err.response?.status === 403) return t('errors.forbidden', { defaultValue: 'Accès refusé.' });
  return fallback;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.page },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: COLORS.page },
  loadingText: { marginTop: 12, color: COLORS.muted, fontSize: 14 },
  header: { backgroundColor: '#fff', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f1f5f9', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 },
  searchInput: { flex: 1, color: COLORS.text, fontSize: 14 },
  list: { padding: 14, paddingBottom: 28 },
  card: { marginBottom: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: 14, backgroundColor: '#0f766e', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  cardText: { flex: 1, minWidth: 0 },
  name: { color: COLORS.bxBlue, fontSize: 15, lineHeight: 20, fontWeight: '900' },
  email: { color: COLORS.muted, fontSize: 12, lineHeight: 16, marginTop: 2 },
  metaBox: { marginTop: 12, backgroundColor: '#f8fafc', borderRadius: 12, padding: 10 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  metaLabel: { color: COLORS.muted, fontSize: 11 },
  metaValue: { color: COLORS.bxBlue, fontSize: 11, fontWeight: '900', maxWidth: '58%', textAlign: 'right' },
  readOnlyHint: { marginTop: 10, color: COLORS.muted, fontSize: 12, lineHeight: 17 },
});
