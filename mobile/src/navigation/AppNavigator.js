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

// ─── Écrans privés ────────────────────────────────────────────────────────────
import DashboardScreen     from '../screens/DashboardScreen';
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
  headerStyle: { backgroundColor: '#1E3A8A' },
  headerTintColor: '#fff',
  headerTitleStyle: { fontWeight: 'bold' },
};

// ─── Bouton déconnexion dans le header ───────────────────────────────────────
function LogoutButton({ onPress, label }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ marginRight: 4, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <AppIcon name="logout" size={16} color="#fca5a5" />
      <Text style={{ color: '#fca5a5', fontWeight: '600', fontSize: 14 }}>
        {label}
      </Text>
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
    </Stack.Navigator>
  );
}

// ─── Stacks privés (un par onglet) ───────────────────────────────────────────
function makeStack(ScreenComponent, title, logout, logoutLabel) {
  return function StackWrapper() {
    return (
      <Stack.Navigator screenOptions={{
        ...headerStyle,
        headerRight: () => <LogoutButton onPress={logout} label={logoutLabel} />,
      }}>
        <Stack.Screen
          name="Main"
          component={ScreenComponent}
          options={{ title, headerBackVisible: false }}
        />
      </Stack.Navigator>
    );
  };
}

function makeDashboardStack(logout, logoutLabel, t) {
  return function DashboardStackWrapper() {
    return (
      <Stack.Navigator screenOptions={{
        ...headerStyle,
        headerRight: () => <LogoutButton onPress={logout} label={logoutLabel} />,
      }}>
        <Stack.Screen
          name="Main"
          component={DashboardScreen}
          options={{ title: t('navigation.home'), headerBackVisible: false }}
        />
        <Stack.Screen
          name="GroupesAccess"
          component={GroupesScreen}
          options={{ title: t('navigation.groups') }}
        />
        <Stack.Screen
          name="ProjectsAccess"
          component={ProjectsScreen}
          options={{ title: t('navigation.projects') }}
        />
        <Stack.Screen
          name="SupportsAccess"
          component={PartnerSupportsScreen}
          options={{ title: t('partner.supports') }}
        />
        <Stack.Screen
          name="ReferentRequestsAccess"
          component={ReferentRequestsScreen}
          options={{ title: t('referentMobile.requestsTitle', { defaultValue: 'Demandes' }) }}
        />
        <Stack.Screen
          name="ReferentMembersAccess"
          component={ReferentMembersScreen}
          options={{ title: t('referentMobile.membersTitle', { defaultValue: 'Membres' }) }}
        />
        <Stack.Screen
          name="AdminPendingGroupsAccess"
          component={AdminPendingGroupsScreen}
          options={{ title: t('adminMobile.pendingGroupsTitle', { defaultValue: 'Groupes en attente' }) }}
        />
      </Stack.Navigator>
    );
  };
}

