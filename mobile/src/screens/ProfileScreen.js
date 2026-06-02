import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, ActivityIndicator
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const LANGUES = [
  { value: 'FR', label: '🇫🇷 Français' },
  { value: 'NL', label: '🇧🇪 Nederlands' },
  { value: 'EN', label: '🇬🇧 English' },
];

export default function ProfileScreen() {
  const { logout, login } = useAuth();

  const [profil, setProfil] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    prenom: '',
    nom: '',
    languePreference: 'FR',
  });

  const [passwordForm, setPasswordForm] = useState({
    ancienMotDePasse: '',
    nouveauMotDePasse: '',
  });

  useEffect(() => {
    fetchProfil();
  }, []);

  const fetchProfil = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await api.get('/users/me');
      setProfil(res.data);
      setForm({
        prenom: res.data.prenom,
        nom: res.data.nom,
        languePreference: res.data.languePreference || 'FR',
      });
    } catch (err) {
      setProfil(null);
      setError(getApiError(err, 'Impossible de charger le profil.'));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfil = async () => {
    if (!form.prenom.trim() || !form.nom.trim()) {
      setError('Le prénom et le nom sont obligatoires.');
      return;
    }
    setSaving(true);
    setMessage(''); setError('');
    try {
      const res = await api.put('/users/me', {
        prenom: form.prenom.trim(),
        nom: form.nom.trim(),
        languePreference: form.languePreference,
      });
      setProfil(res.data);
      setEditMode(false);
      setMessage('Profil mis à jour avec succès.');
      await login(await getToken(), {
        prenom: res.data.prenom,
        nom: res.data.nom,
        email: res.data.email,
        role: res.data.role,
      });
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(getApiError(err, 'Erreur lors de la mise à jour du profil.'));
    } finally {
      setSaving(false);
    }
  };

  const getToken = async () => {
    return await AsyncStorage.getItem('token');
  };

  const handleChangePassword = async () => {
    if (!passwordForm.ancienMotDePasse || !passwordForm.nouveauMotDePasse) {
      setError('Veuillez remplir les deux champs.');
      return;
    }
    setSaving(true);
    setMessage(''); setError('');
    try {
      await api.put('/users/me/password', passwordForm);
      setMessage('Mot de passe mis à jour.');
      setShowPasswordForm(false);
      setPasswordForm({ ancienMotDePasse: '', nouveauMotDePasse: '' });
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(getApiError(err, 'Ancien mot de passe incorrect.'));
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1e3a5f" />
        <Text style={styles.loadingText}>Chargement du profil...</Text>
      </View>
    );
  }

  if (!profil) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyIcon}>👤</Text>
        <Text style={styles.emptyTitle}>Profil indisponible</Text>
        {error !== '' && <Text style={styles.emptyText}>{error}</Text>}
        <TouchableOpacity style={styles.retryButton} onPress={fetchProfil}>
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Messages */}
      {message !== '' && (
        <View style={styles.successBox}>
          <Text style={styles.successText}>{message}</Text>
        </View>
      )}
      {error !== '' && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Carte profil */}
      <View style={styles.profileCard}>
        {/* Avatar */}
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {profil?.prenom?.[0]}{profil?.nom?.[0]}
          </Text>
        </View>

        {!editMode ? (
          <>
            <Text style={styles.profileName}>{profil?.prenom} {profil?.nom}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{profil?.role}</Text>
            </View>
            <Text style={styles.profileEmail}>📧 {profil?.email}</Text>
            <Text style={styles.profileLang}>
              🌐 Langue : <Text style={styles.bold}>{profil?.languePreference}</Text>
            </Text>
            <Text style={styles.profileDate}>
              Membre depuis le {formatDate(profil?.dateInscription)}
            </Text>
            <TouchableOpacity
              style={styles.btnEdit}
              onPress={() => setEditMode(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.btnEditText}>✏️ Modifier le profil</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.editForm}>
            <Text style={styles.editTitle}>Modifier le profil</Text>

            <Text style={styles.label}>Prénom</Text>
            <TextInput
              style={styles.input}
              value={form.prenom}
              onChangeText={(val) => setForm({ ...form, prenom: val })}
              autoCapitalize="words"
            />

            <Text style={styles.label}>Nom</Text>
            <TextInput
              style={styles.input}
              value={form.nom}
              onChangeText={(val) => setForm({ ...form, nom: val })}
              autoCapitalize="words"
            />

            <Text style={styles.label}>{"Langue de l'interface"}</Text>
            <View style={styles.languesRow}>
              {LANGUES.map((l) => (
                <TouchableOpacity
                  key={l.value}
                  style={[
                    styles.langueBtn,
                    form.languePreference === l.value && styles.langueBtnActive,
                  ]}
                  onPress={() => setForm({ ...form, languePreference: l.value })}
                >
                  <Text style={[
                    styles.langueBtnText,
                    form.languePreference === l.value && styles.langueBtnTextActive,
                  ]}>
                    {l.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.editActions}>
              <TouchableOpacity
                style={[styles.btnSave, saving && styles.btnDisabled]}
                onPress={handleSaveProfil}
                disabled={saving}
                activeOpacity={0.8}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.btnSaveText}>💾 Sauvegarder</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnCancel}
                onPress={() => setEditMode(false)}
              >
                <Text style={styles.btnCancelText}>Annuler</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Sécurité */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔒 Sécurité</Text>

        {!showPasswordForm ? (
          <TouchableOpacity
            style={styles.btnPassword}
            onPress={() => setShowPasswordForm(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.btnPasswordText}>Changer le mot de passe</Text>
          </TouchableOpacity>
        ) : (
          <View>
            <Text style={styles.label}>Ancien mot de passe</Text>
            <TextInput
              style={styles.input}
              value={passwordForm.ancienMotDePasse}
              onChangeText={(val) => setPasswordForm({ ...passwordForm, ancienMotDePasse: val })}
              secureTextEntry
              autoCapitalize="none"
            />
            <Text style={styles.label}>Nouveau mot de passe</Text>
            <TextInput
              style={styles.input}
              value={passwordForm.nouveauMotDePasse}
              onChangeText={(val) => setPasswordForm({ ...passwordForm, nouveauMotDePasse: val })}
              secureTextEntry
              autoCapitalize="none"
            />
            <View style={styles.editActions}>
              <TouchableOpacity
                style={[styles.btnSave, saving && styles.btnDisabled]}
                onPress={handleChangePassword}
                disabled={saving}
              >
                <Text style={styles.btnSaveText}>Confirmer</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnCancel}
                onPress={() => setShowPasswordForm(false)}
              >
                <Text style={styles.btnCancelText}>Annuler</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Déconnexion */}
      <TouchableOpacity style={styles.btnLogout} onPress={handleLogout} activeOpacity={0.8}>
        <Text style={styles.btnLogoutText}>🚪 Se déconnecter</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

function getApiError(err, fallback) {
  if (err.response?.status === 401) {
    return 'Session expirée. Reconnectez-vous.';
  }
  if (err.response?.status === 403) {
    return 'Accès non autorisé.';
  }
  return err.response?.data?.message || fallback;
}

function formatDate(dateStr) {
  if (!dateStr) return 'date inconnue';
  return new Date(dateStr).toLocaleDateString('fr-BE');
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  content: { padding: 16, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: '#f0f4f8' },
  loadingText: { marginTop: 12, color: '#64748b', fontSize: 14 },
  emptyIcon: { fontSize: 54, marginBottom: 14 },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: '#1e3a5f', marginBottom: 8 },
  emptyText: { color: '#64748b', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  retryButton: {
    marginTop: 18,
    backgroundColor: '#1e3a5f',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  retryButtonText: { color: '#fff', fontWeight: '900', fontSize: 13 },

  successBox: {
    backgroundColor: '#f0fdf4', borderLeftWidth: 4, borderLeftColor: '#16a34a',
    padding: 12, borderRadius: 8, marginBottom: 12,
  },
  successText: { color: '#15803d', fontSize: 13 },
  errorBox: {
    backgroundColor: '#fef2f2', borderLeftWidth: 4, borderLeftColor: '#dc2626',
    padding: 12, borderRadius: 8, marginBottom: 12,
  },
  errorText: { color: '#dc2626', fontSize: 13 },

  profileCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 24,
    alignItems: 'center', marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 2,
  },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#1e3a5f', alignItems: 'center',
    justifyContent: 'center', marginBottom: 12,
  },
  avatarText: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  profileName: { fontSize: 20, fontWeight: 'bold', color: '#1e3a5f', marginBottom: 6 },
  roleBadge: {
    backgroundColor: '#2563eb', paddingHorizontal: 12, paddingVertical: 3,
    borderRadius: 20, marginBottom: 10,
  },
  roleText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  profileEmail: { fontSize: 14, color: '#64748b', marginBottom: 4 },
  profileLang: { fontSize: 14, color: '#64748b', marginBottom: 4 },
  bold: { fontWeight: '600' },
  profileDate: { fontSize: 12, color: '#94a3b8', marginBottom: 16 },
  btnEdit: {
    backgroundColor: '#1e3a5f', paddingVertical: 10, paddingHorizontal: 24,
    borderRadius: 12, alignItems: 'center',
  },
  btnEditText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  editForm: { width: '100%' },
  editTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e3a5f', marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#d1d5db', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12, fontSize: 15,
    color: '#1e293b', backgroundColor: '#f8fafc', marginBottom: 14,
  },
  languesRow: { flexDirection: 'row', marginBottom: 16 },
  langueBtn: {
    flex: 1, borderWidth: 2, borderColor: '#e2e8f0',
    borderRadius: 10, padding: 8, alignItems: 'center', marginRight: 6,
  },
  langueBtnActive: { borderColor: '#1e3a5f', backgroundColor: '#eff6ff' },
  langueBtnText: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  langueBtnTextActive: { color: '#1e3a5f', fontWeight: '700' },
  editActions: { flexDirection: 'row', gap: 10 },
  btnSave: {
    flex: 1, backgroundColor: '#1e3a5f', paddingVertical: 12,
    borderRadius: 12, alignItems: 'center',
  },
  btnDisabled: { backgroundColor: '#94a3b8' },
  btnSaveText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  btnCancel: {
    flex: 1, backgroundColor: '#f1f5f9', paddingVertical: 12,
    borderRadius: 12, alignItems: 'center',
  },
  btnCancelText: { color: '#64748b', fontWeight: '600', fontSize: 14 },

  section: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20,
    marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e3a5f', marginBottom: 14 },
  btnPassword: {
    backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fed7aa',
    paddingVertical: 12, borderRadius: 12, alignItems: 'center',
  },
  btnPasswordText: { color: '#ea580c', fontWeight: '600', fontSize: 14 },

  btnLogout: {
    backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca',
    paddingVertical: 14, borderRadius: 12, alignItems: 'center',
  },
  btnLogoutText: { color: '#dc2626', fontWeight: '600', fontSize: 15 },
});
