import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { getRecentNotifications } from '../api/notifications';
import AppIcon from '../components/AppIcon';
import { Badge, COLORS, SHADOWS } from '../components/MobileUI';

const HOME_DOMAINS = ['activities', 'projects', 'announcements', 'memberships', 'messageGroup', 'notifications'];

const INITIAL_HOME_STATE = {
  activities: { status: 'loading', data: [] },
  projects: { status: 'loading', data: [] },
  announcements: { status: 'loading', data: [] },
  memberships: { status: 'loading', data: [] },
  messageGroup: { status: 'loading', data: null },
  notifications: { status: 'loading', data: [] },
};

export default function MemberHomeScreen({ navigation }) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [domains, setDomains] = useState(INITIAL_HOME_STATE);
  const [refreshing, setRefreshing] = useState(false);

  const activities = domains.activities.data;
  const projects = domains.projects.data;
  const announcements = domains.announcements.data;
  const memberships = domains.memberships.data;
  const messageGroup = domains.messageGroup.data;
  const notifications = domains.notifications.data;

  const greeting = user?.prenom
    ? t('memberHome.welcomeNamed', { name: user.prenom })
    : t('memberHome.welcome');

  useLayoutEffect(() => {
    navigation.setOptions({ title: t('navigation.home'), headerTitle: t('navigation.home') });
  }, [navigation, t]);

  const loadHome = useCallback(async (showRefresh = false, requestedDomains = HOME_DOMAINS) => {
    if (showRefresh) setRefreshing(true);

    setDomains((current) => {
      const next = { ...current };
      requestedDomains.forEach((domain) => {
        next[domain] = { ...current[domain], status: 'loading' };
      });
      return next;
    });

    const results = await Promise.allSettled(requestedDomains.map(loadHomeDomain));
    setDomains((current) => {
      const next = { ...current };
      requestedDomains.forEach((domain, index) => {
        const result = results[index];
        next[domain] = result.status === 'fulfilled'
          ? { status: 'success', data: result.value }
          : { ...current[domain], status: 'error' };
      });
      return next;
    });
    if (showRefresh) setRefreshing(false);
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => loadHome());
  }, [loadHome]);

  const nextActivity = useMemo(
    () => activities
      .filter(isUpcomingActivity)
      .sort((a, b) => dateValue(a.dateDebut) - dateValue(b.dateDebut))[0] || null,
    [activities],
  );

  const popularProject = useMemo(
    () => [...projects]
      .filter((project) => project.statut !== 'ARCHIVE')
      .sort((a, b) => projectPopularity(b) - projectPopularity(a))[0] || null,
    [projects],
  );

  const currentMembership = memberships.find((membership) => membership.statut === 'ACCEPTE');
  const pendingMembership = memberships.find((membership) => membership.statut === 'EN_ATTENTE');
  const currentGroup = currentMembership
    ? {
        id: currentMembership.groupeId,
        nom: currentMembership.groupeNom,
        description: currentMembership.groupeDescription,
      }
    : messageGroup;

  const groupStatus = getGroupSectionStatus(domains, currentGroup);
  const allMainSectionsFailed = domains.activities.status === 'error'
    && domains.projects.status === 'error'
    && domains.announcements.status === 'error'
    && groupStatus === 'error'
    && domains.notifications.status === 'error';

  const recentNews = useMemo(
    () => [...announcements]
      .sort((a, b) => Number(b.epinglee) - Number(a.epinglee)
        || dateValue(b.dateCreation) - dateValue(a.dateCreation))
      .slice(0, 3),
    [announcements],
  );

  const recentNotifications = useMemo(
    () => [...notifications]
      .sort((a, b) => dateValue(b.dateCreation || b.date) - dateValue(a.dateCreation || a.date))
      .slice(0, 3),
    [notifications],
  );

  const openTab = (tab, screen) => {
    navigation.getParent()?.navigate(tab, screen ? { screen } : undefined);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
      refreshControl={(
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => loadHome(true)}
          colors={[COLORS.interactive]}
          tintColor={COLORS.interactive}
        />
      )}
    >
      <View style={styles.welcomePanel}>
        <View style={styles.welcomeText}>
          <Text style={styles.welcomeTitle}>{greeting}</Text>
          <Text style={styles.welcomeSubtitle}>{t('memberHome.subtitle')}</Text>
        </View>
      </View>

      {allMainSectionsFailed ? (
        <SectionError
          title={t('memberHome.globalErrorTitle')}
          text={t('memberHome.globalErrorText')}
          onRetry={() => loadHome(false)}
          retryLabel={t('common.retry')}
        />
      ) : (
        <>

      <ContentSection
        title={t('memberHome.upcomingTitle')}
        actionLabel={t('memberHome.seeAll')}
        onAction={() => openTab('TabActivities')}
      >
        {domains.activities.status === 'loading' ? (
          <SectionLoading label={t('common.loading')} />
        ) : domains.activities.status === 'error' ? (
          <SectionError
            text={t('memberHome.sectionErrorText')}
            onRetry={() => loadHome(false, ['activities'])}
            retryLabel={t('common.retry')}
          />
        ) : nextActivity ? (
          <ActivityCard
            activity={nextActivity}
            language={i18n.language}
            t={t}
            onPress={() => openTab('TabActivities')}
          />
        ) : (
          <EmptyCard
            icon="activity"
            color={COLORS.impactOrange}
            backgroundColor={COLORS.softOrange}
            title={t('memberHome.noUpcomingActivities')}
            description={t('memberHome.noUpcomingActivitiesText')}
          />
        )}
      </ContentSection>

      <ContentSection
        title={t('memberHome.myGroupTitle')}
      >
        {groupStatus === 'loading' ? (
          <SectionLoading label={t('common.loading')} />
        ) : groupStatus === 'error' ? (
          <SectionError
            text={t('memberHome.sectionErrorText')}
            onRetry={() => loadHome(false, ['memberships', 'messageGroup'])}
            retryLabel={t('common.retry')}
          />
        ) : (
          <GroupCard
            group={currentGroup}
            pendingMembership={pendingMembership}
            t={t}
            onPress={() => openTab('TabGroupes', 'GroupesAccess')}
          />
        )}
      </ContentSection>

      <ContentSection
        title={t('memberHome.newsTitle')}
      >
        {domains.announcements.status === 'loading' ? (
          <SectionLoading label={t('common.loading')} />
        ) : domains.announcements.status === 'error' ? (
          <SectionError
            text={t('memberHome.sectionErrorText')}
            onRetry={() => loadHome(false, ['announcements'])}
            retryLabel={t('common.retry')}
          />
        ) : recentNews.length > 0 ? (
          <View style={styles.listCard}>
            {recentNews.map((item, index) => (
              <NewsRow
                key={item.id}
                item={item}
                language={i18n.language}
                t={t}
                last={index === recentNews.length - 1}
              />
            ))}
          </View>
        ) : (
          <EmptyCard
            icon="alert"
            color="#7C3AED"
            backgroundColor={COLORS.softPurple}
            title={t('memberHome.noNews')}
            description={t('memberHome.noNewsText')}
          />
        )}
      </ContentSection>

      <ContentSection
        title={t('memberHome.popularProjectsTitle')}
        actionLabel={t('memberHome.discover')}
        onAction={() => openTab('TabGroupes', 'ProjectsAccess')}
      >
        {domains.projects.status === 'loading' ? (
          <SectionLoading label={t('common.loading')} />
        ) : domains.projects.status === 'error' ? (
          <SectionError
            text={t('memberHome.sectionErrorText')}
            onRetry={() => loadHome(false, ['projects'])}
            retryLabel={t('common.retry')}
          />
        ) : popularProject ? (
          <ProjectCard
            project={popularProject}
            t={t}
            onPress={() => openTab('TabGroupes', 'ProjectsAccess')}
          />
        ) : (
          <EmptyCard
            icon="project"
            color={COLORS.impactOrange}
            backgroundColor={COLORS.softOrange}
            title={t('memberHome.noProjects')}
            description={t('memberHome.noProjectsText')}
          />
        )}
      </ContentSection>

      <ContentSection
        title={t('memberHome.notificationsTitle')}
        actionLabel={t('memberHome.seeAll')}
        onAction={() => navigation.navigate('NotificationsAccess')}
      >
        {domains.notifications.status === 'loading' ? (
          <SectionLoading label={t('common.loading')} />
        ) : domains.notifications.status === 'error' ? (
          <SectionError
            text={t('memberHome.sectionErrorText')}
            onRetry={() => loadHome(false, ['notifications'])}
            retryLabel={t('common.retry')}
          />
        ) : recentNotifications.length > 0 ? (
          <View style={styles.listCard}>
            {recentNotifications.map((notification, index) => (
              <NotificationRow
                key={notification.id}
                notification={notification}
                language={i18n.language}
                t={t}
                last={index === recentNotifications.length - 1}
                onPress={() => navigation.navigate('NotificationsAccess')}
              />
            ))}
          </View>
        ) : (
          <EmptyCard
            icon="bell"
            color={COLORS.interactive}
            backgroundColor={COLORS.softBlue}
            title={t('memberHome.noNotifications')}
          />
        )}
      </ContentSection>
        </>
      )}
    </ScrollView>
  );
}

