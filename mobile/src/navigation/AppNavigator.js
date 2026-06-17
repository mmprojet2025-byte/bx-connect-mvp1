import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ActivityIndicator, View, TouchableOpacity, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import AppIcon from '../components/AppIcon';
import api from '../api/axios';

// ─── Écrans publics ───────────────────────────────────────────────────────────
import HomeScreen          from '../screens/HomeScreen';
import LoginScreen         from '../screens/LoginScreen';
import RegisterScreen      from '../screens/RegisterScreen';
import ActivitiesScreen    from '../screens/ActivitiesScreen';
import LegalScreen         from '../screens/LegalScreen';

// ─── Écrans privés ────────────────────────────────────────────────────────────
import DashboardScreen     from '../screens/DashboardScreen';
import MemberHomeScreen    from '../screens/MemberHomeScreen';
import ProfileScreen       from '../screens/ProfileScreen';
import GroupesScreen       from '../screens/GroupesScreen';
import MessagerieScreen    from '../screens/MessagerieScreen';
import ProjectsScreen        from '../screens/ProjectsScreen';
import NotificationsScreen   from '../screens/NotificationsScreen';
import AdminUsersScreen      from '../screens/AdminUsersScreen';
import PartnerSupportsScreen from '../screens/PartnerSupportsScreen';
import ReferentRequestsScreen from '../screens/ReferentRequestsScreen';
import ReferentMembersScreen from '../screens/ReferentMembersScreen';
import AdminPendingGroupsScreen from '../screens/AdminPendingGroupsScreen';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

const headerStyle = {
  headerStyle: { backgroundColor: '#FFFFFF' },
  headerTintColor: '#111827',
  headerShadowVisible: false,
  headerBackTitleVisible: false,
  headerTitleAlign: 'left',
  headerTitleStyle: { fontWeight: '700', fontSize: 17 },
  headerBackgroundContainerStyle: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
};

function HeaderTitle({ title, roleLabel }) {
  return (
    <View style={{ minWidth: 0 }}>
      <Text numberOfLines={1} style={{ color: '#111827', fontSize: 17, lineHeight: 21, fontWeight: '700' }}>
        {title}
      </Text>
      {roleLabel ? (
        <Text numberOfLines={1} style={{ color: '#64748B', fontSize: 11, lineHeight: 14, fontWeight: '600' }}>
          {roleLabel}
        </Text>
      ) : null}
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

// ─── Stack public ─────────────────────────────────────────────────────────────
function PublicStack({ initialRouteName = 'Home' }) {
  const { t } = useTranslation();

  return (
    <Stack.Navigator initialRouteName={initialRouteName} screenOptions={headerStyle}>
      <Stack.Screen name="Home"       component={HomeScreen}      options={{ title: 'BX-CONNECT', headerBackVisible: false }} />
      <Stack.Screen name="Login"      component={LoginScreen}     options={{ title: t('navigation.login') }} />
      <Stack.Screen name="Register"   component={RegisterScreen}  options={{ title: t('navigation.createAccount') }} />
      <Stack.Screen name="Activities" component={ActivitiesScreen} options={{ title: t('navigation.activities') }} />
      <Stack.Screen name="Groupes"    component={GroupesScreen}    options={{ title: t('navigation.groups') }} />
      <Stack.Screen name="LegalTerms" component={LegalScreen} initialParams={{ document: 'terms' }} options={{ title: t('legal.links.terms') }} />
      <Stack.Screen name="LegalPrivacy" component={LegalScreen} initialParams={{ document: 'privacy' }} options={{ title: t('legal.links.privacy') }} />
      <Stack.Screen name="LegalNotices" component={LegalScreen} initialParams={{ document: 'notices' }} options={{ title: t('legal.links.notices') }} />
    </Stack.Navigator>
  );
}

// ─── Stacks privés (un par onglet) ───────────────────────────────────────────
function privateScreenOptions({ title, roleLabel, unreadNotifications, notificationLabel, navigation }) {
  return {
    ...headerStyle,
    headerTitle: () => <HeaderTitle title={title} roleLabel={roleLabel} />,
    headerRight: () => (
      <NotificationButton
        count={unreadNotifications}
        label={notificationLabel}
        onPress={() => navigation.navigate('NotificationsAccess')}
      />
    ),
  };
}

function legalScreens(t) {
  return [
    <Stack.Screen key="legal-terms" name="LegalTerms" component={LegalScreen} initialParams={{ document: 'terms' }} options={{ ...headerStyle, title: t('legal.links.terms') }} />,
    <Stack.Screen key="legal-privacy" name="LegalPrivacy" component={LegalScreen} initialParams={{ document: 'privacy' }} options={{ ...headerStyle, title: t('legal.links.privacy') }} />,
    <Stack.Screen key="legal-notices" name="LegalNotices" component={LegalScreen} initialParams={{ document: 'notices' }} options={{ ...headerStyle, title: t('legal.links.notices') }} />,
  ];
}

function makeStack(ScreenComponent, title, roleLabel, unreadNotifications) {
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
              roleLabel,
              unreadNotifications,
              notificationLabel: t('navigation.notifications'),
              navigation,
            }),
            headerBackVisible: false,
          })}
        />
        <Stack.Screen
          name="NotificationsAccess"
          component={NotificationsScreen}
          options={{ ...headerStyle, title: t('navigation.notifications') }}
        />
        {legalScreens(t)}
      </Stack.Navigator>
    );
  };
}

