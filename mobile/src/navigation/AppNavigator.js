import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import { ActivityIndicator, View, TouchableOpacity, Text } from 'react-native';

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
function LogoutButton({ onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ marginRight: 4 }}>
      <Text style={{ color: '#fca5a5', fontWeight: '600', fontSize: 14 }}>
        🚪 Déco
      </Text>
    </TouchableOpacity>
  );
}

// ─── Stack public ─────────────────────────────────────────────────────────────
function PublicStack() {
  return (
    <Stack.Navigator screenOptions={headerStyle}>
      <Stack.Screen name="Home"       component={HomeScreen}      options={{ title: 'BX-CONNECT', headerBackVisible: false }} />
      <Stack.Screen name="Login"      component={LoginScreen}     options={{ title: 'Connexion' }} />
      <Stack.Screen name="Register"   component={RegisterScreen}  options={{ title: 'Créer un compte' }} />
      <Stack.Screen name="Activities" component={ActivitiesScreen} options={{ title: 'Activités' }} />
      <Stack.Screen name="Groupes"    component={GroupesScreen}    options={{ title: 'Groupes' }} />
    </Stack.Navigator>
  );
}

// ─── Stacks privés (un par onglet) ───────────────────────────────────────────
function makeStack(ScreenComponent, title, logout) {
  return function StackWrapper() {
    return (
      <Stack.Navigator screenOptions={{
        ...headerStyle,
        headerRight: () => <LogoutButton onPress={logout} />,
      }}>
        <Stack.Screen
          name={`${title}Main`}
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

  const DashboardStack     = makeStack(DashboardScreen,     'Tableau de bord', logout);
  const ActivitiesStack    = makeStack(ActivitiesScreen,    'Activités',        logout);
  const ProjectsStack      = makeStack(ProjectsScreen,      'Projets',          logout);
  const GroupesStack       = makeStack(GroupesScreen,       'Groupes',          logout);
  const MesGroupesStack    = makeStack(GroupesScreen,       'Mes groupes',      logout);
  const MessagerieStack    = makeStack(MessagerieScreen,    'Messagerie',       logout);
  const NotificationsStack  = makeStack(NotificationsScreen,  'Notifications',    logout);
  const ProfileStack           = makeStack(ProfileScreen,           'Mon profil',     logout);

  const tabs = getTabsForRole({
    isMembre,
    isReferent,
    isAdmin,
    isSuperAdmin,
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

function getTabsForRole({ isMembre, isReferent, isAdmin, isSuperAdmin, stacks }) {
  if (isSuperAdmin) {
    return [
      tab('TabDashboard', 'Dashboard', '🏠', stacks.DashboardStack),
      tab('TabProfile', 'Profil', '👤', stacks.ProfileStack),
    ];
  }

  if (isAdmin) {
    return [
      tab('TabDashboard', 'Dashboard', '🏠', stacks.DashboardStack),
      tab('TabNotifications', 'Alertes', '🔔', stacks.NotificationsStack),
      tab('TabProfile', 'Profil', '👤', stacks.ProfileStack),
    ];
  }

  if (isReferent) {
    return [
      tab('TabDashboard', 'Dashboard', '🏠', stacks.DashboardStack),
      tab('TabGroupes', 'Mes groupes', '👥', stacks.MesGroupesStack),
      tab('TabActivities', 'Activités', '🎯', stacks.ActivitiesStack),
      tab('TabMessagerie', 'Messages', '💬', stacks.MessagerieStack),
      tab('TabNotifications', 'Alertes', '🔔', stacks.NotificationsStack),
      tab('TabProfile', 'Profil', '👤', stacks.ProfileStack),
    ];
  }

  if (isMembre) {
    return [
      tab('TabDashboard', 'Dashboard', '🏠', stacks.DashboardStack),
      tab('TabActivities', 'Activités', '🎯', stacks.ActivitiesStack),
      tab('TabGroupes', 'Groupes', '👥', stacks.GroupesStack),
      tab('TabProjects', 'Projets', '🚀', stacks.ProjectsStack),
      tab('TabMessagerie', 'Messages', '💬', stacks.MessagerieStack),
      tab('TabProfile', 'Profil', '👤', stacks.ProfileStack),
    ];
  }

  return [
    tab('TabDashboard', 'Dashboard', '🏠', stacks.DashboardStack),
    tab('TabProfile', 'Profil', '👤', stacks.ProfileStack),
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
