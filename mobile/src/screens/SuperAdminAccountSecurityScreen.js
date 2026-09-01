import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import AppIcon from '../components/AppIcon';
import { Card, COLORS } from '../components/MobileUI';
import { useAuth } from '../context/AuthContext';
import { changeAppLanguage } from '../i18n';

const LANGUAGES = ['fr', 'nl', 'en'];

export default function SuperAdminAccountSecurityScreen() {
  const { role, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const [form, setForm] = useState({ current: '', next: '', confirmation: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const passwordChecks = [
    form.next.length >= 8,
    /[A-Z]/.test(form.next),
    /\d/.test(form.next),
  ];

  const submit = async () => {
    setError('');
    if (!form.current || !form.next || !form.confirmation) {
      setError(t('superAdmin.account.errors.required'));
      return;
    }
    if (!passwordChecks.every(Boolean)) {
      setError(t('auth.error_password_requirements'));
      return;
    }
    if (form.next !== form.confirmation) {
      setError(t('auth.error_passwords'));
      return;
    }

    setLoading(true);
    try {
      await api.put('/users/me/password', {
        ancienMotDePasse: form.current,
        nouveauMotDePasse: form.next,
      });
      await logout(t('superAdmin.account.reloginRequired'));
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        setError(t('errors.session_expired'));
      } else if (requestError.response?.status === 403) {
        setError(t('errors.forbidden'));
      } else {
        setError(t('superAdmin.account.errors.changeFailed'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={88}
    >
      <ScrollView
        style={styles.page}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.heading}>
          <View style={styles.headingIcon}>
            <AppIcon name="lock" size={22} color={COLORS.bxBlue} />
          </View>
          <View style={styles.headingText}>
            <Text style={styles.title}>{t('superAdmin.account.title')}</Text>
            <Text style={styles.subtitle}>{t('superAdmin.account.subtitle')}</Text>
          </View>
        </View>

        <Card style={styles.card}>
          <Text style={styles.roleLabel}>{t('superAdmin.account.technicalRole')}</Text>
          <Text style={styles.roleValue}>{role}</Text>
        </Card>

        <Card style={styles.card}>
          {error ? (
            <View style={styles.errorBox} accessibilityRole="alert">
              <AppIcon name="warning" size={18} color={COLORS.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <PasswordField
            label={t('superAdmin.account.currentPassword')}
            value={form.current}
            onChangeText={(current) => setForm((value) => ({ ...value, current }))}
            editable={!loading}
          />
          <PasswordField
            label={t('superAdmin.account.newPassword')}
            value={form.next}
            onChangeText={(next) => setForm((value) => ({ ...value, next }))}
            editable={!loading}
          />
          <PasswordField
            label={t('superAdmin.account.confirmPassword')}
            value={form.confirmation}
            onChangeText={(confirmation) => setForm((value) => ({ ...value, confirmation }))}
            editable={!loading}
            returnKeyType="done"
            onSubmitEditing={submit}
          />

          <View style={styles.rules} accessibilityLabel={t('superAdmin.account.passwordRules')}>
            <Text style={styles.rulesTitle}>{t('superAdmin.account.passwordRules')}</Text>
            <PasswordRule valid={passwordChecks[0]} text={t('auth.password_rule_length')} />
            <PasswordRule valid={passwordChecks[1]} text={t('auth.password_rule_uppercase')} />
            <PasswordRule valid={passwordChecks[2]} text={t('auth.password_rule_digit')} />
          </View>

          <TouchableOpacity
            style={[styles.submit, loading && styles.disabled]}
            onPress={submit}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel={t('superAdmin.account.submit')}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>{t('superAdmin.account.submit')}</Text>}
          </TouchableOpacity>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.languageTitle}>{t('profile.language')}</Text>
          <View style={styles.languages}>
            {LANGUAGES.map((language) => {
              const selected = i18n.language.startsWith(language);
              return (
                <TouchableOpacity
                  key={language}
                  style={[styles.languageButton, selected && styles.languageButtonActive]}
                  onPress={() => changeAppLanguage(language)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={t(`common.language_${language}`)}
                >
                  <Text style={[styles.languageText, selected && styles.languageTextActive]}>
                    {t(`common.language_${language}`)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        <TouchableOpacity
          style={styles.logout}
          onPress={() => logout()}
          accessibilityRole="button"
          accessibilityLabel={t('profile.logout')}
        >
          <AppIcon name="log-out-outline" size={20} color={COLORS.danger} />
          <Text style={styles.logoutText}>{t('profile.logout')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function PasswordField({ label, ...props }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        style={styles.input}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel={label}
      />
    </View>
  );
}

function PasswordRule({ valid, text }) {
  return (
    <View style={styles.rule}>
      <AppIcon name={valid ? 'checkmark-circle-outline' : 'ellipse-outline'} size={16} color={valid ? COLORS.success : COLORS.muted} />
      <Text style={[styles.ruleText, valid && styles.ruleTextValid]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.page },
  content: { padding: 16, paddingBottom: 36, width: '100%', maxWidth: 720, alignSelf: 'center' },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  headingIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' },
  headingText: { flex: 1, minWidth: 0 },
  title: { color: COLORS.bxBlue, fontSize: 22, lineHeight: 28, fontWeight: '900' },
  subtitle: { color: COLORS.muted, fontSize: 13, lineHeight: 19, marginTop: 3 },
  card: { marginBottom: 14 },
  roleLabel: { color: COLORS.muted, fontSize: 12, fontWeight: '700' },
  roleValue: { color: COLORS.bxBlue, fontSize: 16, fontWeight: '900', marginTop: 4 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 11, borderRadius: 12, backgroundColor: '#fef2f2', marginBottom: 14 },
  errorText: { flex: 1, color: COLORS.danger, fontSize: 13, lineHeight: 18 },
  field: { marginBottom: 14 },
  label: { color: COLORS.text, fontSize: 13, fontWeight: '800', marginBottom: 7 },
  input: { minHeight: 48, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 13, color: COLORS.text, backgroundColor: '#fff', fontSize: 16 },
  rules: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, gap: 5, marginBottom: 16 },
  rulesTitle: { color: COLORS.text, fontSize: 12, fontWeight: '900', marginBottom: 2 },
  rule: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  ruleText: { color: COLORS.muted, fontSize: 12, lineHeight: 17, flex: 1 },
  ruleTextValid: { color: '#166534' },
  submit: { minHeight: 48, borderRadius: 13, backgroundColor: COLORS.bxBlue, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  submitText: { color: '#fff', fontSize: 14, fontWeight: '900', textAlign: 'center' },
  disabled: { opacity: 0.6 },
  languageTitle: { color: COLORS.text, fontSize: 14, fontWeight: '900', marginBottom: 10 },
  languages: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  languageButton: { minHeight: 44, minWidth: 72, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  languageButtonActive: { borderColor: COLORS.bxBlue, backgroundColor: '#eff6ff' },
  languageText: { color: COLORS.muted, fontSize: 13, fontWeight: '800' },
  languageTextActive: { color: COLORS.bxBlue },
  logout: { minHeight: 48, borderRadius: 13, borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  logoutText: { color: COLORS.danger, fontSize: 14, fontWeight: '900' },
});