function makeDashboardStack(t, roleLabel, unreadNotifications, access) {
  return function DashboardStackWrapper() {
    return (
      <Stack.Navigator>
        <Stack.Screen
          name="Main"
          component={DashboardScreen}
          options={({ navigation }) => ({
            ...privateScreenOptions({
              title: 'BX-CONNECT',
              roleLabel,
              unreadNotifications,
              notificationLabel: t('navigation.notifications'),
              navigation,
            }),
            headerBackVisible: false,
          })}
        />
        <Stack.Screen name="NotificationsAccess" component={NotificationsScreen} options={{ ...headerStyle, title: t('navigation.notifications') }} />
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
            options={{ ...headerStyle, title: t('partner.supports') }}
          />
        ) : null}
        {access.referentTools ? (
          <>
            <Stack.Screen
              name="ReferentRequestsAccess"
              component={ReferentRequestsScreen}
              options={{ ...headerStyle, title: t('referentMobile.requestsTitle', { defaultValue: 'Demandes' }) }}
            />
            <Stack.Screen
              name="ReferentMembersAccess"
              component={ReferentMembersScreen}
              options={{ ...headerStyle, title: t('referentMobile.membersTitle', { defaultValue: 'Membres' }) }}
            />
          </>
        ) : null}
        {access.pendingGroups ? (
          <Stack.Screen
            name="AdminPendingGroupsAccess"
            component={AdminPendingGroupsScreen}
            options={{ ...headerStyle, title: t('adminMobile.pendingGroupsTitle', { defaultValue: 'Groupes en attente' }) }}
          />
        ) : null}
      </Stack.Navigator>
    );
  };
}

function makeNetworkStack(title, roleLabel, unreadNotifications) {
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
              roleLabel,
              unreadNotifications,
              notificationLabel: t('navigation.notifications'),
              navigation,
            }),
            headerBackVisible: false,
          })}
        />
        <Stack.Screen name="GroupesAccess" component={GroupesScreen} options={{ ...headerStyle, title: t('navigation.groups') }} />
        <Stack.Screen name="ProjectsAccess" component={ProjectsScreen} options={{ ...headerStyle, title: t('navigation.projects') }} />
        <Stack.Screen name="NotificationsAccess" component={NotificationsScreen} options={{ ...headerStyle, title: t('navigation.notifications') }} />
        {legalScreens(t)}
      </Stack.Navigator>
    );
  };
}

