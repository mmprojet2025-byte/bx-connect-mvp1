import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ActivityIndicator, View, TouchableOpacity, Text, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import AppIcon from '../components/AppIcon';
import api from '../api/axios';
import { getUnreadCount } from '../api/notifications';

// ─── Écrans publics ───────────────────────────────────────────────────────────
import HomeScreen          from '../screens/HomeScreen';
import WelcomeScreen       from '../screens/WelcomeScreen';
import LoginScreen         from '../screens/LoginScreen';
import RegisterScreen      from '../screens/RegisterScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import ActivitiesScreen    from '../screens/ActivitiesScreen';
import LegalScreen         from '../screens/LegalScreen';

// ─── Écrans privés ────────────────────────────────────────────────────────────
import DashboardScreen     from '../screens/DashboardScreen';
import MemberHomeScreen    from '../screens/MemberHomeScreen';
import ProfileScreen       from '../screens/ProfileScreen';
import GroupesScreen       from '../screens/GroupesScreen';
import MessagerieScreen    from '../screens/MessagerieScreen';
import BusinessConversationsScreen from '../screens/BusinessConversationsScreen';
import ProjectsScreen        from '../screens/ProjectsScreen';
import NotificationsScreen   from '../screens/NotificationsScreen';
import AdminUsersScreen      from '../screens/AdminUsersScreen';
import PartnerSupportsScreen from '../screens/PartnerSupportsScreen';
import ReferentRequestsScreen from '../screens/ReferentRequestsScreen';
import ReferentMembersScreen from '../screens/ReferentMembersScreen';
import AdminPendingGroupsScreen from '../screens/AdminPendingGroupsScreen';
import AdminOpportunitiesScreen from '../screens/AdminOpportunitiesScreen';
import AdminReferentsScreen from '../screens/AdminReferentsScreen';
import AdminPartnerSupportsScreen from '../screens/AdminPartnerSupportsScreen';
import AdminSubmittedProjectsScreen from '../screens/AdminSubmittedProjectsScreen';
import SuperAdminLogsScreen from '../screens/SuperAdminLogsScreen';
import SuperAdminAccountSecurityScreen from '../screens/SuperAdminAccountSecurityScreen';
import PartnerProfileScreen from '../screens/PartnerProfileScreen';
import AnnoncesScreen from '../screens/AnnoncesScreen';
import GlobalSearchScreen from '../screens/GlobalSearchScreen';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

const headerStyle = {
  headerStyle: { backgroundColor: '#FFFFFF' },
  headerTintColor: '#111827',
  headerShadowVisible: false,
  headerBackButtonDisplayMode: 'minimal',
  headerTitleAlign: 'left',
  headerTitleStyle: { fontWeight: '700', fontSize: 17 },
  headerBackgroundContainerStyle: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
};

function HeaderTitle({ title }) {
  return (
    <View style={{ minWidth: 0 }}>
      <Text numberOfLines={1} style={{ color: '#111827', fontSize: 17, lineHeight: 21, fontWeight: '700' }}>
        {title}
      </Text>
    </View>
  );
}

function NotificationButton({ count, onPress, label }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 2,
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <AppIcon name="bell" size={21} color="#374151" />
      {count > 0 ? (
        <View style={{
          position: 'absolute',
          top: 5,
          right: 4,
          minWidth: 17,
          height: 17,
          borderRadius: 9,
          paddingHorizontal: 4,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#EF4444',
          borderWidth: 2,
          borderColor: '#FFFFFF',
        }}>
          <Text style={{ color: '#FFFFFF', fontSize: 9, lineHeight: 11, fontWeight: '800' }}>
            {count > 9 ? '9+' : count}
          </Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

function SearchButton({ onPress, label }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <AppIcon name="search" size={21} color="#374151" />
    </TouchableOpacity>
  );
}

// ─── Stack public ─────────────────────────────────────────────────────────────
function PublicStack({ initialRouteName = 'Welcome' }) {
  const { t } = useTranslation();

  return (
    <Stack.Navigator initialRouteName={initialRouteName} screenOptions={headerStyle}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Home"       component={HomeScreen}      options={{ title: 'BX-CONNECT', headerBackVisible: false }} />
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={({ navigation }) => ({
          title: t('navigation.login'),
          headerBackVisible: false,
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => navigation.navigate('Welcome')}
              accessibilityRole="button"
              accessibilityLabel={t('auth.back_home_short')}
              style={{ width: 44, height: 44, alignItems: 'flex-start', justifyContent: 'center' }}
            >
              <AppIcon name="chevron-back" size={24} color="#111827" />
            </TouchableOpacity>
          ),
        })}
      />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={({ navigation }) => ({
          title: t('navigation.createAccount'),
          headerBackVisible: false,
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => navigation.navigate('Welcome')}
              accessibilityRole="button"
              accessibilityLabel={t('welcome.back')}
              style={{ width: 44, height: 44, alignItems: 'flex-start', justifyContent: 'center' }}
            >
              <AppIcon name="chevron-back" size={24} color="#111827" />
            </TouchableOpacity>
          ),
        })}
      />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ title: t('auth.forgot_password_title') }} />
      <Stack.Screen name="Activities" component={ActivitiesScreen} options={{ title: t('navigation.activities') }} />
      <Stack.Screen name="Groupes"    component={GroupesScreen}    options={{ title: t('navigation.groups') }} />
      <Stack.Screen name="LegalTerms" component={LegalScreen} initialParams={{ document: 'terms' }} options={{ title: t('legal.links.terms') }} />
      <Stack.Screen name="LegalPrivacy" component={LegalScreen} initialParams={{ document: 'privacy' }} options={{ title: t('legal.links.privacy') }} />
      <Stack.Screen name="LegalNotices" component={LegalScreen} initialParams={{ document: 'notices' }} options={{ title: t('legal.links.notices') }} />
    </Stack.Navigator>
  );
}

