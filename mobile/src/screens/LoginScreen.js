import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator
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
      // AppNavigator bascule automatiquement vers PrivateStack
    } catch (err) {
      setError(err.response?.data?.message || 'Email ou mot de passe incorrect.');
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
      {/* Logo */}
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
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnLoginText}>Se connecter</Text>
          }
        </TouchableOpacity>

        {/* ✅ Séparateur */}
        <View style={styles.separator}>
          <View style={styles.separatorLine} />
          <Text style={styles.separatorText}>ou</Text>
          <View style={styles.separatorLine} />
        </View>

        {/* ✅ Bouton créer un compte — bien visible */}
        <TouchableOpacity
          style={styles.btnRegister}
          onPress={() => navigation.navigate('Register')}
          activeOpacity={0.8}
        >
          <Text style={styles.btnRegisterText}>✨ Créer un compte gratuitement</Text>
        </TouchableOpacity>

      </View>

      {/* Lien voir activités sans connexion */}
      <TouchableOpacity
        style={styles.linkBtn}
        onPress={() => navigation.navigate('Activities')}
      >
        <Text style={styles.linkText}>
          Voir les activités sans se connecter →
        </Text>
      </TouchableOpacity>

      {/* Retour accueil */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => navigation.navigate('Home')}
      >
        <Text style={styles.backText}>{"← Retour à l'accueil"}</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  content: { paddingHorizontal: 20, paddingTop: 40, paddingBottom: 40 },

  header: { alignItems: 'center', marginBottom: 32 },
  logo: { fontSize: 28, fontWeight: 'bold', color: '#1e3a5f', letterSpacing: 1 },
  subtitle: { fontSize: 14, color: '#64748b', marginTop: 6 },

  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 3,
  },

  errorBox: {
    backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca',
    borderRadius: 12, padding: 12, marginBottom: 16,
  },
  errorText: { color: '#dc2626', fontSize: 13 },

  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#d1d5db', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12, fontSize: 15,
    color: '#1e293b', backgroundColor: '#f8fafc',
  },

  btnLogin: {
    backgroundColor: '#1e3a5f', paddingVertical: 14,
    borderRadius: 12, alignItems: 'center', marginTop: 4,
  },
  btnDisabled: { backgroundColor: '#94a3b8' },
  btnLoginText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  // ✅ Séparateur visuel
  separator: {
    flexDirection: 'row', alignItems: 'center',
    marginVertical: 20,
  },
  separatorLine: { flex: 1, height: 1, backgroundColor: '#e2e8f0' },
  separatorText: { marginHorizontal: 12, color: '#94a3b8', fontSize: 13 },

  // ✅ Bouton Register bien visible
  btnRegister: {
    backgroundColor: '#eff6ff', borderWidth: 2, borderColor: '#bfdbfe',
    paddingVertical: 13, borderRadius: 12, alignItems: 'center',
  },
  btnRegisterText: { color: '#1e3a5f', fontWeight: '700', fontSize: 15 },

  linkBtn: { marginTop: 20, alignItems: 'center' },
  linkText: { color: '#2563eb', fontSize: 13 },

  backBtn: { marginTop: 12, alignItems: 'center' },
  backText: { color: '#64748b', fontSize: 13 },
});
