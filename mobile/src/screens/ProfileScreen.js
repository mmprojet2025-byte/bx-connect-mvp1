import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, ActivityIndicator
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import { changeAppLanguage } from '../i18n';
import AppIcon from '../components/AppIcon';
import { Avatar } from '../components/MobileUI';

const LANGUES = [
  { value: 'FR', labelKey: 'common.language_fr' },
  { value: 'NL', labelKey: 'common.language_nl' },
  { value: 'EN', labelKey: 'common.language_en' },
];

export default function ProfileScreen() {
  const { logout, login } = useAuth();
  const { t, i18n } = useTranslation();

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
      setError(getApiError(err, t('profile.error_load'), t));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfil = async () => {
    if (!form.prenom.trim() || !form.nom.trim()) {
      setError(t('profile.error_required_names'));
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
      setMessage(t('profile.success_update'));
      await changeAppLanguage(form.languePreference.toLowerCase());
      await login(await getToken(), {
        prenom: res.data.prenom,
        nom: res.data.nom,
        email: res.data.email,
        role: res.data.role,
      });
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(getApiError(err, t('profile.error_update'), t));
    } finally {
      setSaving(false);
    }
  };

  const getToken = async () => {
    return await AsyncStorage.getItem('token');
  };

  const handleChangePassword = async () => {
    if (!passwordForm.ancienMotDePasse || !passwordForm.nouveauMotDePasse) {
      setError(t('profile.error_password_fields'));
      return;
    }
    setSaving(true);
    setMessage(''); setError('');
    try {
      await api.put('/users/me/password', passwordForm);
      setMessage(t('profile.success_password'));
      setShowPasswordForm(false);
      setPasswordForm({ ancienMotDePasse: '', nouveauMotDePasse: '' });
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(getApiError(err, t('profile.error_old_password'), t));
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
        <ActivityIndicator size="large" color="#1E3A8A" />
        <Text style={styles.loadingText}>{t('profile.loading')}</Text>
      </View>
    );
  }

  if (!profil) {
    return (
      <View style={styles.centered}>
        <View style={styles.emptyIconCircle}>
          <AppIcon name="profile" size={34} color="#38BDF8" />
        </View>
        <Text style={styles.emptyTitle}>{t('profile.unavailable')}</Text>
        {error !== '' && <Text style={styles.emptyText}>{error}</Text>}
        <TouchableOpacity style={styles.retryButton} onPress={fetchProfil}>
          <Text style={styles.retryButtonText}>{t('profile.retry')}</Text>
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
        <Avatar prenom={profil?.prenom} nom={profil?.nom} size={64} />

        {!editMode ? (
          <>
            <Text style={styles.profileName}>{profil?.prenom} {profil?.nom}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{t(`roles.${profil?.role}`, profil?.role)}</Text>
            </View>
            <View style={styles.profileMetaRow}>
              <AppIcon name="message" size={16} color="#64748b" />
              <Text style={styles.profileMetaText}>{profil?.email}</Text>
            </View>
            <View style={styles.profileMetaRow}>
              <AppIcon name="settings" size={16} color="#64748b" />
              <Text style={styles.profileMetaText}>
                {t('profile.language_display', { language: languageLabel(profil?.languePreference, t) })}
              </Text>
            </View>
            <Text style={styles.profileDate}>
              {t('profile.member_since', { date: formatDate(profil?.dateInscription, i18n.language, t) })}
            </Text>
            <TouchableOpacity
              style={styles.btnEdit}
              onPress={() => setEditMode(true)}
              activeOpacity={0.8}
            >
              <AppIcon name="edit" size={16} color="#fff" />
              <Text style={styles.btnEditText}>{t('profile.edit_btn')}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.editForm}>
            <Text style={styles.editTitle}>{t('profile.edit_title')}</Text>

            <Text style={styles.label}>{t('profile.firstname')}</Text>
            <TextInput
              style={styles.input}
              value={form.prenom}
              onChangeText={(val) => setForm({ ...form, prenom: val })}
              autoCapitalize="words"
            />

            <Text style={styles.label}>{t('profile.lastname')}</Text>
            <TextInput
              style={styles.input}
              value={form.nom}
              onChangeText={(val) => setForm({ ...form, nom: val })}
              autoCapitalize="words"
            />

            <Text style={styles.label}>{t('profile.language')}</Text>
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
                    {t(l.labelKey)}
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
                  <>
                    <AppIcon name="save" size={16} color="#fff" />
                    <Text style={styles.btnSaveText}>{t('profile.save_btn')}</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnCancel}
                onPress={() => setEditMode(false)}
              >
                <Text style={styles.btnCancelText}>{t('profile.cancel_btn')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Sécurité */}
      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <AppIcon name="lock" size={20} color="#1E3A8A" />
          <Text style={styles.sectionTitle}>{t('profile.security')}</Text>
        </View>

        {!showPasswordForm ? (
          <TouchableOpacity
            style={styles.btnPassword}
            onPress={() => setShowPasswordForm(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.btnPasswordText}>{t('profile.change_password')}</Text>
          </TouchableOpacity>
        ) : (
          <View>
            <Text style={styles.label}>{t('profile.old_password')}</Text>
            <TextInput
              style={styles.input}
              value={passwordForm.ancienMotDePasse}
              onChangeText={(val) => setPasswordForm({ ...passwordForm, ancienMotDePasse: val })}
              secureTextEntry
              autoCapitalize="none"
            />
            <Text style={styles.label}>{t('profile.new_password')}</Text>
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
                <Text style={styles.btnSaveText}>{t('profile.confirm')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnCancel}
                onPress={() => setShowPasswordForm(false)}
              >
                <Text style={styles.btnCancelText}>{t('profile.cancel_btn')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Déconnexion */}
      <TouchableOpacity style={styles.btnLogout} onPress={handleLogout} activeOpacity={0.8}>
        <AppIcon name="logout" size={18} color="#EF4444" />
        <Text style={styles.btnLogoutText}>{t('profile.logout')}</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

function getApiError(err, fallback, t) {
  if (err.response?.status === 401) {
    return t('errors.session_expired');
  }
  if (err.response?.status === 403) {
    return t('errors.forbidden');
  }
  return fallback;
}

function languageLabel(value, t) {
  return {
    FR: t('common.language_fr'),
    NL: t('common.language_nl'),
    EN: t('common.language_en'),
  }[value] || value || '';
}

function formatDate(dateStr, language, t) {
  if (!dateStr) return t('profile.unknown_date');
  const locale = language === 'nl' ? 'nl-BE' : language === 'en' ? 'en-GB' : 'fr-BE';
  return new Date(dateStr).toLocaleDateString(locale);
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 14, paddingBottom: 28 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: '#F8FAFC' },
  loadingText: { marginTop: 12, color: '#64748b', fontSize: 14 },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: '#1E3A8A', marginBottom: 8 },
  emptyText: { color: '#64748b', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  retryButton: {
    marginTop: 18,
    backgroundColor: '#1E3A8A',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  retryButtonText: { color: '#fff', fontWeight: '900', fontSize: 13 },

  successBox: {
    backgroundColor: '#f0fdf4', borderLeftWidth: 4, borderLeftColor: '#22C55E',
    padding: 12, borderRadius: 8, marginBottom: 12,
  },
  successText: { color: '#15803d', fontSize: 13 },
  errorBox: {
    backgroundColor: '#fef2f2', borderLeftWidth: 4, borderLeftColor: '#EF4444',
    padding: 12, borderRadius: 8, marginBottom: 12,
  },
  errorText: { color: '#EF4444', fontSize: 13 },

  profileCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 18,
    alignItems: 'center', marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 7, elevation: 2,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  avatar: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#1E3A8A', alignItems: 'center',
    justifyContent: 'center', marginBottom: 10,
  },
  avatarText: { color: '#fff', fontSize: 22, fontWeight: '900' },
  profileName: { fontSize: 19, fontWeight: '900', color: '#1E3A8A', marginBottom: 6 },
  roleBadge: {
    backgroundColor: '#1E3A8A', paddingHorizontal: 11, paddingVertical: 4,
    borderRadius: 20, marginBottom: 9,
  },
  roleText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  profileMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 4 },
  profileMetaText: { fontSize: 13, color: '#64748b' },
  bold: { fontWeight: '600' },
  profileDate: { fontSize: 12, color: '#94a3b8', marginTop: 2, marginBottom: 13 },
  btnEdit: {
    backgroundColor: '#1E3A8A', paddingVertical: 11, paddingHorizontal: 18,
    borderRadius: 12, alignItems: 'center', flexDirection: 'row', gap: 7,
  },
  btnEditText: { color: '#fff', fontWeight: '800', fontSize: 13 },

  editForm: { width: '100%' },
  editTitle: { fontSize: 16, fontWeight: 'bold', color: '#1E3A8A', marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#d1d5db', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 14,
    color: '#1e293b', backgroundColor: '#f8fafc', marginBottom: 12,
  },
  languesRow: { flexDirection: 'row', marginBottom: 16 },
  langueBtn: {
    flex: 1, borderWidth: 2, borderColor: '#e2e8f0',
    borderRadius: 10, padding: 8, alignItems: 'center', marginRight: 6,
  },
  langueBtnActive: { borderColor: '#1E3A8A', backgroundColor: '#F0F9FF' },
  langueBtnText: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  langueBtnTextActive: { color: '#1E3A8A', fontWeight: '700' },
  editActions: { flexDirection: 'row', gap: 10 },
  btnSave: {
    flex: 1, backgroundColor: '#1E3A8A', paddingVertical: 12,
    borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: 7,
  },
  btnDisabled: { backgroundColor: '#94a3b8' },
  btnSaveText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  btnCancel: {
    flex: 1, backgroundColor: '#f1f5f9', paddingVertical: 12,
    borderRadius: 12, alignItems: 'center',
  },
  btnCancelText: { color: '#64748b', fontWeight: '600', fontSize: 14 },

  section: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1E3A8A' },
  btnPassword: {
    backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fed7aa',
    paddingVertical: 11, borderRadius: 12, alignItems: 'center',
  },
  btnPasswordText: { color: '#F97316', fontWeight: '800', fontSize: 13 },

  btnLogout: {
    backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca',
    paddingVertical: 12, borderRadius: 12, alignItems: 'center',
    justifyContent: 'center', flexDirection: 'row', gap: 8,
  },
  btnLogoutText: { color: '#EF4444', fontWeight: '800', fontSize: 14 },
});
