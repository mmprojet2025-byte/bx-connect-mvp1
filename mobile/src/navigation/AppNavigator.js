import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { ActivityIndicator, View } from 'react-native';

import HomeScreen      from '../screens/HomeScreen';
import LoginScreen     from '../screens/LoginScreen';
import ActivitiesScreen from '../screens/ActivitiesScreen';

const Stack = createNativeStackNavigator();

// ─── Stack public (visiteur non connecté) ────────────────────────────────────
function PublicStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#1e3a5f' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: 'BX-CONNECT' }}
      />
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ title: 'Connexion' }}
      />
      <Stack.Screen
        name="Activities"
        component={ActivitiesScreen}
        options={{ title: 'Activités' }}
      />
    </Stack.Navigator>
  );
}

// ─── Stack privé (membre connecté) ───────────────────────────────────────────
function PrivateStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#1e3a5f' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen
        name="Activities"
        component={ActivitiesScreen}
        options={{ title: 'Activités' }}
      />
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: 'BX-CONNECT' }}
      />
    </Stack.Navigator>
  );
}

// ─── Navigateur principal ─────────────────────────────────────────────────────
export default function AppNavigator() {
  const { isAuthenticated, loading } = useAuth();

  // Affiche un spinner pendant le chargement du token depuis AsyncStorage
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f4f8' }}>
        <ActivityIndicator size="large" color="#1e3a5f" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <PrivateStack /> : <PublicStack />}
    </NavigationContainer>
  );
}