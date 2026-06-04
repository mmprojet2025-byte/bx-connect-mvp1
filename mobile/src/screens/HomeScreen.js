import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function HomeScreen({ navigation }) {
  const { isAuthenticated, user } = useAuth();

  const goToPublicOrLogin = (screenName) => {
    if (screenName === 'Activities' || screenName === 'Groupes') {
      navigation.navigate(screenName);
      return;
    }
    navigation.navigate('Login');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Hero */}
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>BX-CONNECT</Text>
        <Text style={styles.heroSubtitle}>
          La plateforme numérique des jeunes et associations de Bruxelles
        </Text>

        <View style={styles.heroButtons}>
          {isAuthenticated ? (
            <TouchableOpacity
              style={styles.btnPrimary}
              onPress={() => navigation.navigate('Activities')}
            >
              <Text style={styles.btnPrimaryText}>🎯 Voir les activités</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                style={styles.btnPrimary}
                onPress={() => navigation.navigate('Login')}
              >
                <Text style={styles.btnPrimaryText}>Se connecter</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnSecondary}
                onPress={() => navigation.navigate('Activities')}
              >
                <Text style={styles.btnSecondaryText}>🎯 Voir les activités</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Message de bienvenue si connecté */}
      {isAuthenticated && (
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeText}>
            👋 Bonjour, <Text style={styles.welcomeName}>{user?.prenom}</Text> !
          </Text>
          <Text style={styles.welcomeRole}>Rôle : {user?.role}</Text>
        </View>
      )}

      {/* Fonctionnalités */}
      <Text style={styles.sectionTitle}>Ce que tu peux faire</Text>

      <View style={styles.featuresGrid}>
        <FeatureCard
          icon="🎯"
          title="Activités"
          description="Découvre et inscris-toi aux activités organisées par Bx-Jeunes Impact."
          onPress={() => navigation.navigate('Activities')}
        />
        <FeatureCard
          icon="🚀"
          title="Projets"
          description="Propose ou rejoins des projets collaboratifs avec d'autres membres."
          onPress={() => goToPublicOrLogin('Projects')}
        />
        <FeatureCard
          icon="👥"
          title="Groupes"
          description="Rejoins des groupes et échange avec d'autres membres."
          onPress={() => navigation.navigate('Groupes')}
        />
        <FeatureCard
          icon="💬"
          title="Messagerie"
          description="Communique avec les membres de ton groupe."
          onPress={() => navigation.navigate('Login')}
        />
      </View>

    </ScrollView>
  );
}

function FeatureCard({ icon, title, description, onPress }) {
  return (
    <TouchableOpacity
      style={styles.featureCard}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <Text style={styles.featureIcon}>{icon}</Text>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureDesc}>{description}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    paddingBottom: 40,
  },

  // Hero
  hero: {
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 40,
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    letterSpacing: 1,
  },
  heroSubtitle: {
    fontSize: 15,
    color: '#93c5fd',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
    maxWidth: 300,
  },
  heroButtons: {
    gap: 12,
    width: '100%',
    maxWidth: 300,
  },
  btnPrimary: {
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 50,
    alignItems: 'center',
  },
  btnPrimaryText: {
    color: '#1E3A8A',
    fontWeight: 'bold',
    fontSize: 15,
  },
  btnSecondary: {
    borderWidth: 2,
    borderColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 50,
    alignItems: 'center',
  },
  btnSecondaryText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },

  // Welcome card
  welcomeCard: {
    backgroundColor: '#E0F2FE',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#38BDF8',
  },
  welcomeText: {
    fontSize: 16,
    color: '#1E3A8A',
  },
  welcomeName: {
    fontWeight: 'bold',
  },
  welcomeRole: {
    fontSize: 13,
    color: '#3b82f6',
    marginTop: 4,
  },

  // Section
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E3A8A',
    marginHorizontal: 16,
    marginTop: 28,
    marginBottom: 16,
  },

  // Features
  featuresGrid: {
    paddingHorizontal: 16,
    gap: 12,
  },
  featureCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  featureIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E3A8A',
    marginBottom: 6,
  },
  featureDesc: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
});