// ─── Stacks privés (un par onglet) ───────────────────────────────────────────
function privateScreenOptions({ title, unreadNotifications, notificationLabel, searchLabel, navigation, showSearch = false }) {
  return {
    ...headerStyle,
    headerTitle: () => <HeaderTitle title={title} />,
    headerRight: () => (
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {showSearch ? (
          <SearchButton
            label={searchLabel}
            onPress={() => navigation.navigate('GlobalSearch')}
          />
        ) : null}
        <NotificationButton
          count={unreadNotifications}
          label={notificationLabel}
          onPress={() => navigation.navigate('NotificationsAccess')}
        />
      </View>
    ),
  };
}

function commonPrivateScreens(t) {
  return [
    <Stack.Screen
      key="global-search"
      name="GlobalSearch"
      component={GlobalSearchScreen}
      options={{ ...headerStyle, title: t('search.title') }}
    />,
    <Stack.Screen
      key="annonces-access"
      name="AnnoncesAccess"
      component={AnnoncesScreen}
      options={{ ...headerStyle, title: t('navigation.announcements') }}
    />,
  ];
}

function legalScreens(t) {
  return [
    <Stack.Screen key="legal-terms" name="LegalTerms" component={LegalScreen} initialParams={{ document: 'terms' }} options={{ ...headerStyle, title: t('legal.links.terms') }} />,
    <Stack.Screen key="legal-privacy" name="LegalPrivacy" component={LegalScreen} initialParams={{ document: 'privacy' }} options={{ ...headerStyle, title: t('legal.links.privacy') }} />,
    <Stack.Screen key="legal-notices" name="LegalNotices" component={LegalScreen} initialParams={{ document: 'notices' }} options={{ ...headerStyle, title: t('legal.links.notices') }} />,
  ];
}

function makeStack(ScreenComponent, title, unreadNotifications, showSearch = false) {
  return function StackWrapper() {
    const { t } = useTranslation();
    return (
      <Stack.Navigator>
        <Stack.Screen
          name="Main"
          component={ScreenComponent}
          options={({ navigation }) => ({
            ...privateScreenOptions({
              title,
              unreadNotifications,
              notificationLabel: t('navigation.notifications'),
              searchLabel: t('search.title'),
              navigation,
              showSearch,
            }),
            headerBackVisible: false,
          })}
        />
        <Stack.Screen
          name="NotificationsAccess"
          component={NotificationsScreen}
          options={{ ...headerStyle, title: t('navigation.notifications') }}
        />
        {commonPrivateScreens(t)}
        {legalScreens(t)}
      </Stack.Navigator>
    );
  };
}

function makeTechnicalStack(ScreenComponent, title) {
  return function TechnicalStackWrapper() {
    return (
      <Stack.Navigator>
        <Stack.Screen
          name="Main"
          component={ScreenComponent}
          options={{
            ...headerStyle,
            headerTitle: () => <HeaderTitle title={title} />,
            headerBackVisible: false,
          }}
        />
      </Stack.Navigator>
    );
  };
}

function makeDashboardStack(t, unreadNotifications, access) {
  return function DashboardStackWrapper() {
    return (
      <Stack.Navigator>
        <Stack.Screen
          name="Main"
          component={DashboardScreen}
          options={({ navigation }) => ({
            ...privateScreenOptions({
              title: 'BX-CONNECT',
              unreadNotifications,
              notificationLabel: t('navigation.notifications'),
              searchLabel: t('search.title'),
              navigation,
              showSearch: true,
            }),
            headerBackVisible: false,
          })}
        />
        <Stack.Screen name="NotificationsAccess" component={NotificationsScreen} options={{ ...headerStyle, title: t('navigation.notifications') }} />
        {commonPrivateScreens(t)}
        {legalScreens(t)}
        {access.groups ? (
          <Stack.Screen
            name="GroupesAccess"
            component={GroupesScreen}
            options={{ ...headerStyle, title: t('navigation.groups') }}
          />
        ) : null}
        {access.projects ? (
          <Stack.Screen
            name="ProjectsAccess"
            component={ProjectsScreen}
            options={{ ...headerStyle, title: t('navigation.projects') }}
          />
        ) : null}
        {access.supports ? (
          <Stack.Screen
            name="SupportsAccess"
            component={PartnerSupportsScreen}
            options={{ ...headerStyle, title: t('partner.supportsAndOpportunities') }}
          />
        ) : null}
        {access.partnerProfile ? (
          <Stack.Screen
            name="PartnerProfileAccess"
            component={PartnerProfileScreen}
            options={{ ...headerStyle, title: t('partnerInstitution.profileTitle') }}
          />
        ) : null}
        {access.referentTools ? (
          <>
            <Stack.Screen
              name="ReferentRequestsAccess"
              component={ReferentRequestsScreen}
              options={{ ...headerStyle, title: t('referentMobile.requestsTitle') }}
            />
            <Stack.Screen
              name="ReferentMembersAccess"
              component={ReferentMembersScreen}
              options={{ ...headerStyle, title: t('referentMobile.membersTitle') }}
            />
          </>
        ) : null}
        {access.pendingGroups ? (
          <Stack.Screen
            name="AdminPendingGroupsAccess"
            component={AdminPendingGroupsScreen}
            options={{ ...headerStyle, title: t('adminMobile.pendingGroupsTitle') }}
          />
        ) : null}
        {access.opportunities ? (
          <Stack.Screen
            name="AdminOpportunitiesAccess"
            component={AdminOpportunitiesScreen}
            options={{ ...headerStyle, title: t('adminMobile.opportunitiesTitle') }}
          />
        ) : null}
        {access.referents ? (
          <Stack.Screen
            name="AdminReferentsAccess"
            component={AdminReferentsScreen}
            options={{ ...headerStyle, title: t('adminMobile.referentsTitle') }}
          />
        ) : null}
        {access.supportsAdmin ? (
          <Stack.Screen
            name="AdminPartnerSupportsAccess"
            component={AdminPartnerSupportsScreen}
            options={{ ...headerStyle, title: t('adminMobile.partnerSupportsTitle') }}
          />
        ) : null}
        {access.submittedProjects ? (
          <Stack.Screen
            name="AdminSubmittedProjectsAccess"
            component={AdminSubmittedProjectsScreen}
            options={{ ...headerStyle, title: t('adminMobile.submittedProjects') }}
          />
        ) : null}
        {access.logs ? (
          <Stack.Screen
            name="SuperAdminLogsAccess"
            component={SuperAdminLogsScreen}
            options={{ ...headerStyle, title: t('superAdmin.logsTitle') }}
          />
        ) : null}
      </Stack.Navigator>
    );
  };
}

