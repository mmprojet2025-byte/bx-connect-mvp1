import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import AppIcon from '../components/AppIcon';
import { Badge, Card, COLORS, EmptyState, SectionHeader } from '../components/MobileUI';

const ROLE_FILTERS = ['', 'SUPER_ADMIN', 'ADMIN', 'REFERENT', 'MEMBRE', 'PARTENAIRE'];

export default function SuperAdminLogsScreen() {
  const { t, i18n } = useTranslation();
  const [logs, setLogs] = useState([]);
  const [filters, setFilters] = useState({ action: '', cibleType: '', acteurRole: '' });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    loadLogs();
  }, [filters.action, filters.cibleType, filters.acteurRole]);

  const loadLogs = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const hasFilters = filters.action || filters.cibleType || filters.acteurRole;
      const response = hasFilters
        ? await api.get('/super-admin/logs/search', {
          params: {
            action: filters.action || undefined,
            cibleType: filters.cibleType || undefined,
            acteurRole: filters.acteurRole || undefined,
            limit: 100,
          },
        })
        : await api.get('/super-admin/logs');
      setLogs(response.data || []);
    } catch (err) {
      setLogs([]);
      setError(getApiError(err, t, t('superAdmin.logsLoadError')));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const actionOptions = useMemo(() => uniqueOptions(logs.map((log) => log.action)), [logs]);
  const cibleOptions = useMemo(() => uniqueOptions(logs.map((log) => log.cibleType)), [logs]);

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
          title={t('superAdmin.logsTitle')}
          subtitle={t('superAdmin.logsSubtitle',{
            count: logs.length})}
          icon="lock"
        />
        <FilterBlock
          filters={filters}
          setFilters={setFilters}
          actionOptions={actionOptions}
          cibleOptions={cibleOptions}
          t={t}
        />
      </View>

      {error ? (
        <EmptyState
          icon="warning"
          title={t('common.error')}
          text={error}
          actionLabel={t('common.retry')}
          onAction={() => loadLogs()}
        />
      ) : logs.length === 0 ? (
        <EmptyState
          icon="lock"
          title={t('superAdmin.noLogs')}
          text={t('superAdmin.noLogsText')}
          actionLabel={t('common.retry')}
          onAction={() => loadLogs()}
        />
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <LogCard
              log={item}
              expanded={expandedId === item.id}
              onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
              language={i18n.language}
              t={t}
            />
          )}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadLogs(true)} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

function FilterBlock({ filters, setFilters, actionOptions, cibleOptions, t }) {
  return (
    <View style={styles.filters}>
      <FilterRow
        label={t('superAdmin.filterAction')}
        options={['', ...actionOptions]}
        value={filters.action}
        onChange={(action) => setFilters((current) => ({ ...current, action }))}
        formatter={(value) => value ? humanAction(value) : t('common.all')}
      />
      <FilterRow
        label={t('superAdmin.filterTarget')}
        options={['', ...cibleOptions]}
        value={filters.cibleType}
        onChange={(cibleType) => setFilters((current) => ({ ...current, cibleType }))}
        formatter={(value) => value || t('common.all')}
      />
      <FilterRow
        label={t('superAdmin.filterRole')}
        options={ROLE_FILTERS}
        value={filters.acteurRole}
        onChange={(acteurRole) => setFilters((current) => ({ ...current, acteurRole }))}
        formatter={(value) => value || t('common.all')}
      />
    </View>
  );
}