// ─── Tab Navigator privé ─────────────────────────────────────────────────────
function PrivateTabs() {
  const { logout, isMembre, isReferent, isAdmin, isSuperAdmin, isPartenaire } = useAuth();
  const { t } = useTranslation();
  const logoutLabel = t('navigation.logout');
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

  const DashboardStack     = makeDashboardStack(logout, logoutLabel, t);
  const ActivitiesStack    = makeStack(ActivitiesScreen,    t('navigation.activities'),     logout, logoutLabel);
  const ProjectsStack      = makeStack(ProjectsScreen,      t('navigation.projects'),       logout, logoutLabel);
  const GroupesStack       = makeStack(GroupesScreen,       t('navigation.groups'),         logout, logoutLabel);
  const MesGroupesStack    = makeStack(GroupesScreen,       t('navigation.myGroups'),       logout, logoutLabel);
  const MessagerieStack    = makeStack(MessagerieScreen,    t('navigation.messaging'),      logout, logoutLabel);
  const NotificationsStack = makeStack(NotificationsScreen, t('navigation.notifications'),  logout, logoutLabel);
  const ProfileStack       = makeStack(ProfileScreen,       t('navigation.profile'),        logout, logoutLabel);
  const AdminUsersStack     = makeStack(AdminUsersScreen,    t('navigation.users'),          logout, logoutLabel);
  const PartnerSupportsStack = makeStack(PartnerSupportsScreen, t('partner.supports'),       logout, logoutLabel);

  const tabs = getTabsForRole({
    isMembre,
    isReferent,
    isAdmin,
    isSuperAdmin,
    isPartenaire,
    t,
    stacks: {
      DashboardStack,
      ActivitiesStack,
      ProjectsStack,
      GroupesStack,
      MesGroupesStack,
      MessagerieStack,
      NotificationsStack,
      ProfileStack,
      AdminUsersStack,
      PartnerSupportsStack,
    },
  });

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#e2e8f0',
          borderTopWidth: 1,
          paddingTop: 3,
          paddingBottom: 2,
          height: 54,
          shadowColor: '#0f172a',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.06,
          shadowRadius: 10,
          elevation: 8,
        },
        tabBarActiveTintColor: '#1E3A8A',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarHideOnKeyboard: true,
        tabBarLabel: ({ color, children }) => (
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.72}
            style={{
              color,
              fontSize: 9,
              fontWeight: '800',
              maxWidth: 74,
              textAlign: 'center',
              marginTop: 0,
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
            tabBarBadge: tab.name === 'TabNotifications' && unreadNotifications > 0
              ? unreadNotifications
              : undefined,
            tabBarBadgeStyle: {
              backgroundColor: '#EF4444',
              color: '#fff',
              fontSize: 10,
              fontWeight: '900',
            },
            tabBarIcon: ({ color, focused }) => (
              <View style={{
                width: 36,
                height: 26,
                borderRadius: 13,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: focused ? '#E0F2FE' : 'transparent',
              }}>
                <AppIcon name={tab.icon} size={focused ? 21 : 20} color={color} />
              </View>
            ),
          }}
        />
      ))}
    </Tab.Navigator>
  );
}

function getTabsForRole({ isMembre, isReferent, isAdmin, isSuperAdmin, isPartenaire, t, stacks }) {
  if (isSuperAdmin) {
    return [
      tab('TabDashboard', t('navigation.home'), 'home', stacks.DashboardStack),
      tab('TabUsers', t('navigation.users'), 'group', stacks.AdminUsersStack),
      tab('TabNotifications', t('navigation.notifications'), 'bell', stacks.NotificationsStack),
      tab('TabProfile', t('navigation.profile'), 'profile', stacks.ProfileStack),
    ];
  }

  if (isAdmin) {
    return [
      tab('TabDashboard', t('navigation.home'), 'home', stacks.DashboardStack),
      tab('TabUsers', t('navigation.users'), 'group', stacks.AdminUsersStack),
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
      tab('TabActivities', t('navigation.activities'), 'activity', stacks.ActivitiesStack),
      tab('TabMessagerie', t('navigation.messages'), 'message', stacks.MessagerieStack),
      tab('TabNotifications', t('navigation.notifications'), 'bell', stacks.NotificationsStack),
      tab('TabProfile', t('navigation.profile'), 'profile', stacks.ProfileStack),
    ];
  }

  if (isMembre) {
    return [
      tab('TabDashboard', t('navigation.home'), 'home', stacks.DashboardStack),
      tab('TabActivities', t('navigation.activities'), 'activity', stacks.ActivitiesStack),
      tab('TabMessagerie', t('navigation.messages'), 'message', stacks.MessagerieStack),
      tab('TabNotifications', t('navigation.notifications'), 'bell', stacks.NotificationsStack),
      tab('TabProfile', t('navigation.profile'), 'profile', stacks.ProfileStack),
    ];
  }

  return [
    tab('TabDashboard', t('navigation.home'), 'home', stacks.DashboardStack),
    tab('TabProfile', t('navigation.profile'), 'profile', stacks.ProfileStack),
  ];
}

function tab(name, label, icon, component) {
  return { name, label, icon, component };
}

// ─── Navigateur principal ─────────────────────────────────────────────────────
export default function AppNavigator() {
  const { isAuthenticated, loading, sessionExpired } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' }}>
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