function ContentSection({ title, actionLabel, onAction, children }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {actionLabel && onAction ? (
          <TouchableOpacity
            style={styles.sectionActionButton}
            onPress={onAction}
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
          >
            <Text style={styles.sectionAction}>{actionLabel}</Text>
            <AppIcon name="chevron-forward" size={15} color={COLORS.interactive} />
          </TouchableOpacity>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function ActivityCard({ activity, language, t, onPress }) {
  const registered = activity.nombreInscrits ?? activity.inscrits ?? activity.nombreParticipants ?? 0;
  return (
    <TouchableOpacity
      style={styles.featureCard}
      onPress={onPress}
      activeOpacity={0.84}
      accessibilityRole="button"
      accessibilityLabel={activity.titre}
    >
      <View style={styles.activityDate}>
        <Text style={styles.dateDay}>{formatDay(activity.dateDebut, language)}</Text>
        <Text style={styles.dateMonth}>{formatMonth(activity.dateDebut, language)}</Text>
      </View>
      <View style={styles.featureBody}>
        <Text style={styles.featureTitle} numberOfLines={2}>{activity.titre}</Text>
        <Meta icon="location-outline" text={activity.lieu || t('memberHome.placeToConfirm')} />
        <Meta icon="group" text={t('memberHome.registeredCount', { count: registered })} />
      </View>
      <AppIcon name="chevron-forward" size={18} color={COLORS.muted} />
    </TouchableOpacity>
  );
}

function GroupCard({ group, pendingMembership, t, onPress }) {
  if (!group?.nom) {
    return (
      <TouchableOpacity
        style={styles.emptyCard}
        onPress={onPress}
        activeOpacity={0.84}
        accessibilityRole="button"
      >
        <View style={[styles.emptyIcon, { backgroundColor: COLORS.softGreen }]}>
          <AppIcon name="group" size={23} color={COLORS.success} />
        </View>
        <View style={styles.emptyBody}>
          <Text style={styles.featureTitle}>
            {pendingMembership ? t('memberHome.groupPending') : t('memberHome.joinGroup')}
          </Text>
          <Text style={styles.secondaryText} numberOfLines={2}>
            {pendingMembership
              ? t('memberHome.groupPendingText', { group: pendingMembership.groupeNom })
              : t('memberHome.joinGroupText')}
          </Text>
        </View>
        <AppIcon name="chevron-forward" size={18} color={COLORS.muted} />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={styles.groupCard}
      onPress={onPress}
      activeOpacity={0.84}
      accessibilityRole="button"
      accessibilityLabel={group.nom}
    >
      <View style={styles.roundIcon}>
        <AppIcon name="group" size={22} color={COLORS.success} />
      </View>
      <View style={styles.featureBody}>
        <Text style={styles.featureTitle}>{group.nom}</Text>
        <Text style={styles.secondaryText} numberOfLines={1}>
          {group.description || t('memberHome.groupConnectedText')}
        </Text>
      </View>
      <Badge label={t('memberHome.memberBadge')} color={COLORS.success} soft />
    </TouchableOpacity>
  );
}

function ProjectCard({ project, t, onPress }) {
  const owner = project.groupeNom
    || [project.porteurPrenom, project.porteurNom].filter(Boolean).join(' ')
    || t('memberHome.communityOwner');
  return (
    <TouchableOpacity
      style={styles.projectCard}
      onPress={onPress}
      activeOpacity={0.84}
      accessibilityRole="button"
      accessibilityLabel={project.titre}
    >
      <View style={styles.projectTop}>
        <View style={styles.projectIcon}>
          <AppIcon name="project" size={22} color={COLORS.impactOrange} />
        </View>
        <Badge
          label={t(`statuses.${project.statut}`)}
          color={projectStatusColor(project.statut)}
          soft
        />
      </View>
      <Text style={styles.projectTitle} numberOfLines={2}>{project.titre}</Text>
      <Text style={styles.secondaryText} numberOfLines={1}>
        {t('memberHome.projectOwner', { owner })}
      </Text>
      <View style={styles.projectStats}>
        <Meta icon="group" text={`${project.nombreParticipants ?? 0}`} />
        <Meta icon="message" text={`${project.nombreCommentaires ?? 0}`} />
      </View>
    </TouchableOpacity>
  );
}

function NewsRow({ item, language, t, last }) {
  const isGroup = item.type === 'GROUPE';
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <View style={[styles.rowIcon, isGroup ? styles.purpleIcon : styles.blueIcon]}>
        <AppIcon name={isGroup ? 'group' : 'alert'} size={17} color={isGroup ? '#7C3AED' : COLORS.interactive} />
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle} numberOfLines={1}>{item.titre}</Text>
        <Text style={styles.rowText} numberOfLines={1}>{item.contenu}</Text>
      </View>
      <Text style={styles.rowDate}>{formatDate(item.dateCreation, language)}</Text>
    </View>
  );
}

function NotificationRow({ notification, language, t, last, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.row, !last && styles.rowBorder]}
      onPress={onPress}
      activeOpacity={0.78}
      accessibilityRole="button"
      accessibilityLabel={notification.titre || notification.message || t('notifications.title')}
    >
      <View style={[styles.rowIcon, styles.blueIcon]}>
        <AppIcon name="bell" size={17} color={COLORS.interactive} />
        {!notification.lue ? <View style={styles.unreadDot} /> : null}
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {notification.titre || notification.message || t('notifications.title')}
        </Text>
        {notification.titre && notification.message ? (
          <Text style={styles.rowText} numberOfLines={1}>{notification.message}</Text>
        ) : null}
      </View>
      <Text style={styles.rowDate}>
        {formatDate(notification.dateCreation || notification.date, language)}
      </Text>
    </TouchableOpacity>
  );
}

