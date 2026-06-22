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
import { LEGAL_VERSION } from '../constants/legal';

const benefits = [
  { labelKey: 'auth.benefit_activities', icon: 'activity' },
  { labelKey: 'auth.benefit_groups', icon: 'group' },
  { labelKey: 'auth.benefit_projects', icon: 'project' },
  { labelKey: 'auth.benefit_messages', icon: 'message' },
];

export default function RegisterScreen({ navigation }) {
  const { login } = useAuth();
  const { t } = useTranslation();
  const { height } = useWindowDimensions();
  const [form, setForm] = useState({
    prenom: '',
    nom: '',
    email: '',
    motDePasse: '',
    confirmation: '',
  });
  const [focusedField, setFocusedField] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [legalAccepted, setLegalAccepted] = useState(false);
  const passwordChecks = getPasswordChecks(form.motDePasse);
  const passwordStrength = getPasswordStrength(passwordChecks);

  const handleRegister = async () => {
    setError('');
    if (!form.prenom.trim()) return setError(t('auth.error_firstname_required'));
    if (!form.nom.trim()) return setError(t('auth.error_lastname_required'));
    if (!form.email.trim()) return setError(t('auth.error_email_required'));
    if (!isValidEmail(form.email)) return setError(t('auth.error_email_invalid'));
    if (!form.motDePasse) return setError(t('auth.error_password_required'));
    if (!form.confirmation) return setError(t('auth.error_confirmation_required'));
    if (form.motDePasse !== form.confirmation) {
      setError(t('auth.error_passwords'));
      return;
    }
    if (!passwordChecks.every(Boolean)) {
      setError(t('auth.error_password_requirements'));
      return;
    }
    if (!legalAccepted) {
      setError(t('legal.acceptanceRequired'));
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/register', {
        prenom: form.prenom.trim(),
        nom: form.nom.trim(),
        email: form.email.trim(),
        motDePasse: form.motDePasse,
        termsAccepted: true,
        privacyAccepted: true,
        legalVersion: LEGAL_VERSION,
      });
      const { token, prenom, nom, email, role } = res.data;
      await login(token, { prenom, nom, email, role });
    } catch (err) {
      setError(getApiError(err, t('auth.error_register'), t));
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
      <View style={[styles.hero, { minHeight: Math.max(210, height * 0.28) }]}>
        <View style={styles.visualBlock}>
          <Image
            source={require('../../assets/images/logo-bx-connect.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.slogan}>{t('brand.slogan')}</Text>
        <Text style={styles.heroTitle}>{t('auth.register_hero_title')}</Text>
        <Text style={styles.heroText}>{t('auth.register_hero_text')}</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.formTitle}>{t('auth.register_btn')}</Text>
            <Text style={styles.formSubtitle}>{t('auth.register_subtitle')}</Text>
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

        <View style={styles.row}>
          <View style={[styles.field, styles.halfField]}>
            <Text style={styles.label}>{t('auth.firstname')} *</Text>
            <View style={[styles.inputShell, focusedField === 'prenom' && styles.inputShellFocused]}>
              <TextInput
                style={styles.input}
                value={form.prenom}
                onFocus={() => setFocusedField('prenom')}
                onBlur={() => setFocusedField('')}
                onChangeText={(v) => setForm({ ...form, prenom: v })}
                autoCapitalize="words"
              />
            </View>
          </View>
          <View style={[styles.field, styles.halfField]}>
            <Text style={styles.label}>{t('auth.lastname')} *</Text>
            <View style={[styles.inputShell, focusedField === 'nom' && styles.inputShellFocused]}>
              <TextInput
                style={styles.input}
                value={form.nom}
                onFocus={() => setFocusedField('nom')}
                onBlur={() => setFocusedField('')}
                onChangeText={(v) => setForm({ ...form, nom: v })}
                autoCapitalize="words"
              />
            </View>
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t('auth.email')} *</Text>
          <View style={[styles.inputShell, focusedField === 'email' && styles.inputShellFocused]}>
            <AppIcon name="mail-outline" size={20} color={focusedField === 'email' ? COLORS.bxBlue : '#64748b'} />
            <TextInput
              style={styles.input}
              value={form.email}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField('')}
              onChangeText={(v) => setForm({ ...form, email: v })}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder={t('auth.email_placeholder')}
              placeholderTextColor="#94a3b8"
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t('auth.password')} *</Text>
          <View style={[styles.inputShell, focusedField === 'password' && styles.inputShellFocused]}>
            <AppIcon name="lock" size={20} color={focusedField === 'password' ? COLORS.bxBlue : '#64748b'} />
            <TextInput
              style={styles.input}
              value={form.motDePasse}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField('')}
              onChangeText={(v) => setForm({ ...form, motDePasse: v })}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              placeholder={t('auth.password_placeholder')}
              placeholderTextColor="#94a3b8"
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
          <PasswordHelp checks={passwordChecks} strength={passwordStrength} t={t} />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t('auth.confirm_password')} *</Text>
          <View style={[styles.inputShell, focusedField === 'confirmation' && styles.inputShellFocused]}>
            <AppIcon name="check" size={20} color={focusedField === 'confirmation' ? COLORS.bxBlue : '#64748b'} />
            <TextInput
              style={styles.input}
              value={form.confirmation}
              onFocus={() => setFocusedField('confirmation')}
              onBlur={() => setFocusedField('')}
              onChangeText={(v) => setForm({ ...form, confirmation: v })}
              secureTextEntry={!showConfirmation}
              autoCapitalize="none"
              placeholder={t('auth.confirm_password')}
              placeholderTextColor="#94a3b8"
            />
            <TouchableOpacity
              style={styles.passwordToggle}
              onPress={() => setShowConfirmation((visible) => !visible)}
              activeOpacity={0.72}
            >
              <AppIcon
                name={showConfirmation ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={focusedField === 'confirmation' ? COLORS.bxBlue : '#64748b'}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.legalRow}>
          <TouchableOpacity
            style={[styles.checkbox, legalAccepted && styles.checkboxChecked]}
            onPress={() => setLegalAccepted(value => !value)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: legalAccepted }}
          >
            {legalAccepted && <AppIcon name="check" size={15} color="#fff" />}
          </TouchableOpacity>
          <Text style={styles.legalText}>
            {t('legal.acceptancePrefix')}{' '}
            <Text style={styles.legalLink} onPress={() => navigation.navigate('LegalTerms')}>
              {t('legal.links.terms')}
            </Text>{' '}
            {t('legal.acceptanceAnd')}{' '}
            <Text style={styles.legalLink} onPress={() => navigation.navigate('LegalPrivacy')}>
              {t('legal.links.privacy')}
            </Text>.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleRegister}
          disabled={loading}
          activeOpacity={0.88}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.btnText}>{t('auth.register_btn')}</Text>
              <AppIcon name="chevron-forward-outline" size={18} color="#fff" />
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.link} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.linkText}>{t('auth.already_account')}</Text>
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

      <TouchableOpacity style={styles.back} onPress={() => navigation.navigate('Home')}>
        <Text style={styles.backText}>{t('auth.back_home_short')}</Text>
      </TouchableOpacity>
      <LegalLinks navigation={navigation} t={t} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function PasswordHelp({ checks, strength, t }) {
  const color = {
    weak: COLORS.danger,
    medium: COLORS.warning,
    strong: COLORS.success,
  }[strength] || COLORS.muted;

  return (
    <View style={styles.passwordHelp}>
      {strength ? (
        <Text style={[styles.passwordStrength, { color }]}>
          {t(`auth.password_strength_${strength}`)}
        </Text>
      ) : null}
      <PasswordRule valid={checks[0]} text={t('auth.password_rule_length')} />
      <PasswordRule valid={checks[1]} text={t('auth.password_rule_uppercase')} />
      <PasswordRule valid={checks[2]} text={t('auth.password_rule_digit')} />
    </View>
  );
}

