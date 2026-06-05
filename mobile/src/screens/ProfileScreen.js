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
import {
  ActionCard,
  Avatar,
  Badge,
  BORDER_RADIUS,
  Card,
  COLORS,
  SHADOWS,
  SPACING,
  TYPOGRAPHY,
} from '../components/MobileUI';

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

  const handlePhotoSoon = () => {
    setError('');
    setMessage(t('profile.photo_soon'));
    setTimeout(() => setMessage(''), 3000);
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

      <View style={styles.profileHero}>
        <View style={styles.heroAccent} />
        <View style={styles.heroBrand}>
          <View style={styles.heroBrandIcon}>
            <AppIcon name="group" size={15} color="#fff" />
          </View>
          <Text style={styles.heroBrandText}>BX-CONNECT</Text>
        </View>
        <View style={styles.avatarFrame}>
          <Avatar prenom={profil?.prenom} nom={profil?.nom} size={72} color={COLORS.bxBlueLight} />
          <TouchableOpacity
            style={styles.photoButton}
            onPress={handlePhotoSoon}
            accessibilityLabel={t('profile.change_photo')}
          >
            <AppIcon name="camera-outline" size={15} color={COLORS.bxBlue} />
          </TouchableOpacity>
        </View>
        <Text style={styles.profileName}>{profil?.prenom} {profil?.nom}</Text>
        <Badge
          label={t(`roles.${profil?.role}`, { defaultValue: profil?.role })}
          color={COLORS.info}
        />
        <Text style={styles.heroSlogan}>{t('brand.slogan')}</Text>
        <TouchableOpacity style={styles.photoLabelButton} onPress={handlePhotoSoon}>
          <AppIcon name="camera-outline" size={14} color="#fff" />
          <Text style={styles.photoLabel}>{t('profile.change_photo')}</Text>
          <Text style={styles.soonLabel}>{t('profile.soon')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoGrid}>
        <InfoChip icon="mail-outline" text={profil?.email || t('common.notAvailable')} />
        <InfoChip
          icon="globe-outline"
          text={languageLabel(profil?.languePreference, t)}
        />
        <InfoChip
          icon="calendar-outline"
          text={t('profile.since_short', {
            date: formatMonthYear(profil?.dateInscription, i18n.language, t),
          })}
        />
      </View>

      <View style={styles.sectionHeading}>
        <Text style={styles.sectionTitle}>{t('profile.account')}</Text>
        <Text style={styles.sectionSubtitle}>{t('profile.account_subtitle')}</Text>
      </View>

      <ActionCard
        label={t('profile.edit_btn')}
        description={t('profile.edit_action_description')}
        icon="edit"
        color={COLORS.bxBlueLight}
        onPress={() => {
          setShowPasswordForm(false);
          setEditMode(true);
        }}
      />
      <ActionCard
        label={t('profile.change_password')}
        description={t('profile.password_action_description')}
        icon="lock"
        color={COLORS.impactOrange}
        onPress={() => {
          setEditMode(false);
          setShowPasswordForm(true);
        }}
      />

      {editMode && (
        <Card style={styles.formCard}>
          <View style={styles.formHeader}>
            <View style={[styles.formIcon, { backgroundColor: COLORS.softBlue }]}>
              <AppIcon name="edit" size={18} color={COLORS.bxBlueLight} />
            </View>
            <View style={styles.formHeaderText}>
              <Text style={styles.editTitle}>{t('profile.edit_title')}</Text>
              <Text style={styles.formSubtitle}>{t('profile.edit_action_description')}</Text>
            </View>
          </View>

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
            <TouchableOpacity style={styles.btnCancel} onPress={() => setEditMode(false)}>
              <Text style={styles.btnCancelText}>{t('profile.cancel_btn')}</Text>
            </TouchableOpacity>
          </View>
        </Card>
      )}

      {showPasswordForm && (
        <Card style={styles.formCard}>
          <View style={styles.formHeader}>
            <View style={[styles.formIcon, { backgroundColor: COLORS.softOrange }]}>
              <AppIcon name="lock" size={18} color={COLORS.impactOrange} />
            </View>
            <View style={styles.formHeaderText}>
              <Text style={styles.editTitle}>{t('profile.security')}</Text>
              <Text style={styles.formSubtitle}>{t('profile.password_action_description')}</Text>
            </View>
          </View>
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
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <AppIcon name="lock" size={16} color="#fff" />
                  <Text style={styles.btnSaveText}>{t('profile.confirm')}</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.btnCancel}
              onPress={() => setShowPasswordForm(false)}
            >
              <Text style={styles.btnCancelText}>{t('profile.cancel_btn')}</Text>
            </TouchableOpacity>
          </View>
        </Card>
      )}

      <TouchableOpacity
        style={styles.btnLogout}
        onPress={handleLogout}
        activeOpacity={0.75}
      >
        <AppIcon name="logout" size={17} color={COLORS.muted} />
        <Text style={styles.btnLogoutText}>{t('profile.logout')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function InfoChip({ icon, text }) {
  return (
    <View style={styles.infoChip}>
      <View style={styles.infoChipIcon}>
        <AppIcon name={icon} size={15} color={COLORS.bxBlueLight} />
      </View>
      <Text style={styles.infoChipText} numberOfLines={1} adjustsFontSizeToFit>
        {text}
      </Text>
    </View>
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

function formatMonthYear(dateStr, language, t) {
  if (!dateStr) return t('profile.unknown_date');
  const locale = language === 'nl' ? 'nl-BE' : language === 'en' ? 'en-GB' : 'fr-BE';
  return new Date(dateStr).toLocaleDateString(locale, { month: 'long', year: 'numeric' });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.page },
  content: { padding: SPACING.md, paddingBottom: SPACING.xxl },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: COLORS.page },
  loadingText: { marginTop: SPACING.md, color: COLORS.muted, ...TYPOGRAPHY.body },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: COLORS.softBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  emptyTitle: { ...TYPOGRAPHY.section, color: COLORS.bxBlue, marginBottom: SPACING.sm },
  emptyText: { color: COLORS.muted, ...TYPOGRAPHY.body, textAlign: 'center' },
  retryButton: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.bxBlue,
    borderRadius: BORDER_RADIUS.md,
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

  profileHero: {
    overflow: 'hidden',
    alignItems: 'center',
    backgroundColor: COLORS.bxBlue,
    borderRadius: BORDER_RADIUS.xl,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.info,
    ...SHADOWS.colored(COLORS.bxBlue),
  },
  heroAccent: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: '46%',
    height: '100%',
    backgroundColor: COLORS.bxBlueLight,
    opacity: 0.42,
    transform: [{ skewX: '-14deg' }, { translateX: 34 }],
  },
  heroBrand: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  heroBrandIcon: {
    width: 28,
    height: 28,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  heroBrandText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  avatarFrame: {
    padding: 3,
    borderRadius: BORDER_RADIUS.pill,
    backgroundColor: '#fff',
    marginBottom: SPACING.sm,
  },
  photoButton: {
    position: 'absolute',
    right: -3,
    bottom: -1,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: COLORS.softBlue,
  },
  profileName: { color: '#fff', fontSize: 20, lineHeight: 24, fontWeight: '900', marginBottom: SPACING.xs },
  heroSlogan: { color: '#BAE6FD', ...TYPOGRAPHY.caption, fontWeight: '700', marginTop: SPACING.sm },
  photoLabelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: SPACING.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.pill,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  photoLabel: { color: '#fff', ...TYPOGRAPHY.tiny, fontWeight: '800' },
  soonLabel: { color: '#BAE6FD', ...TYPOGRAPHY.tiny },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  infoChip: {
    minWidth: '48%',
    flexGrow: 1,
    flexBasis: 150,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    paddingHorizontal: 10,
    paddingVertical: 9,
    ...SHADOWS.soft,
  },
  infoChipIcon: {
    width: 28,
    height: 28,
    borderRadius: BORDER_RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.softBlue,
    marginRight: SPACING.sm,
  },
  infoChipText: { flex: 1, color: COLORS.text, fontSize: 11, fontWeight: '700' },
  sectionHeading: { marginBottom: SPACING.sm },
  sectionTitle: { color: COLORS.bxBlue, ...TYPOGRAPHY.section },
  sectionSubtitle: { color: COLORS.muted, ...TYPOGRAPHY.caption, marginTop: 2 },
  formCard: { marginTop: SPACING.xs, marginBottom: SPACING.md },
  formHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.lg },
  formIcon: {
    width: 38,
    height: 38,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  formHeaderText: { flex: 1 },
  editTitle: { color: COLORS.bxBlue, ...TYPOGRAPHY.section },
  formSubtitle: { color: COLORS.muted, ...TYPOGRAPHY.caption, marginTop: 2 },
  label: { color: COLORS.text, fontSize: 13, fontWeight: '700', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 14,
    color: COLORS.text, backgroundColor: COLORS.page, marginBottom: SPACING.md,
  },
  languesRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg },
  langueBtn: {
    flex: 1, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.sm, padding: 9, alignItems: 'center',
  },
  langueBtnActive: { borderColor: COLORS.bxBlueLight, backgroundColor: COLORS.softBlue },
  langueBtnText: { ...TYPOGRAPHY.caption, color: COLORS.muted, fontWeight: '600' },
  langueBtnTextActive: { color: COLORS.bxBlue, fontWeight: '900' },
  editActions: { flexDirection: 'row', gap: SPACING.sm },
  btnSave: {
    flex: 1, backgroundColor: COLORS.bxBlue, paddingVertical: 12,
    borderRadius: BORDER_RADIUS.md, alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: 7,
  },
  btnDisabled: { backgroundColor: '#94a3b8', opacity: 0.7 },
  btnSaveText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  btnCancel: {
    flex: 1, backgroundColor: '#f1f5f9', paddingVertical: 12,
    borderRadius: BORDER_RADIUS.md, alignItems: 'center',
  },
  btnCancelText: { color: COLORS.muted, fontWeight: '700', fontSize: 14 },
  btnLogout: {
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center', flexDirection: 'row', gap: 8,
    marginTop: SPACING.sm,
  },
  btnLogoutText: { color: COLORS.muted, fontWeight: '700', fontSize: 13 },
});
