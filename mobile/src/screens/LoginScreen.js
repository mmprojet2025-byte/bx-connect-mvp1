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
  useWindowDimensions,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import AppIcon from '../components/AppIcon';
import { COLORS } from '../components/MobileUI';

const benefits = [
  { labelKey: 'auth.benefit_activities', icon: 'activity' },
  { labelKey: 'auth.benefit_groups', icon: 'group' },
  { labelKey: 'auth.benefit_projects', icon: 'project' },
  { labelKey: 'auth.benefit_messages', icon: 'message' },
];

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const { t } = useTranslation();
  const { height } = useWindowDimensions();

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
      const res = await api.post('/auth/login', {
        email: form.email.trim(),
        motDePasse: form.motDePasse,
      });
      const { token, prenom, nom, email, role } = res.data;
      await login(token, { prenom, nom, email, role });
    } catch (err) {
      setError(getApiError(err, t('auth.error_login'), t));
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
        keyboardShouldPersistTaps="handled"
      >
      <View style={[styles.hero, { minHeight: Math.max(220, height * 0.3) }]}>
        <View style={styles.visualBlock}>
          <Image
            source={require('../../assets/images/logo-bx-connect.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.slogan}>{t('brand.slogan')}</Text>
        <Text style={styles.heroTitle}>{t('auth.login_hero_title')}</Text>
        <Text style={styles.heroText}>{t('auth.login_hero_text')}</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.formTitle}>{t('auth.login_btn')}</Text>
            <Text style={styles.formSubtitle}>{t('auth.login_subtitle')}</Text>
          </View>
          <View style={styles.secureBadge}>
            <AppIcon name="shield" size={15} color={COLORS.success} />
            <Text style={styles.secureBadgeText}>{t('auth.secure')}</Text>
          </View>
        </View>

        {error !== '' && (
          <View style={styles.errorBox}>
            <AppIcon name="warning" size={17} color={COLORS.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.field}>
          <Text style={styles.label}>{t('auth.email')}</Text>
          <View style={[styles.inputShell, focusedField === 'email' && styles.inputShellFocused]}>
            <AppIcon name="mail-outline" size={20} color={focusedField === 'email' ? COLORS.bxBlue : '#64748b'} />
            <TextInput
              style={styles.input}
              placeholder={t('auth.email_placeholder')}
              placeholderTextColor="#94a3b8"
              value={form.email}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField('')}
              onChangeText={(val) => setForm({ ...form, email: val })}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t('auth.password')}</Text>
          <View style={[styles.inputShell, focusedField === 'password' && styles.inputShellFocused]}>
            <AppIcon name="lock" size={20} color={focusedField === 'password' ? COLORS.bxBlue : '#64748b'} />
            <TextInput
              style={styles.input}
              placeholder={t('auth.password_placeholder')}
              placeholderTextColor="#94a3b8"
              value={form.motDePasse}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField('')}
              onChangeText={(val) => setForm({ ...form, motDePasse: val })}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.passwordToggle}
              onPress={() => setShowPassword((visible) => !visible)}
              activeOpacity={0.72}
            >
              <AppIcon
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={focusedField === 'password' ? COLORS.bxBlue : '#64748b'}
              />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.btnLogin, loading && styles.btnDisabled]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.88}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.btnLoginText}>{t('auth.login_btn')}</Text>
              <AppIcon name="chevron-forward-outline" size={18} color="#fff" />
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.btnRegister}
          onPress={() => navigation.navigate('Register')}
          activeOpacity={0.86}
        >
          <Text style={styles.btnRegisterText}>{t('auth.create_free_account')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.benefitsBlock}>
        <Text style={styles.benefitsTitle}>{t('auth.benefits_title')}</Text>
        <View style={styles.benefitsGrid}>
          {benefits.map((benefit) => (
            <View key={benefit.labelKey} style={styles.benefitPill}>
              <AppIcon name={benefit.icon} size={16} color={COLORS.bxBlue} />
              <Text style={styles.benefitText}>{t(benefit.labelKey)}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.footerActions}>
        <TouchableOpacity style={styles.linkBtn} onPress={() => navigation.navigate('Activities')}>
          <AppIcon name="activity" size={16} color={COLORS.info} />
          <Text style={styles.linkText}>{t('auth.view_activities_guest')}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.backText}>{t('auth.back_home')}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.legalLinks}>
        <Text style={styles.legalLink} onPress={() => navigation.navigate('LegalTerms')}>{t('legal.links.terms')}</Text>
        <Text style={styles.legalLink} onPress={() => navigation.navigate('LegalPrivacy')}>{t('legal.links.privacy')}</Text>
        <Text style={styles.legalLink} onPress={() => navigation.navigate('LegalNotices')}>{t('legal.links.notices')}</Text>
      </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function getApiError(err, fallback, t) {
  if (err.response?.status === 403) return t('errors.forbidden');
  return fallback;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.page },
  content: { paddingBottom: 30 },
  hero: {
    backgroundColor: COLORS.bxBlue,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 54,
    justifyContent: 'flex-end',
    shadowColor: COLORS.bxBlue,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 4,
  },
  visualBlock: { height: 44, marginBottom: 7, justifyContent: 'center' },
  logoImage: { width: 152, height: 44 },
  slogan: { color: COLORS.info, fontSize: 12, fontWeight: '900', marginBottom: 5 },
  heroTitle: { color: '#fff', fontSize: 22, lineHeight: 27, fontWeight: '900' },
  heroText: { color: '#DBEAFE', fontSize: 12, lineHeight: 17, marginTop: 6 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    padding: 17,
    marginHorizontal: 14,
    marginTop: -38,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.09,
    shadowRadius: 14,
    elevation: 3,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 13 },
  formTitle: { color: COLORS.bxBlue, fontSize: 20, fontWeight: '900', marginBottom: 2 },
  formSubtitle: { color: COLORS.muted, fontSize: 12, lineHeight: 16 },
  secureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.softGreen,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  secureBadgeText: { color: COLORS.success, fontSize: 11, fontWeight: '900' },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 16,
    padding: 12,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorText: { color: COLORS.danger, fontSize: 13, flex: 1, lineHeight: 18 },
  field: { marginBottom: 11 },
  label: { fontSize: 13, fontWeight: '900', color: '#334155', marginBottom: 8 },
  inputShell: {
    borderWidth: 1.5,
    borderColor: '#dbe3ef',
    borderRadius: 14,
    paddingHorizontal: 14,
    minHeight: 48,
    backgroundColor: '#f8fafc',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  inputShellFocused: {
    borderColor: COLORS.info,
    backgroundColor: '#fff',
    shadowColor: COLORS.info,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 2,
  },
  input: { flex: 1, fontSize: 15, color: '#0f172a', paddingVertical: 9 },
  passwordToggle: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnLogin: {
    backgroundColor: COLORS.bxBlue,
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    shadowColor: COLORS.bxBlue,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 4,
  },
  btnDisabled: { backgroundColor: '#94a3b8', shadowOpacity: 0 },
  btnLoginText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  btnRegister: {
    minHeight: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  btnRegisterText: { color: COLORS.bxBlue, fontWeight: '900', fontSize: 14 },
  benefitsBlock: { marginTop: 18, paddingHorizontal: 18 },
  benefitsTitle: { color: COLORS.bxBlue, fontSize: 15, fontWeight: '900', marginBottom: 10 },
  benefitsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  benefitPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  benefitText: { color: COLORS.bxBlue, fontSize: 12, fontWeight: '900' },
  footerActions: { marginTop: 12, alignItems: 'center', paddingHorizontal: 18 },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  linkText: { color: COLORS.info, fontSize: 13, fontWeight: '800' },
  backBtn: { paddingVertical: 8 },
  backText: { color: COLORS.muted, fontSize: 13, fontWeight: '700' },
  legalLinks: {
    paddingHorizontal: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginTop: 4,
  },
  legalLink: { color: COLORS.muted, fontSize: 11, fontWeight: '700' },
});
