import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import { ActivityIndicator, View, TouchableOpacity, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

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

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

const headerStyle = {
  headerStyle: { backgroundColor: '#1e3a5f' },
  headerTintColor: '#fff',
  headerTitleStyle: { fontWeight: 'bold' },
};

// ─── Bouton déconnexion dans le header ───────────────────────────────────────
function LogoutButton({ onPress, label }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ marginRight: 4 }}>
      <Text style={{ color: '#fca5a5', fontWeight: '600', fontSize: 14 }}>
        🚪 {label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Stack public ─────────────────────────────────────────────────────────────
function PublicStack() {
  const { t } = useTranslation();

  return (
    <Stack.Navigator screenOptions={headerStyle}>
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

// ─── Tab Navigator privé ─────────────────────────────────────────────────────
function PrivateTabs() {
  const { logout, isMembre, isReferent, isAdmin, isSuperAdmin } = useAuth();
  const { t } = useTranslation();
  const logoutLabel = t('navigation.logout');

  const DashboardStack     = makeStack(DashboardScreen,     t('navigation.dashboard'),      logout, logoutLabel);
  const ActivitiesStack    = makeStack(ActivitiesScreen,    t('navigation.activities'),     logout, logoutLabel);
  const ProjectsStack      = makeStack(ProjectsScreen,      t('navigation.projects'),       logout, logoutLabel);
  const GroupesStack       = makeStack(GroupesScreen,       t('navigation.groups'),         logout, logoutLabel);
  const MesGroupesStack    = makeStack(GroupesScreen,       t('navigation.myGroups'),       logout, logoutLabel);
  const MessagerieStack    = makeStack(MessagerieScreen,    t('navigation.messaging'),      logout, logoutLabel);
  const NotificationsStack = makeStack(NotificationsScreen, t('navigation.notifications'),  logout, logoutLabel);
  const ProfileStack       = makeStack(ProfileScreen,       t('navigation.profile'),        logout, logoutLabel);

  const tabs = getTabsForRole({
    isMembre,
    isReferent,
    isAdmin,
    isSuperAdmin,
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
    },
  });

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1e3a5f',
          borderTopColor: '#2d4f7c',
          paddingBottom: 4,
          height: 58,
        },
        tabBarActiveTintColor: '#fff',
        tabBarInactiveTintColor: '#93c5fd',
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
      }}
    >
      {tabs.map((tab) => (
        <Tab.Screen
          key={tab.name}
          name={tab.name}
          component={tab.component}
          options={{
            tabBarLabel: tab.label,
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>{tab.icon}</Text>,
          }}
        />
      ))}
    </Tab.Navigator>
  );
}

function getTabsForRole({ isMembre, isReferent, isAdmin, isSuperAdmin, t, stacks }) {
  if (isSuperAdmin) {
    return [
      tab('TabDashboard', t('navigation.dashboard'), '🏠', stacks.DashboardStack),
      tab('TabProfile', t('navigation.profile'), '👤', stacks.ProfileStack),
    ];
  }

  if (isAdmin) {
    return [
      tab('TabDashboard', t('navigation.dashboard'), '🏠', stacks.DashboardStack),
      tab('TabNotifications', t('navigation.alerts'), '🔔', stacks.NotificationsStack),
      tab('TabProfile', t('navigation.profile'), '👤', stacks.ProfileStack),
    ];
  }

  if (isReferent) {
    return [
      tab('TabDashboard', t('navigation.dashboard'), '🏠', stacks.DashboardStack),
      tab('TabGroupes', t('navigation.myGroups'), '👥', stacks.MesGroupesStack),
      tab('TabActivities', t('navigation.activities'), '🎯', stacks.ActivitiesStack),
      tab('TabMessagerie', t('navigation.messages'), '💬', stacks.MessagerieStack),
      tab('TabNotifications', t('navigation.alerts'), '🔔', stacks.NotificationsStack),
      tab('TabProfile', t('navigation.profile'), '👤', stacks.ProfileStack),
    ];
  }

  if (isMembre) {
    return [
      tab('TabDashboard', t('navigation.dashboard'), '🏠', stacks.DashboardStack),
      tab('TabActivities', t('navigation.activities'), '🎯', stacks.ActivitiesStack),
      tab('TabGroupes', t('navigation.groups'), '👥', stacks.GroupesStack),
      tab('TabProjects', t('navigation.projects'), '🚀', stacks.ProjectsStack),
      tab('TabMessagerie', t('navigation.messages'), '💬', stacks.MessagerieStack),
      tab('TabProfile', t('navigation.profile'), '👤', stacks.ProfileStack),
    ];
  }

  return [
    tab('TabDashboard', t('navigation.dashboard'), '🏠', stacks.DashboardStack),
    tab('TabProfile', t('navigation.profile'), '👤', stacks.ProfileStack),
  ];
}

function tab(name, label, icon, component) {
  return { name, label, icon, component };
}

// ─── Navigateur principal ─────────────────────────────────────────────────────
export default function AppNavigator() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f4f8' }}>
        <ActivityIndicator size="large" color="#1e3a5f" />
      </View>
    );
  }

  return (
    <NavigationContainer key={isAuthenticated ? 'private' : 'public'}>
      {isAuthenticated ? <PrivateTabs /> : <PublicStack />}
    </NavigationContainer>
  );
}