function FilterRow({ label, options, value, onChange, formatter }) {
  return (
    <View style={styles.filterRow}>
      <Text style={styles.filterLabel}>{label}</Text>
      <View style={styles.filterOptions}>
        {options.slice(0, 8).map((option) => {
          const selected = value === option;
          return (
            <TouchableOpacity
              key={option || 'all'}
              style={[styles.filterChip, selected && styles.filterChipActive]}
              onPress={() => onChange(option)}
            >
              <Text style={[styles.filterChipText, selected && styles.filterChipTextActive]} numberOfLines={1}>
                {formatter(option)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function LogCard({ log, expanded, onToggle, language, t }) {
  const target = log.cibleNom || log.cibleEmail || log.cibleType || t('common.notAvailable');

  return (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.iconBox}>
          <AppIcon name="lock" size={19} color={COLORS.impactOrange} />
        </View>
        <View style={styles.cardText}>
          <Text style={styles.title} numberOfLines={2}>{humanAction(log.action)}</Text>
          <Text style={styles.subtitle} numberOfLines={1}>{formatDate(log.dateAction, language, t)}</Text>
        </View>
        <Badge label={log.acteurRole || 'SYSTEM'} color={roleColor(log.acteurRole)} soft />
      </View>

      <View style={styles.metaBox}>
        <Meta label={t('superAdmin.actor')} value={log.acteurEmail || t('common.notAvailable')} />
        <Meta label={t('superAdmin.target')} value={target} />
        <Meta label={t('superAdmin.targetType')} value={log.cibleType || t('common.notAvailable')} />
        <Meta label={t('superAdmin.oldStatus')} value={log.ancienStatut || '—'} />
        <Meta label={t('superAdmin.newStatus')} value={log.nouveauStatut || '—'} />
      </View>

      {log.metadataJson || log.details ? (
        <>
          <TouchableOpacity style={styles.detailsButton} onPress={onToggle}>
            <Text style={styles.detailsButtonText}>
              {expanded
                ? t('superAdmin.hideDetails')
                : t('superAdmin.showDetails')}
            </Text>
            <AppIcon name={expanded ? 'chevron-up-outline' : 'chevron-down-outline'} size={17} color={COLORS.bxBlueLight} />
          </TouchableOpacity>
          {expanded ? (
            <View style={styles.detailsBox}>
              {log.details ? <Text style={styles.detailsText}>{log.details}</Text> : null}
              {log.metadataJson ? <Text style={styles.detailsText}>{formatMetadata(log.metadataJson)}</Text> : null}
            </View>
          ) : null}
        </>
      ) : null}
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

function uniqueOptions(values) {
  return Array.from(new Set(values.filter(Boolean))).sort().slice(0, 7);
}

function humanAction(action) {
  return String(action || '')
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}

function formatMetadata(metadataJson) {
  try {
    const parsed = JSON.parse(metadataJson);
    return Object.entries(parsed)
      .map(([key, value]) => `${key}: ${String(value)}`)
      .join('\n');
  } catch {
    return metadataJson;
  }
}

function formatDate(value, language, t) {
  if (!value) return t('common.notAvailable');
  return new Date(value).toLocaleString(language || 'fr-BE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function roleColor(role) {
  if (role === 'SUPER_ADMIN') return COLORS.danger;
  if (role === 'ADMIN') return COLORS.bxBlueLight;
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
  filters: { marginTop: 12, gap: 10 },
  filterRow: { gap: 7 },
  filterLabel: { color: COLORS.text, fontSize: 12, fontWeight: '900' },
  filterOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  filterChip: { borderRadius: 999, borderWidth: 1, borderColor: COLORS.border, backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 7, maxWidth: 170 },
  filterChipActive: { borderColor: COLORS.bxBlueLight, backgroundColor: '#eff6ff' },
  filterChipText: { color: COLORS.muted, fontSize: 11, fontWeight: '800' },
  filterChipTextActive: { color: COLORS.bxBlueLight },
  list: { padding: 14, paddingBottom: 28 },
  card: { marginBottom: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBox: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#fff7ed', alignItems: 'center', justifyContent: 'center' },
  cardText: { flex: 1 },
  title: { color: COLORS.bxBlue, fontSize: 15, fontWeight: '900', lineHeight: 20 },
  subtitle: { color: COLORS.muted, fontSize: 12, marginTop: 2 },
  metaBox: { marginTop: 12, backgroundColor: '#f8fafc', borderRadius: 12, padding: 10 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  metaLabel: { color: COLORS.muted, fontSize: 11 },
  metaValue: { color: COLORS.bxBlue, fontSize: 11, fontWeight: '900', maxWidth: '58%', textAlign: 'right' },
  detailsButton: { marginTop: 10, minHeight: 40, borderRadius: 12, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  detailsButtonText: { color: COLORS.bxBlueLight, fontSize: 13, fontWeight: '900' },
  detailsBox: { marginTop: 8, borderRadius: 12, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#eef2f7', padding: 10 },
  detailsText: { color: '#334155', fontSize: 12, lineHeight: 18 },
});
