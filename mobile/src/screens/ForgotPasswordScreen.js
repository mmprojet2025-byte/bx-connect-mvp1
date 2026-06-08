import { useState } from 'react';
import {
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
import AppIcon from '../components/AppIcon';
import { COLORS } from '../components/MobileUI';

export default function ForgotPasswordScreen({ navigation }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [focused, setFocused] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = () => {
    const normalizedEmail = email.trim();
    setError('');
    setSubmitted(false);

    if (!normalizedEmail) {
      setError(t('auth.error_email_required'));
      return;
    }
    if (!isValidEmail(normalizedEmail)) {
      setError(t('auth.error_email_invalid'));
      return;
    }

    setSubmitted(true);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Image
            source={require('../../assets/images/logo-bx-connect.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>{t('auth.forgot_password_title')}</Text>
          <Text style={styles.subtitle}>{t('auth.forgot_password_subtitle')}</Text>

          {submitted && (
            <View style={styles.successBox}>
              <AppIcon name="check" size={18} color={COLORS.success} />
              <Text style={styles.successText}>{t('auth.forgot_password_confirmation')}</Text>
            </View>
          )}

          {error !== '' && (
            <View style={styles.errorBox}>
              <AppIcon name="warning" size={18} color={COLORS.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Text style={styles.label}>{t('auth.email')}</Text>
          <View style={[styles.inputShell, focused && styles.inputShellFocused]}>
            <AppIcon name="mail-outline" size={20} color={focused ? COLORS.bxBlue : COLORS.muted} />
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder={t('auth.email_placeholder')}
              placeholderTextColor="#94a3b8"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
            />
          </View>

          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} activeOpacity={0.86}>
            <Text style={styles.submitText}>{t('auth.forgot_password_submit')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate('Login')}>
            <AppIcon name="chevron-back-outline" size={17} color={COLORS.bxBlueLight} />
            <Text style={styles.backText}>{t('auth.back_to_login')}</Text>
          </TouchableOpacity>

          <View style={styles.legalLinks}>
            <Text style={styles.legalLink} onPress={() => navigation.navigate('LegalTerms')}>{t('legal.links.terms')}</Text>
            <Text style={styles.legalLink} onPress={() => navigation.navigate('LegalPrivacy')}>{t('legal.links.privacy')}</Text>
            <Text style={styles.legalLink} onPress={() => navigation.navigate('LegalNotices')}>{t('legal.links.notices')}</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.page },
  content: { flexGrow: 1, justifyContent: 'center', padding: 18, paddingVertical: 30 },
  card: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    padding: 22,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.09,
    shadowRadius: 16,
    elevation: 3,
  },
  logo: { alignSelf: 'center', width: 190, height: 62, marginBottom: 16 },
  title: { color: COLORS.bxBlue, fontSize: 24, fontWeight: '900', textAlign: 'center' },
  subtitle: { color: COLORS.muted, fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 8, marginBottom: 22 },
  successBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    backgroundColor: '#f0fdf4',
    padding: 12,
    marginBottom: 16,
  },
  successText: { flex: 1, color: '#15803d', fontSize: 13, lineHeight: 19 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
    padding: 12,
    marginBottom: 16,
  },
  errorText: { flex: 1, color: COLORS.danger, fontSize: 13, lineHeight: 19 },
  label: { color: '#334155', fontSize: 13, fontWeight: '900', marginBottom: 8 },
  inputShell: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: '#dbe3ef',
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 14,
  },
  inputShellFocused: { borderColor: COLORS.info, backgroundColor: '#fff' },
  input: { flex: 1, color: COLORS.text, fontSize: 16, paddingVertical: 12 },
  submitButton: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: COLORS.bxBlue,
    marginTop: 18,
  },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  backButton: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 12,
    marginTop: 6,
  },
  backText: { color: COLORS.bxBlueLight, fontSize: 13, fontWeight: '800' },
  legalLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginTop: 4,
  },
  legalLink: { color: COLORS.muted, fontSize: 11, fontWeight: '700' },
});