function makeNetworkStack(title, unreadNotifications) {
  return function NetworkStackWrapper() {
    const { t } = useTranslation();
    return (
      <Stack.Navigator>
        <Stack.Screen
          name="Main"
          component={NetworkHome}
          options={({ navigation }) => ({
            ...privateScreenOptions({
              title,
              unreadNotifications,
              notificationLabel: t('navigation.notifications'),
              searchLabel: t('search.title'),
              navigation,
              showSearch: true,
            }),
            headerBackVisible: false,
          })}
        />
        <Stack.Screen name="GroupesAccess" component={GroupesScreen} options={{ ...headerStyle, title: t('navigation.groups') }} />
        <Stack.Screen name="ProjectsAccess" component={ProjectsScreen} options={{ ...headerStyle, title: t('navigation.projects') }} />
        <Stack.Screen name="NotificationsAccess" component={NotificationsScreen} options={{ ...headerStyle, title: t('navigation.notifications') }} />
        {commonPrivateScreens(t)}
        {legalScreens(t)}
      </Stack.Navigator>
    );
  };
}

function makeManagementStack(title, unreadNotifications) {
  return function ManagementStackWrapper() {
    const { t } = useTranslation();
    const { isAdmin, isSuperAdmin } = useAuth();
    return (
      <Stack.Navigator>
        <Stack.Screen
          name="Main"
          component={ManagementHome}
          options={({ navigation }) => ({
            ...privateScreenOptions({
              title,
              unreadNotifications,
              notificationLabel: t('navigation.notifications'),
              searchLabel: t('search.title'),
              navigation,
              showSearch: true,
            }),
            headerBackVisible: false,
          })}
        />
        <Stack.Screen name="UsersAccess" component={AdminUsersScreen} options={{ ...headerStyle, title: t('navigation.users') }} />
        {isSuperAdmin ? (
          <Stack.Screen name="SuperAdminLogsAccess" component={SuperAdminLogsScreen} options={{ ...headerStyle, title: t('superAdmin.logsTitle') }} />
        ) : null}
        <Stack.Screen name="GroupesAccess" component={GroupesScreen} options={{ ...headerStyle, title: t('navigation.groups') }} />
        <Stack.Screen name="ProjectsAccess" component={ProjectsScreen} options={{ ...headerStyle, title: t('navigation.projects') }} />
        <Stack.Screen name="AdminPendingGroupsAccess" component={AdminPendingGroupsScreen} options={{ ...headerStyle, title: t('adminMobile.pendingGroupsTitle') }} />
        {isAdmin ? (
          <>
            <Stack.Screen name="AdminOpportunitiesAccess" component={AdminOpportunitiesScreen} options={{ ...headerStyle, title: t('adminMobile.opportunitiesTitle') }} />
            <Stack.Screen name="AdminReferentsAccess" component={AdminReferentsScreen} options={{ ...headerStyle, title: t('adminMobile.referentsTitle') }} />
            <Stack.Screen name="AdminPartnerSupportsAccess" component={AdminPartnerSupportsScreen} options={{ ...headerStyle, title: t('adminMobile.partnerSupportsTitle') }} />
            <Stack.Screen name="AdminSubmittedProjectsAccess" component={AdminSubmittedProjectsScreen} options={{ ...headerStyle, title: t('adminMobile.submittedProjects') }} />
          </>
        ) : null}
        <Stack.Screen name="NotificationsAccess" component={NotificationsScreen} options={{ ...headerStyle, title: t('navigation.notifications') }} />
        {commonPrivateScreens(t)}
        {legalScreens(t)}
      </Stack.Navigator>
    );
  };
}

