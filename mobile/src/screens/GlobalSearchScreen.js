import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import AppIcon from '../components/AppIcon';
import { Badge, Card, COLORS, EmptyState, ErrorState } from '../components/MobileUI';

const GROUP_ORDER = ['ACTIVITE', 'GROUPE', 'PROJET', 'PARTENAIRE', 'OPPORTUNITE', 'MEMBRE'];

export default function GlobalSearchScreen({ navigation }) {
  const { t, i18n } = useTranslation();
  const auth = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retryNonce, setRetryNonce] = useState(0);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setError('');
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setError('');

    const timeout = setTimeout(async () => {
      try {
        const response = await api.get('/search', {
          params: { q: trimmed, limit: 40 },
        });
        if (!cancelled) {
          setResults(response.data || []);
        }
      } catch (err) {
        if (!cancelled) {
          setResults([]);
          setError(getApiError(err, t));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [query, retryNonce, t]);

  const sections = useMemo(() => groupResults(results), [results]);
  const flatData = useMemo(() => flattenSections(sections), [sections]);
  const trimmedQuery = query.trim();

  const openResult = (result) => {
    const handled = navigateToResult(result, navigation, auth);
    if (!handled) {
      Alert.alert(
        t('search.mobileUnavailableTitle'),
        t('search.mobileUnavailableText'),
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchPanel}>
        <View style={styles.searchBox}>
          <AppIcon name="search" size={20} color={COLORS.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            placeholder={t('search.placeholder')}
            placeholderTextColor="#94a3b8"
            style={styles.searchInput}
          />
          {query ? (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => setQuery('')}
              accessibilityRole="button"
              accessibilityLabel={t('common.clear')}
            >
              <AppIcon name="close" size={19} color={COLORS.muted} />
            </TouchableOpacity>
          ) : null}
        </View>
        <Text style={styles.helperText}>
          {t('search.helper')}
        </Text>
      </View>

      {trimmedQuery.length < 2 ? (
        <EmptyState
          icon="search"
          title={t('search.startTitle')}
          text={t('search.startText')}
        />
      ) : loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={COLORS.bxBlueLight} />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      ) : error ? (
        <ErrorState
          title={t('common.loadErrorTitle')}
          text={error}
          retryLabel={t('common.retry')}
          onRetry={() => setRetryNonce((current) => current + 1)}
        />
      ) : flatData.length === 0 ? (
        <EmptyState
          icon="search"
          title={t('search.noResults')}
          text={t('search.noResultsText')}
        />
      ) : (
        <FlatList
          data={flatData}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => item.kind === 'header'
            ? <SectionTitle type={item.type} count={item.count} t={t} />
            : (
              <ResultCard
                result={item.result}
                t={t}
                language={i18n.language}
                onPress={() => openResult(item.result)}
              />
            )
          }
        />
      )}
    </View>
  );
}

function groupResults(results) {
  const grouped = new Map();
  results.forEach((result) => {
    const type = normalizeType(result.type);
    if (!grouped.has(type)) grouped.set(type, []);
    grouped.get(type).push(result);
  });

  return GROUP_ORDER
    .filter((type) => grouped.has(type))
    .map((type) => ({ type, items: grouped.get(type) }));
}

function flattenSections(sections) {
  return sections.flatMap((section) => [
    { kind: 'header', key: `header-${section.type}`, type: section.type, count: section.items.length },
    ...section.items.map((result) => ({
      kind: 'result',
      key: `${normalizeType(result.type)}-${result.id}-${result.url || ''}`,
      result,
    })),
  ]);
}

function SectionTitle({ type, count, t }) {
  return (
    <View style={styles.sectionTitleRow}>
      <Text style={styles.sectionTitle}>{typeLabel(type, t)}</Text>
      <Text style={styles.sectionCount}>{count}</Text>
    </View>
  );
}

function ResultCard({ result, t, language, onPress }) {
  const type = normalizeType(result.type);
  const color = typeColor(type);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.78} accessibilityRole="button">
      <Card style={styles.resultCard}>
        <View style={[styles.resultIcon, { backgroundColor: `${color}18` }]}>
          <AppIcon name={typeIcon(type)} size={20} color={color} />
        </View>
        <View style={styles.resultText}>
          <Text style={styles.resultTitle} numberOfLines={2}>{result.titre || t('common.notAvailable')}</Text>
          {result.sousTitre ? (
            <Text style={styles.resultSubtitle} numberOfLines={2}>{result.sousTitre}</Text>
          ) : null}
          <Text style={styles.resultDate}>{formatDate(result.date, language, t)}</Text>
        </View>
        <View style={styles.resultRight}>
          {result.badge ? <Badge label={formatBadge(result.badge)} color={color} soft /> : null}
          <AppIcon name="chevron-forward" size={18} color={COLORS.muted} />
        </View>
      </Card>
    </TouchableOpacity>
  );
}

