import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
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

const EMPTY_IMAGES = {
  activity: require('../assets/images/placeholders/activites.png'),
  group: require('../assets/images/placeholders/groupes.png'),
  project: require('../assets/images/placeholders/projets.png'),
  news: require('../assets/images/placeholders/notifications.png'),
};

export default function MemberHomeScreen({ navigation }) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [activities, setActivities] = useState([]);
  const [projects, setProjects] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [messageGroup, setMessageGroup] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadHome = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);

    const results = await Promise.allSettled([
      api.get('/activites', { skipAuth: true }),
      api.get('/projets'),
      api.get('/annonces/mes-annonces'),
      api.get('/groupes/mes-adhesions'),
      api.get('/messagerie/mon-groupe'),
      getRecentNotifications(3),
    ]);

    setActivities(settledList(results[0]));
    setProjects(settledList(results[1]));
    setAnnouncements(settledList(results[2]));
    setMemberships(settledList(results[3]));
    setMessageGroup(results[4].status === 'fulfilled' ? results[4].value.data : null);
    setNotifications(results[5].status === 'fulfilled' && Array.isArray(results[5].value) ? results[5].value : []);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadHome();
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
      refreshControl={(
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => loadHome(true)}
          colors={[COLORS.interactive]}
          tintColor={COLORS.interactive}
        />
      )}
    >
      <View style={styles.greeting}>
        <View>
          <Image
            source={require('../../assets/images/logo-bx-connect.png')}
            style={styles.greetingLogo}
            resizeMode="contain"
          />
          <Text style={styles.greetingTitle}>
            {user?.prenom
              ? t('memberHome.welcomeNamed', { name: user.prenom })
              : t('memberHome.welcome')}
          </Text>
        </View>
        <TouchableOpacity onPress={() => openTab('TabProfile')} activeOpacity={0.8}>
          <Image
            source={require('../../assets/images/avatars/default-avatar.png')}
            style={styles.avatar}
          />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.searchCard}
        onPress={() => navigation.navigate('GlobalSearch')}
        activeOpacity={0.82}
        accessibilityRole="button"
      >
        <View style={styles.searchIcon}>
          <AppIcon name="search" size={20} color={COLORS.interactive} />
        </View>
        <View style={styles.searchText}>
          <Text style={styles.searchTitle}>{t('search.title')}</Text>
          <Text style={styles.searchSubtitle} numberOfLines={1}>
            {t('search.startText')}
          </Text>
        </View>
        <AppIcon name="chevron-forward" size={18} color={COLORS.muted} />
      </TouchableOpacity>

      <ContentSection
        title={t('memberHome.upcomingTitle')}
        actionLabel={t('memberHome.seeAll')}
        onAction={() => openTab('TabActivities')}
      >
        {nextActivity ? (
          <ActivityCard
            activity={nextActivity}
            language={i18n.language}
            t={t}
            onPress={() => openTab('TabActivities')}
          />
        ) : (
          <CompactEmpty
            image={EMPTY_IMAGES.activity}
            title={t('memberHome.noUpcomingActivities')}
          />
        )}
      </ContentSection>

      <ContentSection title={t('memberHome.myGroupTitle')}>
        <GroupCard
          group={currentGroup}
          pendingMembership={pendingMembership}
          t={t}
          onPress={() => openTab('TabGroupes', 'GroupesAccess')}
        />
      </ContentSection>

      <ContentSection title={t('memberHome.newsTitle')}>
        {recentNews.length > 0 ? (
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
          <CompactEmpty image={EMPTY_IMAGES.news} title={t('memberHome.noNews')} />
        )}
      </ContentSection>

      <ContentSection
        title={t('memberHome.popularProjectsTitle')}
        actionLabel={t('memberHome.discover')}
        onAction={() => openTab('TabGroupes', 'ProjectsAccess')}
      >
        {popularProject ? (
          <ProjectCard
            project={popularProject}
            t={t}
            onPress={() => openTab('TabGroupes', 'ProjectsAccess')}
          />
        ) : (
          <CompactEmpty image={EMPTY_IMAGES.project} title={t('memberHome.noProjects')} />
        )}
      </ContentSection>

      <ContentSection
        title={t('memberHome.notificationsTitle')}
        actionLabel={t('memberHome.seeAll')}
        onAction={() => openTab('TabNotifications')}
      >
        {recentNotifications.length > 0 ? (
          <View style={styles.listCard}>
            {recentNotifications.map((notification, index) => (
              <NotificationRow
                key={notification.id}
                notification={notification}
                language={i18n.language}
                t={t}
                last={index === recentNotifications.length - 1}
                onPress={() => openTab('TabNotifications')}
              />
            ))}
          </View>
        ) : (
          <CompactEmpty image={EMPTY_IMAGES.news} title={t('memberHome.noNotifications')} />
        )}
      </ContentSection>
    </ScrollView>
  );
}