function NetworkHome({ navigation }) {
  const { t } = useTranslation();
  const { isAdmin, isReferent, isMembre } = useAuth();
  const [groupState, setGroupState] = useState({ status: 'loading', data: [] });
  const [projectState, setProjectState] = useState({ status: 'loading', data: [] });

  const loadGroups = async () => {
    setGroupState((current) => ({ ...current, status: 'loading' }));
    try {
      const response = await (isAdmin
        ? api.get('/admin/groupes')
        : isReferent
          ? api.get('/referent/groupes')
          : api.get('/groupes'));
      setGroupState({ status: 'success', data: response.data || [] });
    } catch {
      setGroupState({ status: 'error', data: [] });
    }
  };

  const loadProjects = async () => {
    setProjectState((current) => ({ ...current, status: 'loading' }));
    try {
      const response = await (isAdmin
        ? api.get('/projets/admin/tous')
        : isReferent
          ? api.get('/projets/referent/mes-groupes')
          : api.get('/projets'));
      setProjectState({ status: 'success', data: response.data || [] });
    } catch {
      setProjectState({ status: 'error', data: [] });
    }
  };

  useEffect(() => {
    let cancelled = false;
    const loadInitialData = async () => {
      await Promise.resolve();
      if (cancelled) return;
      setGroupState({ status: 'loading', data: [] });
      setProjectState({ status: 'loading', data: [] });

      if (!(isMembre || isReferent || isAdmin)) {
        if (!cancelled) {
          setGroupState({ status: 'success', data: [] });
          setProjectState({ status: 'success', data: [] });
        }
        return;
      }

      const [groupResult, projectResult] = await Promise.allSettled([
        isAdmin
          ? api.get('/admin/groupes')
          : isReferent
            ? api.get('/referent/groupes')
            : api.get('/groupes'),
        isAdmin
          ? api.get('/projets/admin/tous')
          : isReferent
            ? api.get('/projets/referent/mes-groupes')
            : api.get('/projets'),
      ]);

      if (cancelled) return;
      setGroupState(groupResult.status === 'fulfilled'
        ? { status: 'success', data: groupResult.value.data || [] }
        : { status: 'error', data: [] });
      setProjectState(projectResult.status === 'fulfilled'
        ? { status: 'success', data: projectResult.value.data || [] }
        : { status: 'error', data: [] });
    };

    void loadInitialData();

    return () => { cancelled = true; };
  }, [isAdmin, isReferent, isMembre]);

  const groupes = groupState.data;
  const projets = projectState.data;
  const groupesActifs = groupes.filter((groupe) => ['VALIDE', 'ACTIF', undefined, null].includes(groupe.statut)).length;
  const projetsActifs = projets.filter((projet) => !['REJETE', 'ARCHIVE'].includes(projet.statut)).length;
  const membres = groupes.reduce((total, groupe) => total + Number(groupe.nombreMembres || 0), 0);
  const bothFailed = groupState.status === 'error' && projectState.status === 'error';
  const retryAll = () => {
    void loadGroups();
    void loadProjects();
  };

  return (
    <ScrollView style={navigatorStyles.hubPage} contentContainerStyle={navigatorStyles.hubContent}>
      <View style={navigatorStyles.networkIntro}>
        <View style={navigatorStyles.networkEyebrow}>
          <AppIcon name="globe" size={17} color="#F97316" />
          <Text style={navigatorStyles.networkEyebrowText}>{t('network.eyebrow')}</Text>
        </View>
        <Text style={navigatorStyles.networkTitle}>{t('network.title')}</Text>
        <Text style={navigatorStyles.networkSubtitle}>{t('network.introduction')}</Text>
      </View>

      <View style={navigatorStyles.networkStats} accessibilityLabel={t('network.statsLabel')}>
        <NetworkStat
          value={networkStatValue(groupState.status, groupesActifs)}
          label={t('network.activeGroups')}
          icon="group"
          color="#2563EB"
          status={groupState.status}
          t={t}
        />
        <NetworkStat
          value={networkStatValue(projectState.status, projetsActifs)}
          label={t('network.activeProjects')}
          icon="project"
          color="#F97316"
          status={projectState.status}
          t={t}
        />
        <NetworkStat
          value={networkStatValue(groupState.status, membres)}
          label={t('network.members')}
          icon="globe"
          color="#22C55E"
          status={groupState.status}
          t={t}
        />
      </View>

      <NetworkAccessCard
        icon="group"
        title={t('network.groupsAccessTitle')}
        description={t('network.groupsAccessDescription')}
        color="#2563EB"
        onPress={() => navigation.navigate('GroupesAccess')}
      />
      <NetworkAccessCard
        icon="project"
        title={t('network.projectsAccessTitle')}
        description={t('network.projectsAccessDescription')}
        color="#F97316"
        onPress={() => navigation.navigate('ProjectsAccess')}
      />

      {bothFailed ? (
        <NetworkFeedback
          kind="error"
          title={t('network.globalErrorTitle')}
          text={t('network.globalErrorText')}
          actionLabel={t('common.retry')}
          onAction={retryAll}
        />
      ) : null}

      <View style={navigatorStyles.previewSection}>
        <View style={navigatorStyles.previewHeader}>
          <View style={navigatorStyles.previewHeading}>
            <View style={[navigatorStyles.previewDot, { backgroundColor: '#2563EB' }]} />
            <Text style={navigatorStyles.previewTitle}>{t('network.groupsPreview')}</Text>
          </View>
          <TouchableOpacity
            style={navigatorStyles.previewActionButton}
            onPress={() => navigation.navigate('GroupesAccess')}
            accessibilityRole="button"
            accessibilityLabel={t('network.seeAllGroups')}
          >
            <Text style={navigatorStyles.previewAction}>{t('memberHome.seeAll')}</Text>
            <AppIcon name="chevron-forward" size={16} color="#2563EB" />
          </TouchableOpacity>
        </View>
        {groupState.status === 'loading' ? (
          <ActivityIndicator color="#2563EB" style={navigatorStyles.previewLoader} />
        ) : groupState.status === 'error' && !bothFailed ? (
          <NetworkFeedback
            kind="error"
            title={t('network.groupsErrorTitle')}
            text={t('network.groupsErrorText')}
            actionLabel={t('common.retry')}
            onAction={() => void loadGroups()}
          />
        ) : groupState.status === 'success' && groupes.length === 0 ? (
          <NetworkFeedback
            icon="group"
            title={t('network.groupsEmptyTitle')}
            text={t('groups.available_will_appear')}
          />
        ) : (
          groupes.slice(0, 3).map((groupe) => (
            <NetworkPreviewCard
              key={`groupe-${groupe.id}`}
              icon="group"
              title={groupe.nom}
              subtitle={groupe.description || groupe.theme || t('groups.title')}
              badge={t('groups.members_count', { count: groupe.nombreMembres ?? 0 })}
              color="#0f766e"
              onPress={() => navigation.navigate('GroupesAccess')}
              accessibilityLabel={t('network.openGroupsListFor', { name: groupe.nom })}
            />
          ))
        )}
      </View>

      <View style={navigatorStyles.previewSection}>
        <View style={navigatorStyles.previewHeader}>
          <View style={navigatorStyles.previewHeading}>
            <View style={[navigatorStyles.previewDot, { backgroundColor: '#F97316' }]} />
            <Text style={navigatorStyles.previewTitle}>{t('network.projectsPreview')}</Text>
          </View>
          <TouchableOpacity
            style={navigatorStyles.previewActionButton}
            onPress={() => navigation.navigate('ProjectsAccess')}
            accessibilityRole="button"
            accessibilityLabel={t('network.seeAllProjects')}
          >
            <Text style={navigatorStyles.previewAction}>{t('memberHome.discover')}</Text>
            <AppIcon name="chevron-forward" size={16} color="#2563EB" />
          </TouchableOpacity>
        </View>
        {projectState.status === 'loading' ? (
          <ActivityIndicator color="#2563EB" style={navigatorStyles.previewLoader} />
        ) : projectState.status === 'error' && !bothFailed ? (
          <NetworkFeedback
            kind="error"
            title={t('network.projectsErrorTitle')}
            text={t('network.projectsErrorText')}
            actionLabel={t('common.retry')}
            onAction={() => void loadProjects()}
          />
        ) : projectState.status === 'success' && projets.length === 0 ? (
          <NetworkFeedback
            icon="project"
            title={t('network.projectsEmptyTitle')}
            text={t('projects.public_will_appear')}
          />
        ) : (
          projets.slice(0, 3).map((projet) => (
            <NetworkPreviewCard
              key={`projet-${projet.id}`}
              icon="project"
              title={projet.titre}
              subtitle={projet.groupeNom || projet.description || t('navigation.projects')}
              badge={projet.statut ? t(`statuses.${projet.statut}`) : null}
              color="#F97316"
              onPress={() => navigation.navigate('ProjectsAccess')}
              accessibilityLabel={t('network.openProjectsListFor', { name: projet.titre })}
            />
          ))
        )}
      </View>
    </ScrollView>
  );
}

