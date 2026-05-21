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
import PaymentScreen           from '../screens/PaymentScreen';
import PaymentHistoryScreen    from '../screens/PaymentHistoryScreen';
import AnnoncesScreen          from '../screens/AnnoncesScreen';
import PrestationsMobileScreen from '../screens/PrestationsMobileScreen';

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
  const { logout } = useAuth();

  const DashboardStack     = makeStack(DashboardScreen,     'Tableau de bord', logout);
  const ActivitiesStack    = makeStack(ActivitiesScreen,    'Activités',        logout);
  const ProjectsStack      = makeStack(ProjectsScreen,      'Projets',          logout);
  const GroupesStack       = makeStack(GroupesScreen,       'Groupes',          logout);
  const MessagerieStack    = makeStack(MessagerieScreen,    'Messagerie',       logout);
  const NotificationsStack  = makeStack(NotificationsScreen,  'Notifications',    logout);
  const PaymentStack        = makeStack(PaymentScreen,        'Paiement',         logout);
  const PaymentHistoryStack    = makeStack(PaymentHistoryScreen,    'Mes paiements',  logout);
  const AnnoncesStack          = makeStack(AnnoncesScreen,          'Annonces',       logout);
  const PrestationsStack       = makeStack(PrestationsMobileScreen, 'Bénévolat',      logout);
  const ProfileStack           = makeStack(ProfileScreen,           'Mon profil',     logout);

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
      <Tab.Screen
        name="TabDashboard"
        component={DashboardStack}
        options={{ tabBarLabel: 'Accueil', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🏠</Text> }}
      />
      <Tab.Screen
        name="TabActivities"
        component={ActivitiesStack}
        options={{ tabBarLabel: 'Activités', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🎯</Text> }}
      />
      <Tab.Screen
        name="TabProjects"
        component={ProjectsStack}
        options={{ tabBarLabel: 'Projets', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🚀</Text> }}
      />
      <Tab.Screen
        name="TabGroupes"
        component={GroupesStack}
        options={{ tabBarLabel: 'Groupes', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>👥</Text> }}
      />
      <Tab.Screen
        name="TabMessagerie"
        component={MessagerieStack}
        options={{ tabBarLabel: 'Messages', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>💬</Text> }}
      />
      <Tab.Screen
        name="TabNotifications"
        component={NotificationsStack}
        options={{ tabBarLabel: 'Alertes', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🔔</Text> }}
      />
      <Tab.Screen
        name="TabAnnonces"
        component={AnnoncesStack}
        options={{ tabBarLabel: 'Annonces', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📢</Text> }}
      />
      <Tab.Screen
        name="TabPrestations"
        component={PrestationsStack}
        options={{ tabBarLabel: 'Bénévolat', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🤝</Text> }}
      />
      <Tab.Screen
        name="TabPayments"
        component={PaymentHistoryStack}
        options={{ tabBarLabel: 'Paiements', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>💳</Text> }}
      />
      <Tab.Screen
        name="TabProfile"
        component={ProfileStack}
        options={{ tabBarLabel: 'Profil', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>👤</Text> }}
      />
    </Tab.Navigator>
  );
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