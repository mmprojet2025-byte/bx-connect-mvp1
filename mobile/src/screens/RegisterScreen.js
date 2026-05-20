import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const ROLES = [
  { value: 'MEMBRE',     label: '👤 Membre',    desc: 'Je suis un jeune ou un bénévole' },
  { value: 'PARTENAIRE', label: '🤝 Partenaire', desc: 'Je représente une organisation' },
];

export default function RegisterScreen({ navigation }) {
  const { login } = useAuth();

  const [form, setForm] = useState({
    prenom: '',
    nom: '',
    email: '',
    motDePasse: '',
    confirmation: '',
    role: 'MEMBRE',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    setError('');

    // Validation
    if (!form.prenom.trim() || !form.nom.trim() || !form.email.trim() || !form.motDePasse.trim()) {
      setError('Veuillez remplir tous les champs obligatoires.');
      return;
    }
    if (form.motDePasse !== form.confirmation) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    if (form.motDePasse.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/register', {
        prenom: form.prenom.trim(),
        nom: form.nom.trim(),
        email: form.email.trim(),
        motDePasse: form.motDePasse,
        role: form.role,
      });

      const { token, prenom, nom, email, role } = res.data;
      await login(token, { prenom, nom, email, role });
      // AppNavigator redirige automatiquement vers PrivateStack
    } catch (err) {
      setError(err.response?.data?.message || "Erreur lors de l'inscription.");
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
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>BX-CONNECT</Text>
        <Text style={styles.subtitle}>Crée ton compte gratuitement</Text>
      </View>

      {/* Carte formulaire */}
      <View style={styles.card}>

        {/* Erreur */}
        {error !== '' && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>❌ {error}</Text>
          </View>
        )}

        {/* Prénom + Nom */}
        <View style={styles.row}>
          <View style={[styles.field, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>Prénom *</Text>
            <TextInput
              style={styles.input}
              placeholder="Jean"
              placeholderTextColor="#94a3b8"
              value={form.prenom}
              onChangeText={(val) => setForm({ ...form, prenom: val })}
              autoCapitalize="words"
            />
          </View>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>Nom *</Text>
            <TextInput
              style={styles.input}
              placeholder="Dupont"
              placeholderTextColor="#94a3b8"
              value={form.nom}
              onChangeText={(val) => setForm({ ...form, nom: val })}
              autoCapitalize="words"
            />
          </View>
        </View>

        {/* Email */}
        <View style={styles.field}>
          <Text style={styles.label}>Adresse e-mail *</Text>
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
          <Text style={styles.label}>Mot de passe *</Text>
          <TextInput
            style={styles.input}
            placeholder="Minimum 6 caractères"
            placeholderTextColor="#94a3b8"
            value={form.motDePasse}
            onChangeText={(val) => setForm({ ...form, motDePasse: val })}
            secureTextEntry
            autoCapitalize="none"
          />
        </View>

        {/* Confirmation */}
        <View style={styles.field}>
          <Text style={styles.label}>Confirmer le mot de passe *</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#94a3b8"
            value={form.confirmation}
            onChangeText={(val) => setForm({ ...form, confirmation: val })}
            secureTextEntry
            autoCapitalize="none"
          />
        </View>

        {/* Sélection rôle */}
        <View style={styles.field}>
          <Text style={styles.label}>Je suis *</Text>
          <View style={styles.rolesContainer}>
            {ROLES.map((r) => (
              <TouchableOpacity
                key={r.value}
                style={[
                  styles.roleCard,
                  form.role === r.value && styles.roleCardActive,
                ]}
                onPress={() => setForm({ ...form, role: r.value })}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.roleLabel,
                  form.role === r.value && styles.roleLabelActive,
                ]}>
                  {r.label}
                </Text>
                <Text style={[
                  styles.roleDesc,
                  form.role === r.value && styles.roleDescActive,
                ]}>
                  {r.desc}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Bouton inscription */}
        <TouchableOpacity
          style={[styles.btnRegister, loading && styles.btnDisabled]}
          onPress={handleRegister}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnRegisterText}>Créer mon compte</Text>
          )}
        </TouchableOpacity>

        {/* Lien vers login */}
        <TouchableOpacity
          style={styles.linkBtn}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.linkText}>
            Déjà inscrit ? Se connecter →
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
    paddingTop: 32,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1e3a5f',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
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
  row: {
    flexDirection: 'row',
    marginBottom: 0,
  },
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
  rolesContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  roleCard: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  roleCardActive: {
    borderColor: '#1e3a5f',
    backgroundColor: '#eff6ff',
  },
  roleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
  },
  roleLabelActive: {
    color: '#1e3a5f',
  },
  roleDesc: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
  },
  roleDescActive: {
    color: '#3b82f6',
  },
  btnRegister: {
    backgroundColor: '#1e3a5f',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: {
    backgroundColor: '#94a3b8',
  },
  btnRegisterText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  linkBtn: {
    marginTop: 16,
    alignItems: 'center',
  },
  linkText: {
    color: '#2563eb',
    fontSize: 13,
  },
  backBtn: {
    marginTop: 20,
    alignItems: 'center',
  },
  backText: {
    color: '#64748b',
    fontSize: 13,
  },
});