function networkStatValue(status, value) {
  if (status === 'loading') return '…';
  if (status === 'error') return '—';
  return value;
}

function NetworkStat({ value, label, icon, color, status, t }) {
  const spokenValue = status === 'error'
    ? t('network.unavailable')
    : status === 'loading' ? t('common.loading') : value;
  return (
    <View
      style={navigatorStyles.networkStat}
      accessible
      accessibilityLabel={`${label}: ${spokenValue}`}
    >
      <View style={[navigatorStyles.networkStatIcon, { backgroundColor: `${color}18` }]}>
        <AppIcon name={icon} size={16} color={color} />
      </View>
      <Text style={[navigatorStyles.networkStatValue, { color }]}>{value}</Text>
      <Text style={navigatorStyles.networkStatLabel}>{label}</Text>
    </View>
  );
}

function NetworkAccessCard({ icon, title, description, color, onPress }) {
  return (
    <TouchableOpacity
      style={navigatorStyles.networkAccessCard}
      onPress={onPress}
      activeOpacity={0.82}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View style={[navigatorStyles.networkAccessIcon, { backgroundColor: `${color}18` }]}>
        <AppIcon name={icon} size={24} color={color} />
      </View>
      <View style={navigatorStyles.networkAccessText}>
        <Text style={navigatorStyles.networkAccessTitle}>{title}</Text>
        <Text style={navigatorStyles.networkAccessDescription}>{description}</Text>
      </View>
      <AppIcon name="chevron-forward" size={20} color={color} />
    </TouchableOpacity>
  );
}