function makeManagementStack(title, roleLabel, unreadNotifications) {
  return function ManagementStackWrapper() {
    const { t } = useTranslation();
    return (
      <Stack.Navigator>
        <Stack.Screen
          name="Main"
          component={ManagementHome}
          options={({ navigation }) => ({
            ...privateScreenOptions({
              title,
              roleLabel,
              unreadNotifications,
              notificationLabel: t('navigation.notifications'),
              navigation,
            }),
            headerBackVisible: false,
          })}
        />
        <Stack.Screen name="UsersAccess" component={AdminUsersScreen} options={{ ...headerStyle, title: t('navigation.users') }} />
        <Stack.Screen name="GroupesAccess" component={GroupesScreen} options={{ ...headerStyle, title: t('navigation.groups') }} />
        <Stack.Screen name="ProjectsAccess" component={ProjectsScreen} options={{ ...headerStyle, title: t('navigation.projects') }} />
        <Stack.Screen name="AdminPendingGroupsAccess" component={AdminPendingGroupsScreen} options={{ ...headerStyle, title: t('adminMobile.pendingGroupsTitle', { defaultValue: 'Groupes en attente' }) }} />
        <Stack.Screen name="NotificationsAccess" component={NotificationsScreen} options={{ ...headerStyle, title: t('navigation.notifications') }} />
        {legalScreens(t)}
      </Stack.Navigator>
    );
  };
}

function NetworkHome({ navigation }) {
  const { t } = useTranslation();

  return (
    <View style={navigatorStyles.hubPage}>
      <Text style={navigatorStyles.hubTitle}>
        {t('navigation.groups', { defaultValue: 'Réseau' })}
      </Text>
      <Text style={navigatorStyles.hubSubtitle}>
        {t('memberDashboard.mobileOverview', {
          defaultValue: 'Retrouvez vos groupes et les projets de la communauté.',
        })}
      </Text>
      <HubLink
        icon="group"
        title={t('navigation.groups')}
        description={t('groups.available_will_appear', { defaultValue: 'Découvrir et suivre les groupes.' })}
        onPress={() => navigation.navigate('GroupesAccess')}
      />
      <HubLink
        icon="project"
        title={t('navigation.projects')}
        description={t('projects.public_will_appear', { defaultValue: 'Découvrir les projets de la communauté.' })}
        onPress={() => navigation.navigate('ProjectsAccess')}
      />
    </View>
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
            description={t('adminMobile.groupsAction', { defaultValue: 'Suivre les groupes et leurs référents.' })}
            onPress={() => navigation.navigate('GroupesAccess')}
          />
          <HubLink
            icon="project"
            title={t('navigation.projects')}
            description={t('adminMobile.projectsAction', { defaultValue: 'Voir les projets suivis par l’association.' })}
            onPress={() => navigation.navigate('ProjectsAccess')}
          />
          <HubLink
            icon="warning"
            title={t('adminMobile.pendingGroupsTitle', { defaultValue: 'Groupes en attente' })}
            description={t('adminMobile.pendingGroupsAction', { defaultValue: 'Valider ou refuser les groupes proposés.' })}
            onPress={() => navigation.navigate('AdminPendingGroupsAccess')}
          />
        </>
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
  const { role, isMembre, isReferent, isAdmin, isSuperAdmin, isPartenaire } = useAuth();
  const { t, i18n } = useTranslation();
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    let cancelled = false;
    api.get('/notifications')
      .then((res) => {
        if (!cancelled) {
          const unread = (res.data || []).filter((notification) => !notification.lue).length;
          setUnreadNotifications(unread);
        }
      })
      .catch(() => {
        if (!cancelled) setUnreadNotifications(0);
      });
    return () => { cancelled = true; };
  }, [isMembre, isReferent, isAdmin, isSuperAdmin, isPartenaire]);

  const roleLabel = role ? t(`roles.${role}`, { defaultValue: role }) : '';
  const communityLabels = getCommunityLabels(i18n.language);
  const DashboardStack = makeDashboardStack(t, roleLabel, unreadNotifications, {
    groups: isAdmin || isReferent,
    projects: isAdmin || isReferent,
    supports: isPartenaire,
    referentTools: isReferent,
    pendingGroups: isAdmin,
  });
  const MemberHomeStack    = makeStack(MemberHomeScreen, 'BX-CONNECT', roleLabel, unreadNotifications);
  const ActivitiesStack    = makeStack(ActivitiesScreen, t('navigation.activities'), roleLabel, unreadNotifications);
  const ProjectsStack      = makeStack(ProjectsScreen, t('navigation.projects'), roleLabel, unreadNotifications);
  const NetworkStack       = makeNetworkStack(communityLabels.network, roleLabel, unreadNotifications);
  const ManagementStack    = makeManagementStack(communityLabels.management, roleLabel, unreadNotifications);
  const MessagerieStack    = makeStack(MessagerieScreen, t('navigation.messaging'), roleLabel, unreadNotifications);
  const NotificationsStack = makeStack(NotificationsScreen, t('navigation.notifications'), roleLabel, unreadNotifications);
  const ProfileStack       = makeStack(ProfileScreen, t('navigation.profile'), roleLabel, unreadNotifications);

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
      NetworkStack,
      ManagementStack,
      MessagerieStack,
      NotificationsStack,
      ProfileStack,
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
          paddingTop: 5,
          paddingBottom: 5,
          height: 64,
          shadowColor: '#111827',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.04,
          shadowRadius: 6,
          elevation: 4,
        },
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: '#64748B',
        tabBarHideOnKeyboard: true,
        tabBarItemStyle: { minHeight: 54 },
        tabBarLabel: ({ color, children }) => (
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.9}
            style={{
              color,
              fontSize: 11,
              lineHeight: 14,
              fontWeight: '600',
              maxWidth: 74,
              textAlign: 'center',
              marginTop: 1,
            }}
          >
            {children}
          </Text>
        ),
      }}
    >
      {tabs.map((tab) => (
        <Tab.Screen
          key={tab.name}
          name={tab.name}
          component={tab.component}
          options={{
            tabBarLabel: tab.label,
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
            tabBarIcon: ({ color, focused }) => (
              <View style={{
                width: 40,
                height: 28,
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: focused ? '#EFF6FF' : 'transparent',
              }}>
                <AppIcon name={tab.icon} size={focused ? 22 : 21} color={color} />
              </View>
            ),
          }}
        />
      ))}
    </Tab.Navigator>
  );
}

