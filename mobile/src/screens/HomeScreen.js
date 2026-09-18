import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import AppIcon from '../components/AppIcon';
import { COLORS } from '../components/MobileUI';
import { getReadOnlyCache, saveReadOnlyCache } from '../services/readOnlyCache';

const ACTIVITIES_CACHE_KEY = 'activities:public';
const GROUPS_CACHE_KEY = 'groups:public';
const loadingState = () => ({ items: [], loading: true, error: '' });

export default function HomeScreen({ navigation }) {
  const { t, i18n } = useTranslation();
  const [activities, setActivities] = useState(loadingState);
  const [groups, setGroups] = useState(loadingState);

  const loadActivities = useCallback(async () => {
    setActivities((current) => ({ ...current, loading: true, error: '' }));
    try {
      const response = await api.get('/activites', { skipAuth: true });
      const data = response.data || [];
      await saveReadOnlyCache(ACTIVITIES_CACHE_KEY, data);
      setActivities({ items: upcoming(data), loading: false, error: '' });
    } catch {
      const cached = await getReadOnlyCache(ACTIVITIES_CACHE_KEY);
      setActivities(cached?.length
        ? { items: upcoming(cached), loading: false, error: '' }
        : { items: [], loading: false, error: t('home.activities.error') });
    }
  }, [t]);

  const loadGroups = useCallback(async () => {
    setGroups((current) => ({ ...current, loading: true, error: '' }));
    try {
      const response = await api.get('/groupes');
      const data = response.data || [];
      await saveReadOnlyCache(GROUPS_CACHE_KEY, data);
      setGroups({ items: data.slice(0, 3), loading: false, error: '' });
    } catch {
      const cached = await getReadOnlyCache(GROUPS_CACHE_KEY);
      setGroups(cached?.length
        ? { items: cached.slice(0, 3), loading: false, error: '' }
        : { items: [], loading: false, error: t('home.groups.error') });
    }
  }, [t]);

  useEffect(() => {
    void Promise.resolve().then(() => Promise.all([loadActivities(), loadGroups()]));
  }, [loadActivities, loadGroups]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.discoveryHeader}>
        <Image
          source={require('../../assets/images/logo-bx-connect.png')}
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel="BX-Connect"
        />
        <View style={styles.discoveryBadge}>
          <Text style={styles.discoveryBadgeText}>{t('home.discoveryLabel')}</Text>
        </View>
      </View>

      <View style={styles.intro}>
        <Text style={styles.title}>{t('home.title')}</Text>
        <Text style={styles.subtitle}>{t('home.subtitle')}</Text>
        <View style={styles.authActions}>
          <AuthButton label={t('auth.login_btn')} onPress={() => navigation.navigate('Login')} primary />
          <AuthButton label={t('auth.create_free_account')} onPress={() => navigation.navigate('Register')} />
        </View>
      </View>

      <HomeSection
        title={t('home.activities.title')}
        icon="activity"
        color={COLORS.impactOrange}
        iconBackground={COLORS.softOrange}
        actionLabel={t('home.activities.seeAll')}
        onAction={() => navigation.navigate('Activities')}
      >
        <SectionState state={activities} empty={t('home.activities.empty')} onRetry={loadActivities} t={t}>
          {activities.items.map((activity) => (
            <PreviewCard
              key={activity.id}
              title={activity.titre}
              meta={formatDate(activity.dateDebut, i18n.language, t)}
              detail={[activity.commune, activity.theme].filter(Boolean).join(' · ') || t('home.toConfirm')}
              color={COLORS.impactOrange}
              badge={t('activities.free')}
              label={t('home.activities.open', { title: activity.titre })}
              onPress={() => navigation.navigate('Activities')}
            />
          ))}
        </SectionState>
      </HomeSection>

      <HomeSection
        title={t('home.groups.title')}
        icon="group"
        color={COLORS.success}
        iconBackground={COLORS.softGreen}
        actionLabel={t('home.groups.seeAll')}
        onAction={() => navigation.navigate('Groupes')}
      >
        <SectionState state={groups} empty={t('home.groups.empty')} onRetry={loadGroups} t={t}>
          {groups.items.map((group) => (
            <PreviewCard
              key={group.id}
              title={group.nom}
              meta={group.commune || group.theme || t('home.toConfirm')}
              detail={t('groups.members_count', { count: group.nombreMembres ?? 0 })}
              color={COLORS.success}
              label={t('home.groups.open', { name: group.nom })}
              onPress={() => navigation.navigate('Groupes')}
            />
          ))}
        </SectionState>
      </HomeSection>

      <View style={styles.invitationCard}>
        <View style={styles.invitationIcon}>
          <AppIcon name="people-outline" size={24} color={COLORS.impactOrange} />
        </View>
        <Text style={styles.invitationTitle}>{t('home.joinTitle')}</Text>
        <Text style={styles.invitationText}>{t('home.joinText')}</Text>
        <TouchableOpacity
          style={styles.invitationButton}
          onPress={() => navigation.navigate('Register')}
          accessibilityRole="button"
          accessibilityLabel={t('auth.create_free_account')}
        >
          <AppIcon name="person-add-outline" size={20} color="#FFFFFF" />
          <Text style={styles.invitationButtonText}>{t('auth.create_free_account')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function AuthButton({ label, onPress, primary = false }) {
  return (
    <TouchableOpacity
      style={[styles.authButton, primary ? styles.authButtonPrimary : styles.authButtonSecondary]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={primary ? styles.authButtonPrimaryText : styles.authButtonSecondaryText}>{label}</Text>
    </TouchableOpacity>
  );
}

function HomeSection({ title, icon, color, iconBackground, actionLabel, onAction, children }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <View style={[styles.sectionIcon, { backgroundColor: iconBackground }]}>
            <AppIcon name={icon} size={19} color={color} />
          </View>
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        <TouchableOpacity
          style={styles.seeAllButton}
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <Text style={styles.seeAllText}>{actionLabel}</Text>
          <AppIcon name="chevron-forward" size={15} color={COLORS.bxBlueLight} />
        </TouchableOpacity>
      </View>
      {children}
    </View>
  );
}

function SectionState({ state, empty, onRetry, t, children }) {
  if (state.loading) {
    return (
      <View style={styles.feedback} accessibilityRole="progressbar" accessibilityLabel={t('common.loading')}>
        <ActivityIndicator size="small" color={COLORS.bxBlueLight} />
        <Text style={styles.feedbackText}>{t('common.loading')}</Text>
      </View>
    );
  }
  if (state.error) {
    return (
      <View style={styles.feedback} accessibilityLiveRegion="polite">
        <AppIcon name="alert" size={22} color={COLORS.danger} />
        <Text style={styles.feedbackText}>{state.error}</Text>
        <RetryButton label={t('common.retry')} onPress={onRetry} />
      </View>
    );
  }
  if (state.items.length === 0) {
    return (
      <View style={styles.feedback}>
        <Text style={styles.feedbackText}>{empty}</Text>
        <RetryButton label={t('common.retry')} onPress={onRetry} />
      </View>
    );
  }
  return <View style={styles.previewList}>{children}</View>;
}

function RetryButton({ label, onPress }) {
  return (
    <TouchableOpacity style={styles.retryButton} onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      <Text style={styles.retryText}>{label}</Text>
    </TouchableOpacity>
  );
}

function PreviewCard({ title, meta, detail, color, badge, label, onPress }) {
  return (
    <TouchableOpacity style={styles.previewCard} onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      <View style={[styles.previewAccent, { backgroundColor: color }]} />
      <View style={styles.previewBody}>
        {badge ? (
          <View style={styles.previewTopLine}>
            <View style={[styles.previewBadge, { backgroundColor: `${color}18` }]}>
              <Text style={[styles.previewBadgeText, { color }]}>{badge}</Text>
            </View>
            <Text style={styles.previewMeta} numberOfLines={1}>{meta}</Text>
          </View>
        ) : null}
        <Text style={styles.previewTitle} numberOfLines={2}>{title}</Text>
        {!badge ? <Text style={styles.previewMeta} numberOfLines={1}>{meta}</Text> : null}
        <Text style={styles.previewDetail} numberOfLines={1}>{detail}</Text>
      </View>
      <AppIcon name="chevron-forward" size={18} color={COLORS.muted} />
    </TouchableOpacity>
  );
}

function upcoming(items) {
  const now = Date.now();
  return [...items]
    .filter((item) => item.statut === 'PUBLIEE')
    .filter((item) => !item.dateFin || new Date(item.dateFin).getTime() >= now)
    .sort((a, b) => dateValue(a.dateDebut) - dateValue(b.dateDebut))
    .slice(0, 3);
}

function dateValue(value) {
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
}

function formatDate(value, language, t) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return t('activities.date_to_confirm');
  return date.toLocaleDateString(language || 'fr-BE', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.page },
  content: { width: '100%', maxWidth: 420, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 },
  discoveryHeader: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
  logo: { width: 150, height: 34 },
  discoveryBadge: { borderRadius: 999, backgroundColor: COLORS.softBlue, paddingHorizontal: 10, paddingVertical: 6 },
  discoveryBadgeText: { color: COLORS.bxBlueLight, fontSize: 12, lineHeight: 16, fontWeight: '700' },
  intro: { marginBottom: 24, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, shadowColor: '#111827', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.035, shadowRadius: 5, elevation: 1 },
  title: { color: COLORS.text, fontSize: 21, lineHeight: 27, fontWeight: '700' },
  subtitle: { color: COLORS.muted, fontSize: 14, lineHeight: 20, marginTop: 6, maxWidth: 520 },
  authActions: { gap: 8, marginTop: 16 },
  authButton: { minHeight: 48, width: '100%', alignItems: 'center', justifyContent: 'center', borderRadius: 12, paddingHorizontal: 18 },
  authButtonPrimary: { backgroundColor: COLORS.bxBlueLight },
  authButtonSecondary: { backgroundColor: COLORS.surface, borderWidth: 2, borderColor: COLORS.bxBlueLight },
  authButtonPrimaryText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  authButtonSecondaryText: { color: COLORS.bxBlue, fontSize: 14, fontWeight: '800' },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 },
  sectionTitleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 9 },
  sectionIcon: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { flex: 1, color: COLORS.text, fontSize: 17, lineHeight: 22, fontWeight: '700' },
  seeAllButton: { flexDirection: 'row', alignItems: 'center', minHeight: 44, paddingLeft: 6 },
  seeAllText: { color: COLORS.bxBlueLight, fontSize: 12, fontWeight: '800' },
  previewList: { gap: 9 },
  previewCard: { minHeight: 88, flexDirection: 'row', alignItems: 'center', overflow: 'hidden', backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, paddingRight: 14, shadowColor: '#111827', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.025, shadowRadius: 4, elevation: 1 },
  previewAccent: { alignSelf: 'stretch', width: 6, marginRight: 12 },
  previewBody: { flex: 1, paddingVertical: 12, paddingRight: 10 },
  previewTopLine: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  previewBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  previewBadgeText: { fontSize: 11, lineHeight: 15, fontWeight: '700' },
  previewTitle: { color: COLORS.text, fontSize: 15, lineHeight: 20, fontWeight: '800' },
  previewMeta: { color: COLORS.bxBlue, fontSize: 13, lineHeight: 18, fontWeight: '700', marginTop: 3 },
  previewDetail: { color: COLORS.muted, fontSize: 12, lineHeight: 17, marginTop: 2 },
  feedback: { minHeight: 112, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 18, backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border },
  feedbackText: { color: COLORS.muted, fontSize: 13, lineHeight: 18, textAlign: 'center' },
  retryButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 14 },
  retryText: { color: COLORS.bxBlueLight, fontSize: 13, fontWeight: '800' },
  invitationCard: { alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, padding: 16, shadowColor: '#111827', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.035, shadowRadius: 5, elevation: 1 },
  invitationIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.softOrange, marginBottom: 12 },
  invitationTitle: { color: COLORS.text, fontSize: 17, lineHeight: 22, fontWeight: '700', textAlign: 'center' },
  invitationText: { color: COLORS.muted, fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 4 },
  invitationButton: { width: '100%', minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, backgroundColor: COLORS.impactOrange, marginTop: 16, paddingHorizontal: 16 },
  invitationButtonText: { flexShrink: 1, color: '#FFFFFF', fontSize: 14, lineHeight: 20, fontWeight: '700', textAlign: 'center' },
});