function NetworkFeedback({ kind = 'empty', icon, title, text, actionLabel, onAction }) {
  const isError = kind === 'error';
  return (
    <View
      style={[navigatorStyles.networkFeedback, isError && navigatorStyles.networkFeedbackError]}
      accessibilityRole={isError ? 'alert' : 'text'}
    >
      <View style={navigatorStyles.networkFeedbackHeader}>
        <AppIcon name={isError ? 'warning' : icon} size={19} color={isError ? '#EF4444' : '#2563EB'} />
        <Text style={navigatorStyles.networkFeedbackTitle}>{title}</Text>
      </View>
      <Text style={navigatorStyles.networkFeedbackText}>{text}</Text>
      {actionLabel && onAction ? (
        <TouchableOpacity
          style={navigatorStyles.networkFeedbackAction}
          onPress={onAction}
          accessibilityRole="button"
        >
          <AppIcon name="refresh" size={17} color="#2563EB" />
          <Text style={navigatorStyles.networkFeedbackActionText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function NetworkPreviewCard({ icon, title, subtitle, badge, color, onPress, accessibilityLabel }) {
  return (
    <TouchableOpacity
      style={navigatorStyles.previewCard}
      onPress={onPress}
      activeOpacity={0.82}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <View style={[navigatorStyles.previewIcon, { backgroundColor: `${color}18` }]}>
        <AppIcon name={icon} size={19} color={color} />
      </View>
      <View style={navigatorStyles.previewText}>
        <Text style={navigatorStyles.previewCardTitle} numberOfLines={1}>{title}</Text>
        <Text style={navigatorStyles.previewCardSubtitle} numberOfLines={1}>{subtitle}</Text>
      </View>
      {badge ? (
        <Text style={[navigatorStyles.previewBadge, { color, backgroundColor: `${color}14` }]} numberOfLines={1}>
          {badge}
        </Text>
      ) : null}
      <AppIcon name="chevron-forward" size={16} color="#94A3B8" />
    </TouchableOpacity>
  );
}

function ManagementHome({ navigation }) {
  const { t } = useTranslation();
  const { isAdmin, isSuperAdmin } = useAuth();

  return (
    <View style={navigatorStyles.hubPage}>
      <Text style={navigatorStyles.hubTitle}>
        {isSuperAdmin
          ? t('superAdmin.mobile.sectionTitle')
          : t('admin.mobile.sectionTitle')}
      </Text>
      <Text style={navigatorStyles.hubSubtitle}>
        {isSuperAdmin
          ? t('superAdmin.mobile.sectionText')
          : t('admin.mobile.sectionText')}
      </Text>
      <HubLink
        icon="group"
        title={t('navigation.users')}
        description={isSuperAdmin
          ? t('superAdmin.mobile.usersAction')
          : t('adminMobile.usersAction')}
        onPress={() => navigation.navigate('UsersAccess')}
      />
      {isAdmin ? (
        <>
          <HubLink
            icon="group"
            title={t('navigation.groups')}
            description={t('adminMobile.groupsAction')}
            onPress={() => navigation.navigate('GroupesAccess')}
          />
          <HubLink
            icon="project"
            title={t('navigation.projects')}
            description={t('adminMobile.projectsAction')}
            onPress={() => navigation.navigate('ProjectsAccess')}
          />
          <HubLink
            icon="warning"
            title={t('adminMobile.pendingGroupsTitle')}
            description={t('adminMobile.pendingGroupsAction')}
            onPress={() => navigation.navigate('AdminPendingGroupsAccess')}
          />
          <HubLink
            icon="profile"
            title={t('adminMobile.referentsTitle')}
            description={t('adminMobile.referentsAction')}
            onPress={() => navigation.navigate('AdminReferentsAccess')}
          />
          <HubLink
            icon="wallet"
            title={t('adminMobile.partnerSupportsTitle')}
            description={t('adminMobile.partnerSupportsAction')}
            onPress={() => navigation.navigate('AdminPartnerSupportsAccess')}
          />
          <HubLink
            icon="project"
            title={t('adminMobile.submittedProjects')}
            description={t('adminMobile.submittedProjectsAction')}
            onPress={() => navigation.navigate('AdminSubmittedProjectsAccess')}
          />
          <HubLink
            icon="alert"
            title={t('adminMobile.opportunitiesTitle')}
            description={t('adminMobile.opportunitiesAction')}
            onPress={() => navigation.navigate('AdminOpportunitiesAccess')}
          />
        </>
      ) : null}
      {isSuperAdmin ? (
        <HubLink
          icon="lock"
          title={t('superAdmin.logsTitle')}
          description={t('superAdmin.logsAction')}
          onPress={() => navigation.navigate('SuperAdminLogsAccess')}
        />
      ) : null}
    </View>
  );
}

function HubLink({ icon, title, description, onPress }) {
  return (
    <TouchableOpacity
      style={navigatorStyles.hubLink}
      onPress={onPress}
      activeOpacity={0.78}
      accessibilityRole="button"
    >
      <View style={navigatorStyles.hubIcon}>
        <AppIcon name={icon} size={21} color="#2563EB" />
      </View>
      <View style={navigatorStyles.hubText}>
        <Text style={navigatorStyles.hubLinkTitle}>{title}</Text>
        <Text style={navigatorStyles.hubLinkDescription} numberOfLines={2}>{description}</Text>
      </View>
      <AppIcon name="chevron-forward" size={18} color="#64748B" />
    </TouchableOpacity>
  );
}

// ─── Tab Navigator privé ─────────────────────────────────────────────────────
function PrivateTabs() {
  const { isMembre, isReferent, isAdmin, isSuperAdmin, isPartenaire } = useAuth();
  const { t, i18n } = useTranslation();
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    if (isSuperAdmin) {
      void Promise.resolve().then(() => setUnreadNotifications(0));
      return undefined;
    }
    let cancelled = false;
    getUnreadCount()
      .then((count) => {
        if (!cancelled) {
          setUnreadNotifications(count);
        }
      })
      .catch(() => {
        if (!cancelled) setUnreadNotifications(0);
      });
    return () => { cancelled = true; };
  }, [isMembre, isReferent, isAdmin, isSuperAdmin, isPartenaire]);

  const communityLabels = getCommunityLabels(i18n.language);
  const DashboardStack = makeDashboardStack(t, unreadNotifications, {
    groups: isAdmin || isReferent,
    projects: isAdmin || isReferent,
    supports: isPartenaire,
    partnerProfile: isPartenaire,
    referents: isAdmin,
    supportsAdmin: isAdmin,
    submittedProjects: isAdmin,
    referentTools: isReferent,
    pendingGroups: isAdmin,
    opportunities: isAdmin,
    logs: isSuperAdmin,
  });
  const MemberHomeStack    = makeStack(MemberHomeScreen, 'BX-CONNECT', unreadNotifications, true);
  const ActivitiesStack    = makeStack(ActivitiesScreen, t('navigation.activities'), unreadNotifications);
  const ProjectsStack      = makeStack(ProjectsScreen, t('navigation.projects'), unreadNotifications);
  const SupportsStack      = makeStack(PartnerSupportsScreen, t('partner.supportsAndOpportunities'), unreadNotifications);
  const NetworkStack       = makeNetworkStack(communityLabels.network, unreadNotifications);
  const ManagementStack    = makeManagementStack(communityLabels.management, unreadNotifications);
  const MessagerieStack    = makeStack(MessagerieScreen, t('navigation.messaging'), unreadNotifications);
  const BusinessConversationsStack = makeStack(BusinessConversationsScreen, t('navigation.conversations'), unreadNotifications);
  const NotificationsStack = makeStack(NotificationsScreen, t('navigation.notifications'), unreadNotifications);
  const ProfileStack       = makeStack(ProfileScreen, t('navigation.profile'), unreadNotifications);
  const SuperAdminDashboardStack = makeTechnicalStack(DashboardScreen, 'BX-CONNECT');
  const SuperAdminUsersStack = makeTechnicalStack(AdminUsersScreen, t('superAdmin.admins'));
  const SuperAdminLogsStack = makeTechnicalStack(SuperAdminLogsScreen, t('superAdmin.logsTitle'));
  const SuperAdminSecurityStack = makeTechnicalStack(
    SuperAdminAccountSecurityScreen,
    t('superAdmin.security')
  );

  const tabs = getTabsForRole({
    isMembre,
    isReferent,
    isAdmin,
    isSuperAdmin,
    isPartenaire,
    t,
    stacks: {
      DashboardStack,
      MemberHomeStack,
      ActivitiesStack,
      ProjectsStack,
      SupportsStack,
      NetworkStack,
      ManagementStack,
      MessagerieStack,
      BusinessConversationsStack,
      NotificationsStack,
      ProfileStack,
      SuperAdminDashboardStack,
      SuperAdminUsersStack,
      SuperAdminLogsStack,
      SuperAdminSecurityStack,
    },
    labels: communityLabels,
  });

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E5E7EB',
          borderTopWidth: 1,
          shadowColor: '#111827',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.04,
          shadowRadius: 6,
          elevation: 4,
        },
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: '#64748B',
        tabBarHideOnKeyboard: true,
        tabBarItemStyle: {
          flex: 1,
          minHeight: 44,
          paddingVertical: 2,
        },
        tabBarIconStyle: {
          marginTop: 0,
          marginBottom: 0,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          lineHeight: 13,
          fontWeight: '600',
          textAlign: 'center',
          marginTop: 2,
        },
      }}
    >
      {tabs.map((tab) => (
        <Tab.Screen
          key={tab.name}
          name={tab.name}
          component={tab.component}
          options={{
            tabBarLabel: tab.label,
            tabBarAccessibilityLabel: tab.label,
            tabBarButton: tab.hidden ? () => null : undefined,
            tabBarBadge: tab.name === 'TabNotifications' && unreadNotifications > 0
              ? unreadNotifications
              : undefined,
            tabBarBadgeStyle: {
              backgroundColor: '#EF4444',
              color: '#fff',
              fontSize: 10,
              fontWeight: '800',
            },
            tabBarIcon: ({ color }) => <AppIcon name={tab.icon} size={22} color={color} />,
          }}
        />
      ))}
    </Tab.Navigator>
  );
}

