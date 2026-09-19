import { useState, useEffect, useLayoutEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image,
  TouchableOpacity, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Switch
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import { changeAppLanguage } from '../i18n';
import AppIcon from '../components/AppIcon';
import {
  disablePushNotifications,
  enablePushNotifications,
  getPushPreferences,
  unregisterCurrentPushDevice,
} from '../services/pushNotifications';
import { getStoredToken } from '../services/secureAuthStorage';
import {
  Badge,
  BORDER_RADIUS,
  Card,
  COLORS,
  SPACING,
  TYPOGRAPHY,
  ErrorState,
  LoadingState,
} from '../components/MobileUI';

const LANGUES = [
  { value: 'FR', labelKey: 'common.language_fr' },
  { value: 'NL', labelKey: 'common.language_nl' },
  { value: 'EN', labelKey: 'common.language_en' },
];

export default function ProfileScreen({ navigation }) {
  const { user, logout, login } = useAuth();
  const { t, i18n } = useTranslation();

  const [profil, setProfil] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [profileNotice, setProfileNotice] = useState('');
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);

  const [form, setForm] = useState({
    prenom: '',
    nom: '',
    languePreference: 'FR',
  });

  const [passwordForm, setPasswordForm] = useState({
    ancienMotDePasse: '',
    nouveauMotDePasse: '',
  });

  useLayoutEffect(() => {
    navigation.setOptions({
      title: t('navigation.profile'),
      headerTitle: t('navigation.profile'),
      headerBackVisible: navigation.canGoBack(),
    });
  }, [navigation, t]);

  useEffect(() => {
    void Promise.resolve().then(() => fetchProfil());
  }, []);

  async function fetchProfil() {
    setLoading(true);
    setError('');
    setMessage('');
    setProfileNotice('');
    try {
      const res = await api.get('/users/me');
      setProfil(res.data);
      setForm({
        prenom: res.data.prenom,
        nom: res.data.nom,
        languePreference: res.data.languePreference || 'FR',
      });
      await fetchPushPreference();
    } catch {
      const localProfile = await getStoredProfile(user, i18n.language);
      setProfil(localProfile);
      setForm({
        prenom: localProfile.prenom || '',
        nom: localProfile.nom || '',
        languePreference: localProfile.languePreference || 'FR',
      });
      setProfileNotice(t('profile.localFallback'));
      await fetchPushPreference();
    } finally {
      setLoading(false);
    }
  }

  const fetchPushPreference = async () => {
    try {
      const preferences = await getPushPreferences();
      setPushEnabled(Boolean(preferences.enabled));
    } catch {
      setPushEnabled(false);
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
      setProfileNotice('');
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
    return await getStoredToken();
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
    try {
      await unregisterCurrentPushDevice();
    } catch {
      // La deconnexion locale reste prioritaire si le backend est indisponible.
    }
    await logout();
  };

  const handlePushPreference = async (enabled) => {
    setPushLoading(true);
    setMessage('');
    setError('');
    try {
      if (!enabled) {
        const preferences = await disablePushNotifications();
        setPushEnabled(Boolean(preferences.enabled));
        setMessage(t('push.disabledSuccess'));
        return;
      }

      const result = await enablePushNotifications();
      if (result.status === 'enabled') {
        setPushEnabled(true);
        setMessage(t('push.enabledSuccess'));
      } else if (result.status === 'denied') {
        setPushEnabled(false);
        setError(t('push.permissionDenied'));
      } else if (result.status === 'physical-device-required') {
        setPushEnabled(false);
        setError(t('push.physicalDeviceRequired'));
      } else if (result.status === 'missing-project-id') {
        setPushEnabled(false);
        setError(t('push.missingProjectId'));
      } else {
        setPushEnabled(false);
        setError(t('push.unsupported'));
      }
    } catch (err) {
      setPushEnabled(false);
      setError(getApiError(err, t('push.error'), t));
    } finally {
      setPushLoading(false);
    }
  };

  if (loading) {
    return <LoadingState label={t('common.loading')} />;
  }

  if (!profil) {
    return (
      <ErrorState
        title={t('profile.unavailable')}
        text={error || t('common.loadErrorDescription')}
        retryLabel={t('common.retry')}
        onRetry={fetchProfil}
      />
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
      {message !== '' && (
        <View style={styles.successBox} accessibilityRole="alert">
          <Text style={styles.successText}>{message}</Text>
        </View>
      )}
      {profileNotice !== '' && (
        <View style={styles.noticeBox}>
          <AppIcon name="information-circle-outline" size={18} color={COLORS.info} />
          <Text style={styles.noticeText}>{profileNotice}</Text>
        </View>
      )}
      {error !== '' && (
        <View style={styles.errorBox} accessibilityRole="alert">
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <Card style={styles.identityCard}>
        <View style={styles.identityAccent} />
        <View style={styles.avatarFrame} accessibilityRole="image">
          <Image
            source={require('../../assets/images/avatars/default-avatar.png')}
            style={styles.avatarImage}
            resizeMode="cover"
            accessibilityLabel={t('profile.default_avatar')}
          />
        </View>
        <Text style={styles.profileName}>{profil?.prenom} {profil?.nom}</Text>
        <Badge
          label={t(`roles.${profil?.role}`)}
          color={COLORS.interactive}
          soft
        />
        <TouchableOpacity
          style={styles.primaryProfileButton}
          onPress={() => {
            setShowPasswordForm(false);
            setEditMode(true);
          }}
          accessibilityRole="button"
          accessibilityLabel={t('profile.edit_btn')}
        >
          <AppIcon name="edit" size={18} color={COLORS.interactive} />
          <Text style={styles.primaryProfileButtonText}>{t('profile.edit_btn')}</Text>
        </TouchableOpacity>
      </Card>

      <Card style={styles.sectionCard}>
        <SectionTitle title={t('profile.title')} />
        <InfoRow
          icon="mail-outline"
          label={t('profile.email')}
          text={profil?.email || t('common.notAvailable')}
        />
        <InfoRow
          icon="globe-outline"
          label={t('profile.language')}
          text={languageLabel(profil?.languePreference, t)}
        />
        <InfoRow
          icon="calendar-outline"
          text={t('profile.since_short', {
            date: formatMonthYear(profil?.dateInscription, i18n.language, t),
          })}
        />
      </Card>

      <Card style={styles.pushCard}>
        <View style={styles.pushIcon}>
          <AppIcon name="bell" size={21} color={COLORS.bxBlueLight} />
        </View>
        <View style={styles.pushContent}>
          <Text style={styles.pushLabel}>{t('push.title')}</Text>
          <Text style={styles.pushHint}>
            {pushEnabled ? t('push.enabledHint') : t('push.disabledHint')}
          </Text>
        </View>
        {pushLoading ? (
          <ActivityIndicator color={COLORS.bxBlueLight} size="small" />
        ) : (
          <Switch
            value={pushEnabled}
            onValueChange={handlePushPreference}
            trackColor={{ false: COLORS.border, true: COLORS.interactive }}
            thumbColor={COLORS.surface}
            accessibilityLabel={t('push.enable')}
          />
        )}
      </Card>

      <Card style={styles.sectionCard}>
        <SectionTitle title={t('profile.account')} />
        <ProfileAction
          label={t('profile.edit_btn')}
          description={t('profile.edit_action_description')}
          icon="edit"
          onPress={() => {
            setShowPasswordForm(false);
            setEditMode(true);
          }}
        />
        <ProfileAction
          label={t('profile.change_password')}
          description={t('profile.password_action_description')}
          icon="lock"
          last
          onPress={() => {
            setEditMode(false);
            setShowPasswordForm(true);
          }}
        />
      </Card>

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
              accessibilityLabel={t('profile.firstname')}
            />

          <Text style={styles.label}>{t('profile.lastname')}</Text>
            <TextInput
              style={styles.input}
              value={form.nom}
              onChangeText={(val) => setForm({ ...form, nom: val })}
              autoCapitalize="words"
              accessibilityLabel={t('profile.lastname')}
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
                accessibilityRole="button"
                accessibilityState={{ selected: form.languePreference === l.value }}
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
              accessibilityRole="button"
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
            <TouchableOpacity style={styles.btnCancel} onPress={() => setEditMode(false)} accessibilityRole="button">
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
            accessibilityLabel={t('profile.old_password')}
          />
          <Text style={styles.label}>{t('profile.new_password')}</Text>
          <TextInput
            style={styles.input}
            value={passwordForm.nouveauMotDePasse}
            onChangeText={(val) => setPasswordForm({ ...passwordForm, nouveauMotDePasse: val })}
            secureTextEntry
            autoCapitalize="none"
            accessibilityLabel={t('profile.new_password')}
          />
          <View style={styles.editActions}>
            <TouchableOpacity
              style={[styles.btnSave, saving && styles.btnDisabled]}
              onPress={handleChangePassword}
              disabled={saving}
              accessibilityRole="button"
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
              accessibilityRole="button"
            >
              <Text style={styles.btnCancelText}>{t('profile.cancel_btn')}</Text>
            </TouchableOpacity>
          </View>
        </Card>
      )}

      <Card style={styles.legalCard}>
        <SectionTitle title={t('legal.profileTitle')} />
        <LegalAction icon="shield" label={t('legal.links.terms')} onPress={() => navigation.navigate('LegalTerms')} />
        <LegalAction icon="lock" label={t('legal.links.privacy')} onPress={() => navigation.navigate('LegalPrivacy')} />
        <LegalAction icon="information-circle-outline" label={t('legal.links.notices')} onPress={() => navigation.navigate('LegalNotices')} />
        {profil?.legalVersion ? (
          <Text style={styles.legalVersion}>{t('legal.acceptedVersion', { version: profil.legalVersion })}</Text>
        ) : null}
      </Card>

      <TouchableOpacity
        style={styles.btnLogout}
        onPress={handleLogout}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={t('profile.logout')}
      >
        <AppIcon name="logout" size={19} color={COLORS.danger} />
        <Text style={styles.btnLogoutText}>{t('profile.logout')}</Text>
      </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function LegalAction({ icon, label, onPress }) {
  return (
    <TouchableOpacity style={styles.legalAction} onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      <View style={styles.legalActionIcon}>
        <AppIcon name={icon} size={16} color={COLORS.bxBlueLight} />
      </View>
      <Text style={styles.legalActionText}>{label}</Text>
      <AppIcon name="chevron-forward-outline" size={17} color={COLORS.muted} />
    </TouchableOpacity>
  );
}

function SectionTitle({ title }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function InfoRow({ icon, label, text }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.rowIcon}>
        <AppIcon name={icon} size={20} color={COLORS.muted} />
      </View>
      <View style={styles.infoRowContent}>
        {label ? <Text style={styles.infoRowLabel}>{label}</Text> : null}
        <Text style={styles.infoRowText}>{text}</Text>
      </View>
    </View>
  );
}

function ProfileAction({ icon, label, description, onPress, last = false }) {
  return (
    <TouchableOpacity
      style={[styles.profileAction, last && styles.lastRow]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={styles.rowIcon}>
        <AppIcon name={icon} size={20} color={COLORS.muted} />
      </View>
      <View style={styles.profileActionContent}>
        <Text style={styles.profileActionText}>{label}</Text>
        {description ? <Text style={styles.profileActionDescription}>{description}</Text> : null}
      </View>
      <AppIcon name="chevron-forward-outline" size={18} color={COLORS.muted} />
    </TouchableOpacity>
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

async function getStoredProfile(user, language) {
  let storedUser = null;
  try {
    const raw = await AsyncStorage.getItem('user');
    storedUser = raw ? JSON.parse(raw) : null;
  } catch {
    storedUser = null;
  }

  const source = storedUser || user || {};
  return {
    prenom: source.prenom || '',
    nom: source.nom || '',
    email: source.email || '',
    role: source.role || '',
    languePreference: source.languePreference || language?.slice(0, 2).toUpperCase() || 'FR',
    dateInscription: source.dateInscription || null,
    actif: source.actif !== false,
    legalVersion: source.legalVersion || null,
  };
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
  content: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: 96,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.softBlue,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  noticeText: { flex: 1, color: COLORS.bxBlue, ...TYPOGRAPHY.caption },
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

  identityCard: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    marginBottom: SPACING.lg,
    overflow: 'hidden',
  },
  identityAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 64,
    backgroundColor: COLORS.softBlue,
    opacity: 0.8,
  },
  avatarFrame: {
    padding: 3,
    borderRadius: BORDER_RADIUS.pill,
    backgroundColor: COLORS.surface,
    marginBottom: SPACING.md,
    zIndex: 1,
  },
  avatarImage: {
    width: 76,
    height: 76,
    borderRadius: 38,
  },
  profileName: { color: COLORS.text, fontSize: 20, lineHeight: 26, fontWeight: '800', marginBottom: SPACING.sm },
  primaryProfileButton: {
    width: '100%',
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.softBlue,
  },
  primaryProfileButtonText: { color: COLORS.interactive, fontSize: 14, lineHeight: 19, fontWeight: '700' },
  sectionTitle: {
    color: COLORS.text,
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.md,
  },
  sectionCard: { marginBottom: SPACING.lg },
  infoRow: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.borderSoft,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    marginRight: SPACING.md,
  },
  infoRowContent: { flex: 1, minWidth: 0 },
  infoRowLabel: { color: COLORS.muted, ...TYPOGRAPHY.tiny, marginBottom: 1 },
  infoRowText: { color: COLORS.text, ...TYPOGRAPHY.body, fontWeight: '500' },
  profileAction: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.borderSoft,
  },
  lastRow: { borderBottomWidth: 0 },
  profileActionContent: { flex: 1, minWidth: 0, paddingRight: SPACING.sm },
  profileActionText: { color: COLORS.text, ...TYPOGRAPHY.body, fontWeight: '600' },
  profileActionDescription: { color: COLORS.muted, ...TYPOGRAPHY.tiny, marginTop: 2 },
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
    minHeight: 44,
    flex: 1, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.sm, padding: 9, alignItems: 'center',
  },
  langueBtnActive: { borderColor: COLORS.bxBlueLight, backgroundColor: COLORS.softBlue },
  langueBtnText: { ...TYPOGRAPHY.caption, color: COLORS.muted, fontWeight: '600' },
  langueBtnTextActive: { color: COLORS.bxBlue, fontWeight: '900' },
  editActions: { flexDirection: 'row', gap: SPACING.sm },
  btnSave: {
    minHeight: 44, flex: 1, backgroundColor: COLORS.bxBlue, paddingVertical: 12,
    borderRadius: BORDER_RADIUS.md, alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: 7,
  },
  btnDisabled: { backgroundColor: '#94a3b8', opacity: 0.7 },
  btnSaveText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  btnCancel: {
    minHeight: 44, flex: 1, backgroundColor: '#f1f5f9', paddingVertical: 12,
    borderRadius: BORDER_RADIUS.md, alignItems: 'center',
  },
  btnCancelText: { color: COLORS.muted, fontWeight: '700', fontSize: 14 },
  btnLogout: {
    width: '100%',
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center', flexDirection: 'row', gap: 8,
    marginTop: SPACING.xs,
    backgroundColor: COLORS.softRed,
  },
  btnLogoutText: { color: COLORS.danger, fontWeight: '700', fontSize: 14, lineHeight: 19 },
  legalCard: { marginBottom: SPACING.lg },
  legalAction: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSoft,
  },
  legalActionIcon: {
    width: 32,
    height: 32,
    borderRadius: BORDER_RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    marginRight: SPACING.md,
  },
  legalActionText: { flex: 1, color: COLORS.text, ...TYPOGRAPHY.body, fontWeight: '500' },
  legalVersion: {
    color: COLORS.muted,
    ...TYPOGRAPHY.tiny,
    marginTop: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.borderSoft,
  },
  pushCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    minHeight: 80,
  },
  pushIcon: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.softBlue,
    marginRight: SPACING.md,
  },
  pushContent: { flex: 1, paddingRight: SPACING.sm },
  pushLabel: { color: COLORS.text, ...TYPOGRAPHY.body, fontWeight: '700' },
  pushHint: { color: COLORS.muted, ...TYPOGRAPHY.tiny, marginTop: 2 },
});