function getTabsForRole({ isMembre, isReferent, isAdmin, isSuperAdmin, isPartenaire, t, stacks, labels }) {
  if (isSuperAdmin || isAdmin) {
    return [
      tab('TabDashboard', t('navigation.home'), 'home', stacks.DashboardStack),
      tab('TabUsers', labels.management, 'shield', stacks.ManagementStack),
      tab('TabActivities', t('navigation.activities'), 'activity', stacks.ActivitiesStack),
      tab('TabNotifications', t('navigation.notifications'), 'bell', stacks.NotificationsStack),
      tab('TabProfile', t('navigation.profile'), 'profile', stacks.ProfileStack),
    ];
  }

  if (isPartenaire) {
    return [
      tab('TabDashboard', t('navigation.home'), 'home', stacks.DashboardStack),
      tab('TabProjects', t('navigation.projects'), 'project', stacks.ProjectsStack),
      tab('TabActivities', t('navigation.activities'), 'activity', stacks.ActivitiesStack),
      tab('TabNotifications', t('navigation.notifications'), 'bell', stacks.NotificationsStack),
      tab('TabProfile', t('navigation.profile'), 'profile', stacks.ProfileStack),
    ];
  }

  if (isReferent) {
    return [
      tab('TabDashboard', t('navigation.home'), 'home', stacks.DashboardStack),
      tab('TabGroupes', labels.network, 'group', stacks.NetworkStack),
      tab('TabActivities', t('navigation.activities'), 'activity', stacks.ActivitiesStack),
      tab('TabMessagerie', t('navigation.messages'), 'message', stacks.MessagerieStack),
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
    padding: 16,
  },
  hubTitle: {
    color: '#111827',
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    marginTop: 4,
  },
  hubSubtitle: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
    marginBottom: 16,
  },
  hubLink: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.035,
    shadowRadius: 5,
    elevation: 1,
  },
  hubIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
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
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },
  hubLinkDescription: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 19,
    marginTop: 2,
  },
};

// ─── Navigateur principal ─────────────────────────────────────────────────────
export default function AppNavigator() {
  const { isAuthenticated, loading, sessionExpired } = useAuth();

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
        : <PublicStack initialRouteName={sessionExpired ? 'Login' : 'Home'} />}
    </NavigationContainer>
  );
}