function getTabsForRole({ isMembre, isReferent, isAdmin, isSuperAdmin, isPartenaire, t, stacks, labels }) {
  if (isSuperAdmin) {
    return [
      tab('TabDashboard', t('navigation.home'), 'home', stacks.SuperAdminDashboardStack),
      tab('TabUsers', t('superAdmin.admins'), 'shield', stacks.SuperAdminUsersStack),
      tab('TabLogs', t('superAdmin.logs'), 'lock', stacks.SuperAdminLogsStack),
      tab('TabSecurity', t('superAdmin.security'), 'profile', stacks.SuperAdminSecurityStack),
    ];
  }

  if (isAdmin) {
    return [
      tab('TabDashboard', t('navigation.home'), 'home', stacks.DashboardStack),
      tab('TabUsers', labels.management, 'shield', stacks.ManagementStack),
      tab('TabActivities', t('navigation.activities'), 'activity', stacks.ActivitiesStack),
      tab('TabBusinessConversations', t('navigation.conversations'), 'message', stacks.BusinessConversationsStack),
      tab('TabNotifications', t('navigation.notifications'), 'bell', stacks.NotificationsStack),
      tab('TabProfile', t('navigation.profile'), 'profile', stacks.ProfileStack),
    ];
  }

  if (isPartenaire) {
    return [
      tab('TabDashboard', t('navigation.home'), 'home', stacks.DashboardStack),
      tab('TabProjects', t('navigation.projects'), 'project', stacks.ProjectsStack),
      tab('TabActivities', t('navigation.activities'), 'activity', stacks.ActivitiesStack),
      tab('TabBusinessConversations', t('navigation.conversations'), 'message', stacks.BusinessConversationsStack),
      tab('TabNotifications', t('navigation.notifications'), 'bell', stacks.NotificationsStack),
      tab('TabProfile', t('navigation.profile'), 'profile', stacks.ProfileStack),
      tab('TabSupports', t('partner.supports'), 'wallet', stacks.SupportsStack, true),
    ];
  }

  if (isReferent) {
    return [
      tab('TabDashboard', t('navigation.home'), 'home', stacks.DashboardStack),
      tab('TabGroupes', labels.network, 'group', stacks.NetworkStack),
      tab('TabActivities', t('navigation.activities'), 'activity', stacks.ActivitiesStack),
      tab('TabMessagerie', t('navigation.messages'), 'message', stacks.MessagerieStack),
      tab('TabBusinessConversations', t('navigation.conversations'), 'message', stacks.BusinessConversationsStack),
      tab('TabProfile', t('navigation.profile'), 'profile', stacks.ProfileStack),
      tab('TabNotifications', t('navigation.notifications'), 'bell', stacks.NotificationsStack, true),
    ];
  }

  if (isMembre) {
    return [
      tab('TabDashboard', t('navigation.home'), 'home', stacks.MemberHomeStack),
      tab('TabGroupes', labels.network, 'group', stacks.NetworkStack),
      tab('TabActivities', t('navigation.activities'), 'activity', stacks.ActivitiesStack),
      tab('TabMessagerie', t('navigation.messages'), 'message', stacks.MessagerieStack),
      tab('TabProfile', t('navigation.profile'), 'profile', stacks.ProfileStack),
      tab('TabNotifications', t('navigation.notifications'), 'bell', stacks.NotificationsStack, true),
    ];
  }

  return [
    tab('TabDashboard', t('navigation.home'), 'home', stacks.DashboardStack),
    tab('TabProfile', t('navigation.profile'), 'profile', stacks.ProfileStack),
  ];
}