function PasswordRule({ valid, text }) {
  return (
    <View style={styles.passwordRule}>
      <AppIcon
        name={valid ? 'checkmark-circle' : 'ellipse-outline'}
        size={13}
        color={valid ? COLORS.success : '#94a3b8'}
      />
      <Text style={[styles.passwordRuleText, valid && styles.passwordRuleValid]}>{text}</Text>
    </View>
  );
}

function getPasswordChecks(password) {
  return [
    password.length >= 8,
    /[A-Z]/.test(password),
    /\d/.test(password),
  ];
}

function getPasswordStrength(checks) {
  const score = checks.filter(Boolean).length;
  if (score === 0) return '';
  if (score === 1) return 'weak';
  if (score === 2) return 'medium';
  return 'strong';
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function LegalLinks({ navigation, t }) {
  return (
    <View style={styles.legalLinks}>
      <Text style={styles.legalFooterLink} onPress={() => navigation.navigate('LegalTerms')}>{t('legal.links.terms')}</Text>
      <Text style={styles.legalFooterLink} onPress={() => navigation.navigate('LegalPrivacy')}>{t('legal.links.privacy')}</Text>
      <Text style={styles.legalFooterLink} onPress={() => navigation.navigate('LegalNotices')}>{t('legal.links.notices')}</Text>
    </View>
  );
}

function getApiError(err, fallback, t) {
  if (err.response?.status === 403) return t('errors.forbidden');
  const message = err.response?.data?.message?.toLowerCase() || '';
  if (message.includes('existe')) return t('auth.error_email_exists');
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
    paddingBottom: 52,
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
  row: { flexDirection: 'row', gap: 10 },
  halfField: { flex: 1 },
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
  passwordHelp: {
    borderRadius: 14,
    backgroundColor: COLORS.page,
    paddingHorizontal: 11,
    paddingVertical: 9,
    marginTop: 8,
    gap: 4,
  },
  passwordStrength: { fontSize: 12, fontWeight: '900', marginBottom: 2 },
  passwordRule: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  passwordRuleText: { color: COLORS.muted, fontSize: 11, lineHeight: 16 },
  passwordRuleValid: { color: '#15803d' },
  legalRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    backgroundColor: COLORS.page,
    padding: 12,
    marginBottom: 15,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.info,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: COLORS.bxBlue, borderColor: COLORS.bxBlue },
  legalText: { flex: 1, color: COLORS.muted, fontSize: 12, lineHeight: 18 },
  legalLink: { color: COLORS.bxBlueLight, fontWeight: '900' },
  btn: {
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
  btnText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  link: { marginTop: 16, alignItems: 'center', paddingVertical: 6 },
  linkText: { color: COLORS.info, fontSize: 13, fontWeight: '900' },
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
  back: { marginTop: 12, alignItems: 'center', paddingVertical: 8, paddingHorizontal: 18 },
  backText: { color: COLORS.muted, fontSize: 13, fontWeight: '700' },
  legalLinks: {
    marginTop: 4,
    paddingHorizontal: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  legalFooterLink: { color: COLORS.muted, fontSize: 11, fontWeight: '700' },
});
