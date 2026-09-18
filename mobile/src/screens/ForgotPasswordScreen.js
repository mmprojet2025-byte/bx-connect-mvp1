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
import AppIcon from '../components/AppIcon';
import { COLORS } from '../components/MobileUI';
import api from '../api/axios';
import { passwordResetErrorKey, requestPasswordReset } from '../api/auth';

export default function ForgotPasswordScreen({ navigation }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [focused, setFocused] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
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

    setSubmitting(true);
    try {
      await requestPasswordReset(api, normalizedEmail);
      setSubmitted(true);
    } catch (requestError) {
      setError(t(passwordResetErrorKey(requestError)));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Image
            source={require('../../assets/images/logo-bx-connect.png')}
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel="BX-Connect"
          />
          <Text style={styles.title}>{t('auth.forgot_password_title')}</Text>
          <Text style={styles.subtitle}>{t('auth.forgot_password_subtitle')}</Text>

          {submitted && (
            <View style={styles.successBox} accessibilityRole="alert">
              <AppIcon name="check" size={18} color={COLORS.success} />
              <Text style={styles.successText}>{t('auth.forgot_password_confirmation')}</Text>
            </View>
          )}

          {error !== '' && (
            <View style={styles.errorBox} accessibilityRole="alert">
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
              textContentType="emailAddress"
              returnKeyType="send"
              onSubmitEditing={handleSubmit}
              accessibilityLabel={t('auth.email')}
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            activeOpacity={0.86}
            disabled={submitting}
            accessibilityRole="button"
            accessibilityLabel={t('auth.forgot_password_submit')}
            accessibilityState={{ disabled: submitting, busy: submitting }}
          >
            {submitting ? (
              <>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.submitText}>{t('auth.forgot_password_sending')}</Text>
              </>
            ) : (
              <>
                <Text style={styles.submitText}>{t('auth.forgot_password_submit')}</Text>
                <AppIcon name="send" size={19} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.navigate('Login')}
            accessibilityRole="link"
            accessibilityLabel={t('auth.back_to_login')}
          >
            <AppIcon name="chevron-back-outline" size={17} color={COLORS.bxBlueLight} />
            <Text style={styles.backText}>{t('auth.back_to_login')}</Text>
          </TouchableOpacity>

        </View>

        <View style={styles.legalLinks}>
          <LegalLink label={t('legal.links.terms')} onPress={() => navigation.navigate('LegalTerms')} />
          <View style={styles.legalSeparator} />
          <LegalLink label={t('legal.links.privacy')} onPress={() => navigation.navigate('LegalPrivacy')} />
          <View style={styles.legalSeparator} />
          <LegalLink label={t('legal.links.notices')} onPress={() => navigation.navigate('LegalNotices')} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function LegalLink({ label, onPress }) {
  return (
    <TouchableOpacity style={styles.legalLinkButton} onPress={onPress} accessibilityRole="link" accessibilityLabel={label}>
      <Text style={styles.legalLink}>{label}</Text>
    </TouchableOpacity>
  );
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.page },
  content: { flexGrow: 1, justifyContent: 'center', width: '100%', maxWidth: 420, alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 24 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    padding: 20,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.035,
    shadowRadius: 5,
    elevation: 1,
  },
  logo: { alignSelf: 'center', width: 180, height: 44, marginBottom: 16 },
  title: { color: COLORS.bxBlue, fontSize: 21, lineHeight: 27, fontWeight: '700', textAlign: 'center' },
  subtitle: { color: COLORS.muted, fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 6, marginBottom: 20 },
  successBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 12,
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
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
    padding: 12,
    marginBottom: 16,
  },
  errorText: { flex: 1, color: COLORS.danger, fontSize: 13, lineHeight: 19 },
  label: { color: COLORS.text, fontSize: 14, lineHeight: 19, fontWeight: '600', marginBottom: 6 },
  inputShell: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: '#F8F9FF',
    paddingHorizontal: 14,
  },
  inputShellFocused: { borderColor: COLORS.bxBlueLight, backgroundColor: '#fff' },
  input: { flex: 1, minHeight: 50, color: COLORS.text, fontSize: 15, paddingVertical: 10 },
  submitButton: {
    minHeight: 52,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.bxBlueLight,
    marginTop: 16,
  },
  submitButtonDisabled: { opacity: 0.65 },
  submitText: { color: '#fff', fontSize: 15, lineHeight: 20, fontWeight: '700' },
  backButton: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 12,
    marginTop: 8,
  },
  backText: { color: COLORS.bxBlueLight, fontSize: 14, lineHeight: 19, fontWeight: '700' },
  legalLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginTop: 16,
    paddingHorizontal: 8,
  },
  legalLinkButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 2 },
  legalLink: { color: COLORS.muted, fontSize: 11, lineHeight: 16, fontWeight: '600', textAlign: 'center' },
  legalSeparator: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#C5C5D3' },
});
