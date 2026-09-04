import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
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
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import AppIcon from '../components/AppIcon';
import { COLORS } from '../components/MobileUI';

export default function LoginScreen({ navigation }) {
  const { login, postLogoutNotice } = useAuth();
  const { t } = useTranslation();
  const [form, setForm] = useState({ email: '', motDePasse: '' });
  const [focusedField, setFocusedField] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');
    if (!form.email.trim() || !form.motDePasse.trim()) {
      setError(t('auth.error_required'));
      return;
    }
    setLoading(true);
    try {
      const response = await api.post('/auth/login', {
        email: form.email.trim(),
        motDePasse: form.motDePasse,
      });
      const { token, prenom, nom, email, role } = response.data;
      await login(token, { prenom, nom, email, role });
    } catch (requestError) {
      setError(getApiError(requestError, t('auth.error_login'), t));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.identity}>
          <Image
            source={require('../../assets/images/logo-bx-connect.png')}
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel="BX-Connect"
          />
          <Text style={styles.title}>{t('auth.login_btn')}</Text>
          <Text style={styles.subtitle}>{t('auth.login_subtitle')}</Text>
        </View>

        <View style={styles.formCard}>
          {error !== '' && (
            <View style={styles.errorBox} accessibilityRole="alert">
              <AppIcon name="warning" size={18} color={COLORS.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {postLogoutNotice !== '' && (
            <View style={styles.successBox} accessibilityRole="alert">
              <AppIcon name="checkmark-circle-outline" size={18} color={COLORS.success} />
              <Text style={styles.successText}>{postLogoutNotice}</Text>
            </View>
          )}

          <View style={styles.field}>
            <Text style={styles.label}>{t('auth.email')}</Text>
            <View style={[styles.inputShell, focusedField === 'email' && styles.inputShellFocused]}>
              <AppIcon name="mail-outline" size={20} color={focusedField === 'email' ? COLORS.bxBlue : COLORS.muted} />
              <TextInput
                style={styles.input}
                placeholder={t('auth.email_placeholder')}
                placeholderTextColor="#94a3b8"
                value={form.email}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField('')}
                onChangeText={(value) => setForm((current) => ({ ...current, email: value }))}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="next"
                accessibilityLabel={t('auth.email')}
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>{t('auth.password')}</Text>
            <View style={[styles.inputShell, focusedField === 'password' && styles.inputShellFocused]}>
              <AppIcon name="lock" size={20} color={focusedField === 'password' ? COLORS.bxBlue : COLORS.muted} />
              <TextInput
                style={styles.input}
                placeholder={t('auth.password_placeholder')}
                placeholderTextColor="#94a3b8"
                value={form.motDePasse}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField('')}
                onChangeText={(value) => setForm((current) => ({ ...current, motDePasse: value }))}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="current-password"
                textContentType="password"
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                accessibilityLabel={t('auth.password')}
              />
              <TouchableOpacity
                style={styles.passwordToggle}
                onPress={() => setShowPassword((visible) => !visible)}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? t('auth.hide_password') : t('auth.show_password')}
              >
                <AppIcon
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={21}
                  color={focusedField === 'password' ? COLORS.bxBlue : COLORS.muted}
                />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.forgotButton}
              onPress={() => navigation.navigate('ForgotPassword')}
              accessibilityRole="link"
            >
              <Text style={styles.forgotText}>{t('auth.forgot_password')}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.loginButton, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel={t('auth.login_btn')}
            accessibilityState={{ disabled: loading, busy: loading }}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.loginButtonText}>{t('auth.login_btn')}</Text>}
          </TouchableOpacity>

          <View style={styles.registerRow}>
            <Text style={styles.registerPrompt}>{t('auth.no_account')}</Text>
            <TouchableOpacity
              style={styles.inlineLink}
              onPress={() => navigation.navigate('Register')}
              accessibilityRole="link"
            >
              <Text style={styles.inlineLinkText}>{t('navigation.createAccount')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={styles.activitiesLink}
          onPress={() => navigation.navigate('Activities')}
          accessibilityRole="link"
        >
          <AppIcon name="activity" size={17} color={COLORS.bxBlueLight} />
          <Text style={styles.activitiesLinkText}>{t('auth.view_activities_guest')}</Text>
        </TouchableOpacity>

        <View style={styles.legalLinks}>
          <Text style={styles.legalLink} onPress={() => navigation.navigate('LegalTerms')}>{t('legal.links.terms')}</Text>
          <Text style={styles.legalLink} onPress={() => navigation.navigate('LegalPrivacy')}>{t('legal.links.privacy')}</Text>
          <Text style={styles.legalLink} onPress={() => navigation.navigate('LegalNotices')}>{t('legal.links.notices')}</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function getApiError(error, fallback, t) {
  if (error.response?.status === 403) return t('errors.forbidden');
  return fallback;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.page },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 18, paddingTop: 18, paddingBottom: 28 },
  identity: { alignItems: 'center', marginBottom: 20 },
  logo: { width: 176, height: 48, marginBottom: 18 },
  title: { color: COLORS.text, fontSize: 26, lineHeight: 33, fontWeight: '900', textAlign: 'center' },
  subtitle: { color: COLORS.muted, fontSize: 14, lineHeight: 20, marginTop: 5, textAlign: 'center' },
  formCard: { width: '100%', maxWidth: 520, alignSelf: 'center', backgroundColor: COLORS.surface, borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, padding: 18 },
  errorBox: { backgroundColor: COLORS.softRed, borderWidth: 1, borderColor: '#fecaca', borderRadius: 13, padding: 12, marginBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 8 },
  errorText: { color: '#991b1b', fontSize: 13, lineHeight: 18, flex: 1 },
  successBox: { backgroundColor: COLORS.softGreen, borderWidth: 1, borderColor: '#a7f3d0', borderRadius: 13, padding: 12, marginBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 8 },
  successText: { color: '#166534', fontSize: 13, lineHeight: 18, flex: 1 },
  field: { marginBottom: 14 },
  label: { color: '#334155', fontSize: 14, lineHeight: 19, fontWeight: '800', marginBottom: 7 },
  inputShell: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderColor: '#cbd5e1', borderRadius: 14, backgroundColor: '#f8fafc', paddingHorizontal: 13 },
  inputShellFocused: { borderColor: COLORS.bxBlueLight, backgroundColor: '#fff' },
  input: { flex: 1, minHeight: 48, color: COLORS.text, fontSize: 16, paddingVertical: 10 },
  passwordToggle: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: -8 },
  forgotButton: { minHeight: 44, alignSelf: 'flex-end', justifyContent: 'center', paddingLeft: 12 },
  forgotText: { color: COLORS.bxBlueLight, fontSize: 13, lineHeight: 18, fontWeight: '700' },
  loginButton: { minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: COLORS.bxBlue, marginTop: 2 },
  buttonDisabled: { backgroundColor: '#94a3b8' },
  loginButtonText: { color: '#fff', fontSize: 15, lineHeight: 20, fontWeight: '900' },
  registerRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', marginTop: 14 },
  registerPrompt: { color: COLORS.muted, fontSize: 13, lineHeight: 20 },
  inlineLink: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 5 },
  inlineLinkText: { color: COLORS.bxBlueLight, fontSize: 13, lineHeight: 20, fontWeight: '800' },
  activitiesLink: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 14, paddingHorizontal: 10 },
  activitiesLinkText: { flexShrink: 1, color: COLORS.bxBlueLight, fontSize: 13, lineHeight: 19, fontWeight: '700', textAlign: 'center' },
  legalLinks: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: 4 },
  legalLink: { color: COLORS.muted, fontSize: 11, lineHeight: 18, fontWeight: '700', paddingVertical: 8 },
});