function navigateToResult(result, navigation, auth) {
  const type = normalizeType(result.type);
  const parent = navigation.getParent();

  if (type === 'ACTIVITE') {
    parent?.navigate('TabActivities', { screen: 'Main' });
    return true;
  }

  if (type === 'GROUPE') {
    if (auth.isAdmin || auth.isSuperAdmin) {
      parent?.navigate('TabUsers', { screen: 'GroupesAccess' });
    } else if (auth.isMembre || auth.isReferent) {
      parent?.navigate('TabGroupes', { screen: 'GroupesAccess' });
    } else {
      parent?.navigate('TabDashboard', { screen: 'Main' });
    }
    return true;
  }

  if (type === 'PROJET') {
    if (auth.isAdmin || auth.isSuperAdmin) {
      parent?.navigate('TabUsers', { screen: 'ProjectsAccess' });
    } else if (auth.isPartenaire) {
      parent?.navigate('TabProjects', { screen: 'Main' });
    } else {
      parent?.navigate('TabGroupes', { screen: 'ProjectsAccess' });
    }
    return true;
  }

  if (type === 'MEMBRE') {
    if (auth.isReferent) {
      parent?.navigate('TabDashboard', { screen: 'ReferentMembersAccess' });
      return true;
    }
    if (auth.isAdmin || auth.isSuperAdmin) {
      parent?.navigate('TabUsers', { screen: 'UsersAccess' });
      return true;
    }
    return false;
  }

  if (type === 'OPPORTUNITE') {
    navigation.navigate('AnnoncesAccess');
    return true;
  }

  if (type === 'PARTENAIRE') {
    parent?.navigate('TabDashboard', { screen: 'Main' });
    return true;
  }

  return false;
}

function normalizeType(type) {
  return String(type || '').trim().toUpperCase();
}

function typeLabel(type, t) {
  const labels = {
    ACTIVITE: t('navigation.activities'),
    GROUPE: t('navigation.groups'),
    PROJET: t('navigation.projects'),
    PARTENAIRE: t('roles.PARTENAIRE'),
    OPPORTUNITE: t('search.opportunities'),
    MEMBRE: t('roles.MEMBRE'),
  };
  return labels[type] || type;
}

function typeIcon(type) {
  if (type === 'ACTIVITE') return 'activity';
  if (type === 'GROUPE') return 'group';
  if (type === 'PROJET') return 'project';
  if (type === 'PARTENAIRE') return 'building';
  if (type === 'OPPORTUNITE') return 'alert';
  if (type === 'MEMBRE') return 'profile';
  return 'search';
}

function typeColor(type) {
  if (type === 'ACTIVITE') return COLORS.info;
  if (type === 'GROUPE') return '#0f766e';
  if (type === 'PROJET') return COLORS.impactOrange;
  if (type === 'PARTENAIRE') return '#7c3aed';
  if (type === 'OPPORTUNITE') return COLORS.warning;
  if (type === 'MEMBRE') return COLORS.bxBlueLight;
  return COLORS.muted;
}

function formatBadge(value) {
  return String(value || '').replaceAll('_', ' ');
}

function formatDate(value, language, t) {
  if (!value) return t('common.notAvailable');
  return new Date(value).toLocaleDateString(language || 'fr-BE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function getApiError(err, t) {
  if (err.response?.status === 401) return t('errors.session_expired');
  if (err.response?.status === 403) return t('errors.forbidden');
  return t('search.error');
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.page },
  searchPanel: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    padding: 14,
    gap: 8,
  },
  searchBox: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    paddingHorizontal: 12,
  },
  searchInput: { flex: 1, color: COLORS.text, fontSize: 15, fontWeight: '600' },
  clearButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  helperText: { color: COLORS.muted, fontSize: 12, lineHeight: 17 },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { color: COLORS.muted, fontSize: 14 },
  list: { padding: 14, paddingBottom: 28 },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 8,
  },
  sectionTitle: { color: COLORS.text, fontSize: 13, fontWeight: '900', textTransform: 'uppercase' },
  sectionCount: { color: COLORS.muted, fontSize: 12, fontWeight: '800' },
  resultCard: {
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  resultIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  resultText: { flex: 1, minWidth: 0 },
  resultTitle: { color: COLORS.bxBlue, fontSize: 15, lineHeight: 20, fontWeight: '900' },
  resultSubtitle: { color: '#475569', fontSize: 12, lineHeight: 17, marginTop: 2 },
  resultDate: { color: COLORS.muted, fontSize: 11, marginTop: 4, fontWeight: '700' },
  resultRight: { alignItems: 'flex-end', gap: 8, maxWidth: 108 },
});