function tab(name, label, icon, component, hidden = false) {
  return { name, label, icon, component, hidden };
}

function getCommunityLabels(language = 'fr') {
  if (language.startsWith('nl')) return { network: 'Netwerk', management: 'Beheer' };
  if (language.startsWith('en')) return { network: 'Network', management: 'Manage' };
  return { network: 'Réseau', management: 'Gestion' };
}

const navigatorStyles = {
  hubPage: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  hubContent: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    padding: 16,
    paddingBottom: 28,
  },
  hubTitle: {
    color: '#111827',
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '700',
    marginTop: 4,
  },
  hubSubtitle: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
    marginBottom: 10,
  },
  hubLink: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 11,
    padding: 9,
    marginBottom: 7,
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.035,
    shadowRadius: 5,
    elevation: 1,
  },
  hubIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    marginRight: 12,
  },
  hubText: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  hubLinkTitle: {
    color: '#111827',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
  hubLinkDescription: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  networkStats: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 16,
  },
  networkStat: {
    flex: 1,
    minHeight: 116,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 10,
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.035,
    shadowRadius: 5,
    elevation: 1,
  },
  networkStatIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  networkStatValue: {
    fontSize: 21,
    lineHeight: 25,
    fontWeight: '800',
    marginTop: 7,
  },
  networkStatLabel: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '700',
    marginTop: 3,
  },
  networkIntro: {
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    padding: 16,
    marginBottom: 16,
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.035,
    shadowRadius: 5,
    elevation: 1,
  },
  networkEyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 5,
  },
  networkEyebrowText: {
    flexShrink: 1,
    color: '#2563EB',
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  networkTitle: {
    color: '#1E3A8A',
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
  },
  networkSubtitle: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  networkAccessCard: {
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.035,
    shadowRadius: 5,
    elevation: 1,
  },
  networkAccessIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  networkAccessText: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  networkAccessTitle: {
    color: '#1E3A8A',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
  },
  networkAccessDescription: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 3,
  },
  previewSection: {
    marginTop: 10,
    marginBottom: 10,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  previewHeading: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 6,
  },
  previewDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 7,
  },
  previewTitle: {
    color: '#111827',
    flexShrink: 1,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
  },
  previewActionButton: {
    minHeight: 44,
    minWidth: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingLeft: 8,
  },
  previewAction: {
    color: '#2563EB',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
  },
  previewLoader: { marginVertical: 22 },
  networkFeedback: {
    color: '#64748B',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    marginBottom: 8,
  },
  networkFeedbackError: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  networkFeedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  networkFeedbackTitle: {
    flex: 1,
    color: '#111827',
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '800',
  },
  networkFeedbackText: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
  },
  networkFeedbackAction: {
    minHeight: 44,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    paddingRight: 12,
  },
  networkFeedbackActionText: {
    color: '#2563EB',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
  },
  previewCard: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    padding: 11,
    marginBottom: 8,
  },
  previewIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  previewText: {
    flex: 1,
    minWidth: 0,
    marginRight: 6,
  },
  previewCardTitle: {
    color: '#111827',
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '800',
  },
  previewCardSubtitle: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  previewBadge: {
    maxWidth: 88,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 4,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '900',
    overflow: 'hidden',
    marginRight: 5,
  },
};

// ─── Navigateur principal ─────────────────────────────────────────────────────
export default function AppNavigator() {
  const { isAuthenticated, loading, sessionExpired, postLogoutNotice } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6' }}>
        <ActivityIndicator size="large" color="#1E3A8A" />
      </View>
    );
  }

  return (
    <NavigationContainer key={isAuthenticated ? 'private' : 'public'}>
      {isAuthenticated
        ? <PrivateTabs />
        : <PublicStack initialRouteName={sessionExpired || postLogoutNotice ? 'Login' : 'Welcome'} />}
    </NavigationContainer>
  );
}
