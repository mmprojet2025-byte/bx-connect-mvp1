import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator, Alert
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();

  const [form, setForm] = useState({ email: '', motDePasse: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');

    // Validation basique
    if (!form.email.trim() || !form.motDePasse.trim()) {
      setError('Veuillez remplir tous les champs.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/login', {
        email: form.email.trim(),
        motDePasse: form.motDePasse,
      });

      const { token, prenom, nom, email, role } = res.data;
      await login(token, { prenom, nom, email, role });

      // Navigation automatique via AppNavigator (isAuthenticated → PrivateStack)
    } catch (err) {
      const message = err.response?.data?.message || 'Email ou mot de passe incorrect.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Logo / Titre */}
      <View style={styles.header}>
        <Text style={styles.logo}>BX-CONNECT</Text>
        <Text style={styles.subtitle}>Connecte-toi à ton espace</Text>
      </View>

      {/* Carte formulaire */}
      <View style={styles.card}>

        {/* Erreur */}
        {error !== '' && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>❌ {error}</Text>
          </View>
        )}

        {/* Email */}
        <View style={styles.field}>
          <Text style={styles.label}>Adresse e-mail</Text>
          <TextInput
            style={styles.input}
            placeholder="ton@email.com"
            placeholderTextColor="#94a3b8"
            value={form.email}
            onChangeText={(val) => setForm({ ...form, email: val })}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Mot de passe */}
        <View style={styles.field}>
          <Text style={styles.label}>Mot de passe</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#94a3b8"
            value={form.motDePasse}
            onChangeText={(val) => setForm({ ...form, motDePasse: val })}
            secureTextEntry
            autoCapitalize="none"
          />
        </View>

        {/* Bouton connexion */}
        <TouchableOpacity
          style={[styles.btnLogin, loading && styles.btnDisabled]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnLoginText}>Se connecter</Text>
          )}
        </TouchableOpacity>

        {/* Lien vers activités sans connexion */}
        <TouchableOpacity
          style={styles.linkBtn}
          onPress={() => navigation.navigate('Activities')}
        >
          <Text style={styles.linkText}>
            Voir les activités sans se connecter →
          </Text>
        </TouchableOpacity>

      </View>

      {/* Retour accueil */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => navigation.navigate('Home')}
      >
        <Text style={styles.backText}>← Retour à l'accueil</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4f8',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 40,
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e3a5f',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 6,
  },

  // Carte
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },

  // Erreur
  errorBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 13,
  },

  // Champs
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1e293b',
    backgroundColor: '#f8fafc',
  },

  // Bouton connexion
  btnLogin: {
    backgroundColor: '#1e3a5f',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: {
    backgroundColor: '#94a3b8',
  },
  btnLoginText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },

  // Lien
  linkBtn: {
    marginTop: 16,
    alignItems: 'center',
  },
  linkText: {
    color: '#2563eb',
    fontSize: 13,
  },

  // Retour
  backBtn: {
    marginTop: 20,
    alignItems: 'center',
  },
  backText: {
    color: '#64748b',
    fontSize: 13,
  },
});