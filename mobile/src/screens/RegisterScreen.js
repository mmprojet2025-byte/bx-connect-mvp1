import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
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
  { label: 'Activités', icon: 'activity' },
  { label: 'Groupes', icon: 'group' },
  { label: 'Projets', icon: 'project' },
  { label: 'Messages', icon: 'message' },
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

  const handleRegister = async () => {
    setError('');
    if (!form.prenom.trim() || !form.nom.trim() || !form.email.trim() || !form.motDePasse.trim()) {
      setError(t('auth.error_required'));
      return;
    }
    if (form.motDePasse !== form.confirmation) {
      setError(t('auth.error_passwords'));
      return;
    }
    if (form.motDePasse.length < 8) {
      setError(t('auth.error_password_min'));
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={[styles.hero, { minHeight: Math.max(260, height * 0.36) }]}>
        <View style={styles.visualBlock}>
          <View style={styles.logoShell}>
            <Image source={require('../../assets/icon.png')} style={styles.logoImage} />
          </View>
          <View style={styles.communityOrbit}>
            <AppIcon name="group" size={18} color="#fff" />
          </View>
          <View style={styles.activityOrbit}>
            <AppIcon name="project" size={17} color="#fff" />
          </View>
        </View>

        <Text style={styles.logo}>BX-CONNECT</Text>
        <Text style={styles.slogan}>Connecter • Inspirer • Impacter</Text>
        <Text style={styles.heroTitle}>Rejoins la communauté BX-Connect</Text>
        <Text style={styles.heroText}>
          Crée ton compte pour retrouver tes activités, tes groupes, tes projets et tes messages.
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.formTitle}>{t('auth.register_btn')}</Text>
            <Text style={styles.formSubtitle}>Quelques informations pour ouvrir ton espace.</Text>
          </View>
          <View style={styles.secureBadge}>
            <AppIcon name="shield" size={15} color={COLORS.success} />
            <Text style={styles.secureBadgeText}>Sécurisé</Text>
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

        <View style={styles.field}>
          <Text style={styles.label}>{t('auth.password_min_label')}</Text>
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
        <Text style={styles.benefitsTitle}>Pourquoi BX-Connect ?</Text>
        <View style={styles.benefitsGrid}>
          {benefits.map((benefit) => (
            <View key={benefit.label} style={styles.benefitPill}>
              <AppIcon name={benefit.icon} size={16} color={COLORS.bxBlue} />
              <Text style={styles.benefitText}>{benefit.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <TouchableOpacity style={styles.back} onPress={() => navigation.navigate('Home')}>
        <Text style={styles.backText}>{t('auth.back_home_short')}</Text>
      </TouchableOpacity>
      <LegalLinks navigation={navigation} t={t} />
    </ScrollView>
  );
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
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 76,
    justifyContent: 'flex-end',
    shadowColor: COLORS.bxBlue,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 4,
  },
  visualBlock: { height: 82, marginBottom: 12 },
  logoShell: {
    width: 70,
    height: 70,
    borderRadius: 24,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 4,
  },
  logoImage: { width: 49, height: 49, borderRadius: 14 },
  communityOrbit: {
    position: 'absolute',
    left: 60,
    top: 8,
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: COLORS.info,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.bxBlue,
  },
  activityOrbit: {
    position: 'absolute',
    left: 32,
    top: 52,
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: COLORS.impactOrange,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.bxBlue,
  },
  logo: { color: '#BAE6FD', fontSize: 12, fontWeight: '900', letterSpacing: 1.1, marginBottom: 5 },
  slogan: { color: COLORS.info, fontSize: 13, fontWeight: '900', marginBottom: 8 },
  heroTitle: { color: '#fff', fontSize: 26, lineHeight: 32, fontWeight: '900' },
  heroText: { color: '#DBEAFE', fontSize: 14, lineHeight: 21, marginTop: 9 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 28,
    padding: 22,
    marginHorizontal: 18,
    marginTop: -52,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.09,
    shadowRadius: 14,
    elevation: 3,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 18 },
  formTitle: { color: COLORS.bxBlue, fontSize: 23, fontWeight: '900', marginBottom: 3 },
  formSubtitle: { color: COLORS.muted, fontSize: 13, lineHeight: 18 },
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
  field: { marginBottom: 15 },
  label: { fontSize: 13, fontWeight: '900', color: '#334155', marginBottom: 8 },
  inputShell: {
    borderWidth: 1.5,
    borderColor: '#dbe3ef',
    borderRadius: 18,
    paddingHorizontal: 14,
    minHeight: 56,
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
  input: { flex: 1, fontSize: 16, color: '#0f172a', paddingVertical: 12 },
  passwordToggle: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
    minHeight: 56,
    borderRadius: 18,
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
  btnText: { color: '#fff', fontWeight: '900', fontSize: 16 },
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