function EmptyCard({ icon, color, backgroundColor, title, description }) {
  return (
    <View style={styles.emptyCard}>
      <View style={[styles.emptyIcon, { backgroundColor }]}>
        <AppIcon name={icon} size={23} color={color} />
      </View>
      <View style={styles.emptyBody}>
        <Text style={styles.featureTitle}>{title}</Text>
        {description ? <Text style={styles.secondaryText}>{description}</Text> : null}
      </View>
    </View>
  );
}

function Meta({ icon, text }) {
  return (
    <View style={styles.meta}>
      <AppIcon name={icon} size={14} color={COLORS.muted} />
      <Text style={styles.metaText} numberOfLines={1}>{text}</Text>
    </View>
  );
}

function SectionLoading({ label }) {
  return (
    <View style={styles.sectionState} accessibilityRole="progressbar">
      <AppIcon name="refresh" size={19} color={COLORS.interactive} />
      <Text style={styles.sectionStateText}>{label}</Text>
    </View>
  );
}

function SectionError({ title, text, onRetry, retryLabel }) {
  return (
    <View style={styles.sectionError} accessibilityRole="alert">
      <View style={styles.sectionStateBody}>
        {title ? <Text style={styles.sectionErrorTitle}>{title}</Text> : null}
        <Text style={styles.sectionErrorText}>{text}</Text>
      </View>
      <TouchableOpacity
        style={styles.sectionRetry}
        onPress={onRetry}
        accessibilityRole="button"
        accessibilityLabel={retryLabel}
      >
        <AppIcon name="refresh" size={16} color={COLORS.interactive} />
        <Text style={styles.sectionRetryText}>{retryLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

async function loadHomeDomain(domain) {
  switch (domain) {
    case 'activities': {
      const response = await api.get('/activites', { skipAuth: true });
      return Array.isArray(response.data) ? response.data : [];
    }
    case 'projects': {
      const response = await api.get('/projets');
      return Array.isArray(response.data) ? response.data : [];
    }
    case 'announcements': {
      const response = await api.get('/annonces/mes-annonces');
      return Array.isArray(response.data) ? response.data : [];
    }
    case 'memberships': {
      const response = await api.get('/groupes/mes-adhesions');
      return Array.isArray(response.data) ? response.data : [];
    }
    case 'messageGroup': {
      try {
        const response = await api.get('/messagerie/mon-groupe');
        return response.data || null;
      } catch (error) {
        if (error.response?.status === 403 || error.response?.status === 404) return null;
        throw error;
      }
    }
    case 'notifications': {
      const response = await getRecentNotifications(3);
      return Array.isArray(response) ? response : [];
    }
    default:
      throw new Error(`Unknown home domain: ${domain}`);
  }
}

function getGroupSectionStatus(domains, currentGroup) {
  if (domains.memberships.status === 'success') return 'success';
  if (domains.messageGroup.status === 'success' && currentGroup?.nom) return 'success';
  if (domains.memberships.status === 'loading' || domains.messageGroup.status === 'loading') {
    return 'loading';
  }
  return 'error';
}

function dateValue(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
}

function isUpcomingActivity(activity) {
  if (!activity.dateDebut || ['ANNULEE', 'TERMINEE'].includes(activity.statut)) return false;
  return dateValue(activity.dateFin || activity.dateDebut) >= Date.now();
}

function projectPopularity(project) {
  return Number(project.nombreParticipants || 0) * 2 + Number(project.nombreCommentaires || 0);
}

function projectStatusColor(status) {
  if (status === 'APPROUVE' || status === 'TERMINE') return COLORS.success;
  if (status === 'REJETE') return COLORS.danger;
  if (status === 'EN_COURS') return COLORS.info;
  return COLORS.warning;
}

function formatDay(value, language) {
  const time = dateValue(value);
  return time ? new Intl.DateTimeFormat(language, { day: '2-digit' }).format(time) : '--';
}

function formatMonth(value, language) {
  const time = dateValue(value);
  return time
    ? new Intl.DateTimeFormat(language, { month: 'short' }).format(time).replace('.', '').toUpperCase()
    : '';
}

function formatDate(value, language) {
  const time = dateValue(value);
  return time ? new Intl.DateTimeFormat(language, { day: 'numeric', month: 'short' }).format(time) : '';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.page },
  content: { width: '100%', maxWidth: 460, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 },
  welcomePanel: { paddingTop: 2, marginBottom: 24 },
  welcomeText: { flex: 1, minWidth: 0 },
  welcomeTitle: { color: COLORS.text, fontSize: 21, lineHeight: 27, fontWeight: '700' },
  welcomeSubtitle: { color: COLORS.muted, fontSize: 14, lineHeight: 19, marginTop: 2 },
  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: { flex: 1, color: COLORS.text, fontSize: 17, lineHeight: 22, fontWeight: '700' },
  sectionActionButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingLeft: 8 },
  sectionAction: { color: COLORS.interactive, fontSize: 12, lineHeight: 16, fontWeight: '700' },
  sectionState: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  sectionStateText: { color: COLORS.muted, fontSize: 13, lineHeight: 18 },
  sectionError: {
    minHeight: 80,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  sectionStateBody: { flex: 1, minWidth: 0 },
  sectionErrorTitle: { color: '#991B1B', fontSize: 14, lineHeight: 19, fontWeight: '700' },
  sectionErrorText: { color: '#7F1D1D', fontSize: 13, lineHeight: 18 },
  sectionRetry: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: COLORS.softBlue,
  },
  sectionRetryText: { color: COLORS.interactive, fontSize: 12, fontWeight: '700' },
  featureCard: {
    minHeight: 104,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.soft,
  },
  activityDate: {
    width: 54,
    height: 62,
    borderRadius: 12,
    backgroundColor: COLORS.softBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dateDay: { color: COLORS.bxBlue, fontSize: 22, lineHeight: 25, fontWeight: '800' },
  dateMonth: { color: COLORS.interactive, fontSize: 10, lineHeight: 13, fontWeight: '700' },
  featureBody: { flex: 1, minWidth: 0, marginRight: 10 },
  featureTitle: { color: COLORS.text, fontSize: 14, lineHeight: 19, fontWeight: '700' },
  secondaryText: { color: COLORS.muted, fontSize: 13, lineHeight: 18, marginTop: 4 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
  metaText: { color: COLORS.muted, fontSize: 12, lineHeight: 16, flexShrink: 1 },
  groupCard: {
    minHeight: 92,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.soft,
  },
  roundIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.softGreen,
    marginRight: 12,
  },
  listCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.soft,
  },
  row: { minHeight: 68, flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  blueIcon: { backgroundColor: COLORS.softBlue },
  purpleIcon: { backgroundColor: COLORS.softPurple },
  rowBody: { flex: 1, minWidth: 0, marginRight: 8 },
  rowTitle: { color: COLORS.text, fontSize: 14, lineHeight: 19, fontWeight: '700' },
  rowText: { color: COLORS.muted, fontSize: 12, lineHeight: 16, marginTop: 2 },
  rowDate: { color: COLORS.muted, fontSize: 10, lineHeight: 14 },
  unreadDot: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.interactive,
  },
  projectCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.soft,
  },
  projectTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  projectIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.softOrange,
  },
  projectTitle: { color: COLORS.text, fontSize: 16, lineHeight: 22, fontWeight: '700' },
  projectStats: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 16, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border },
  emptyCard: {
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.soft,
  },
  emptyIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  emptyBody: { flex: 1, minWidth: 0, marginRight: 8 },
});