function ContentSection({ title, actionLabel, onAction, children }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {actionLabel && onAction ? (
          <TouchableOpacity onPress={onAction} accessibilityRole="button">
            <Text style={styles.sectionAction}>{actionLabel}</Text>
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
    <TouchableOpacity style={styles.featureCard} onPress={onPress} activeOpacity={0.84}>
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
      <TouchableOpacity style={styles.emptyCard} onPress={onPress} activeOpacity={0.84}>
        <Image source={EMPTY_IMAGES.group} style={styles.emptyImage} />
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
    <TouchableOpacity style={styles.groupCard} onPress={onPress} activeOpacity={0.84}>
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
    <TouchableOpacity style={styles.projectCard} onPress={onPress} activeOpacity={0.84}>
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

function CompactEmpty({ image, title }) {
  return (
    <View style={styles.emptyCard}>
      <Image source={image} style={styles.emptyImage} />
      <Text style={[styles.featureTitle, styles.emptyTitle]}>{title}</Text>
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

function settledList(result) {
  return result.status === 'fulfilled' && Array.isArray(result.value.data) ? result.value.data : [];
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
  container: { flex: 1, backgroundColor: '#F4F5F7' },
  content: { paddingHorizontal: 12, paddingTop: 9, paddingBottom: 20 },
  greeting: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  greetingLogo: { width: 116, height: 32, marginBottom: 2 },
  greetingTitle: {
    color: COLORS.text,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '800',
    marginTop: 3,
  },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.surface },
  searchCard: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dbeafe',
    padding: 10,
    marginBottom: 10,
    ...SHADOWS.soft,
  },
  searchIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.softBlue,
  },
  searchText: { flex: 1, minWidth: 0 },
  searchTitle: { color: COLORS.bxBlue, fontSize: 13, lineHeight: 17, fontWeight: '900' },
  searchSubtitle: { color: COLORS.muted, fontSize: 10, lineHeight: 13, marginTop: 1 },
  section: { marginBottom: 10 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
    paddingHorizontal: 2,
  },
  sectionTitle: { color: COLORS.text, fontSize: 15, lineHeight: 19, fontWeight: '800' },
  sectionAction: { color: COLORS.interactive, fontSize: 12, fontWeight: '700' },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.soft,
  },
  activityDate: {
    width: 42,
    height: 46,
    borderRadius: 14,
    backgroundColor: COLORS.softBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },
  dateDay: { color: COLORS.bxBlue, fontSize: 16, lineHeight: 18, fontWeight: '900' },
  dateMonth: { color: COLORS.interactive, fontSize: 9, lineHeight: 12, fontWeight: '800' },
  featureBody: { flex: 1, minWidth: 0, marginRight: 8 },
  featureTitle: { color: COLORS.text, fontSize: 14, lineHeight: 18, fontWeight: '800' },
  secondaryText: { color: COLORS.muted, fontSize: 12, lineHeight: 17, marginTop: 3 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
  metaText: { color: COLORS.muted, fontSize: 11, lineHeight: 14, flexShrink: 1 },
  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.soft,
  },
  roundIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.softGreen,
    marginRight: 12,
  },
  listCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.soft,
  },
  row: { minHeight: 50, flexDirection: 'row', alignItems: 'center', paddingVertical: 7 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  blueIcon: { backgroundColor: COLORS.softBlue },
  purpleIcon: { backgroundColor: COLORS.softPurple },
  rowBody: { flex: 1, minWidth: 0, marginRight: 8 },
  rowTitle: { color: COLORS.text, fontSize: 13, lineHeight: 17, fontWeight: '700' },
  rowText: { color: COLORS.muted, fontSize: 11, lineHeight: 15, marginTop: 2 },
  rowDate: { color: COLORS.muted, fontSize: 9 },
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
    borderRadius: 16,
    padding: 10,
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
  projectTitle: { color: COLORS.text, fontSize: 16, lineHeight: 21, fontWeight: '800' },
  projectStats: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 8 },
  emptyCard: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.soft,
  },
  emptyImage: { width: 52, height: 52, borderRadius: 13, marginRight: 10 },
  emptyBody: { flex: 1, minWidth: 0, marginRight: 8 },
  emptyTitle: { flex: 1 },
});
