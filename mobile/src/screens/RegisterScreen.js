import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
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
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import AppIcon from '../components/AppIcon';
import { COLORS } from '../components/MobileUI';
import { LEGAL_VERSION } from '../constants/legal';

const STEP_COUNT = 3;

export default function RegisterScreen({ navigation }) {
  const { login } = useAuth();
  const { t } = useTranslation();
  const scrollRef = useRef(null);
  const firstNameRef = useRef(null);
  const lastNameRef = useRef(null);
  const birthDateRef = useRef(null);
  const emailRef = useRef(null);
  const submittingRef = useRef(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    prenom: '',
    nom: '',
    dateNaissance: '',
    email: '',
    motDePasse: '',
    confirmation: '',
  });
  const [focusedField, setFocusedField] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const legalAccepted = termsAccepted && privacyAccepted;
  const passwordChecks = getPasswordChecks(form.motDePasse);
  const passwordStrength = getPasswordStrength(passwordChecks);

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [step]);

  const goBack = useCallback(() => {
    if (loading) return;
    setError('');
    if (step > 1) {
      setStep((current) => current - 1);
      return;
    }
    navigation.navigate('Welcome');
  }, [loading, navigation, step]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity
          style={styles.headerBack}
          onPress={goBack}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel={step === 1 ? t('welcome.back') : t('registerWizard.back')}
          accessibilityState={{ disabled: loading }}
        >
          <AppIcon name="chevron-back" size={24} color={loading ? '#94a3b8' : COLORS.text} />
        </TouchableOpacity>
      ),
    });
  }, [goBack, loading, navigation, step, t]);

  useFocusEffect(useCallback(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      goBack();
      return true;
    });
    return () => subscription.remove();
  }, [goBack]));

  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const continueFromLegal = () => {
    if (!legalAccepted) {
      setError(t('legal.acceptanceRequired'));
      return;
    }
    setError('');
    setStep(2);
  };

  const continueFromIdentity = () => {
    const invalid = validateIdentity(form, t);
    if (invalid) {
      setError(invalid.message);
      invalid.ref({ firstNameRef, lastNameRef, birthDateRef, emailRef })?.current?.focus();
      return;
    }
    setError('');
    setStep(3);
  };

  const handleRegister = async () => {
    if (submittingRef.current) return;
    setError('');

    const passwordError = validatePassword(form, passwordChecks, t);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    if (!legalAccepted) {
      setError(t('legal.acceptanceRequired'));
      setStep(1);
      return;
    }

    submittingRef.current = true;
    setLoading(true);
    try {
      const response = await api.post('/auth/register', {
        prenom: form.prenom.trim(),
        nom: form.nom.trim(),
        dateNaissance: toIsoBirthDate(form.dateNaissance),
        email: form.email.trim(),
        motDePasse: form.motDePasse,
        termsAccepted: true,
        privacyAccepted: true,
        legalVersion: LEGAL_VERSION,
      });
      const { token, prenom, nom, email, role } = response.data;
      await login(token, { prenom, nom, email, role });
    } catch (requestError) {
      setError(getApiError(requestError, t('auth.error_register'), t));
    } finally {
      submittingRef.current = false;
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
        ref={scrollRef}
        style={styles.container}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <StepIndicator step={step} t={t} />

        <View style={[styles.card, step === 1 && styles.discoveryCard]}>
          {step >= 1 && (
            <Image
              source={require('../../assets/images/logo-bx-connect.png')}
              style={[styles.stepLogo, step === 1 && styles.discoveryLogo]}
              resizeMode="contain"
              accessibilityLabel="BX-Connect"
            />
          )}
          <Text style={styles.title}>{t(`registerWizard.step${step}.title`)}</Text>
          <Text style={styles.subtitle}>{t(`registerWizard.step${step}.subtitle`)}</Text>

          {error !== '' && (
            <View style={styles.errorBox} accessibilityRole="alert">
              <AppIcon name="warning" size={18} color={COLORS.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {step === 1 && (
            <LegalStep
              termsAccepted={termsAccepted}
              privacyAccepted={privacyAccepted}
              onToggleTerms={() => setTermsAccepted((current) => !current)}
              onTogglePrivacy={() => setPrivacyAccepted((current) => !current)}
              onTerms={() => navigation.navigate('LegalTerms')}
              onPrivacy={() => navigation.navigate('LegalPrivacy')}
              onContinue={continueFromLegal}
              t={t}
            />
          )}

          {step === 2 && (
            <IdentityStep
              form={form}
              update={update}
              focusedField={focusedField}
              setFocusedField={setFocusedField}
              refs={{ firstNameRef, lastNameRef, birthDateRef, emailRef }}
              onContinue={continueFromIdentity}
              t={t}
            />
          )}

          {step === 3 && (
            <PasswordStep
              form={form}
              update={update}
              focusedField={focusedField}
              setFocusedField={setFocusedField}
              showPassword={showPassword}
              showConfirmation={showConfirmation}
              setShowPassword={setShowPassword}
              setShowConfirmation={setShowConfirmation}
              passwordChecks={passwordChecks}
              passwordStrength={passwordStrength}
              loading={loading}
              onRegister={handleRegister}
              onLogin={() => navigation.navigate('Login')}
              t={t}
            />
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function StepIndicator({ step, t }) {
  const label = t('registerWizard.progress', { step, total: STEP_COUNT });
  return (
    <View style={styles.progressBlock} accessible accessibilityRole="text" accessibilityLabel={label}>
      <View style={styles.progressHeader}>
        <View style={styles.progressLabelGroup}>
          <View style={styles.progressNumber}>
            <Text style={styles.progressNumberText}>{step}</Text>
          </View>
          <Text style={styles.progressText}>{label}</Text>
        </View>
        <Text style={styles.progressContext}>{t(`registerWizard.step${step}.progressLabel`)}</Text>
      </View>
      <View style={styles.progressTrack} importantForAccessibility="no-hide-descendants">
        {[1, 2, 3].map((item) => (
          <View
            key={item}
            style={[
              styles.progressSegment,
              item < step && styles.progressSegmentComplete,
              item === step && styles.progressSegmentActive,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

function LegalStep({
  termsAccepted,
  privacyAccepted,
  onToggleTerms,
  onTogglePrivacy,
  onTerms,
  onPrivacy,
  onContinue,
  t,
}) {
  return (
    <View>
      <View style={styles.discoveryGrid} accessibilityRole="list">
        {[
          { key: 'activities', icon: 'activity', color: COLORS.bxBlueLight, background: COLORS.softBlue },
          { key: 'groups', icon: 'group', color: COLORS.success, background: COLORS.softGreen },
          { key: 'projects', icon: 'project', color: COLORS.impactOrange, background: COLORS.softOrange },
          { key: 'community', icon: 'heart-outline', color: '#6D5BD0', background: COLORS.softPurple },
        ].map((feature) => (
          <View key={feature.key} style={styles.discoveryFeature} accessibilityRole="listitem">
            <View style={[styles.discoveryFeatureIcon, { backgroundColor: feature.background }]}>
              <AppIcon name={feature.icon} size={23} color={feature.color} />
            </View>
            <Text style={styles.discoveryFeatureTitle}>{t(`registerWizard.step1.features.${feature.key}`)}</Text>
            <Text style={styles.discoveryFeatureText}>{t(`registerWizard.step1.featureDescriptions.${feature.key}`)}</Text>
          </View>
        ))}
      </View>

      <View style={styles.agreementsCard}>
        <View style={styles.agreementsHeader}>
          <AppIcon name="shield" size={20} color={COLORS.bxBlueLight} />
          <Text style={styles.agreementsTitle}>{t('registerWizard.step1.agreementsTitle')}</Text>
        </View>
        <Text style={styles.agreementsIntro}>{t('registerWizard.step1.agreementsIntro')}</Text>
        <AgreementRow
          accepted={termsAccepted}
          onToggle={onToggleTerms}
          label={t('registerWizard.step1.termsAcceptance')}
          linkLabel={t('legal.links.terms')}
          onLink={onTerms}
        />
        <AgreementRow
          accepted={privacyAccepted}
          onToggle={onTogglePrivacy}
          label={t('registerWizard.step1.privacyAcceptance')}
          linkLabel={t('legal.links.privacy')}
          onLink={onPrivacy}
        />
        <Text style={styles.legalVersion}>{t('legal.acceptedVersion', { version: LEGAL_VERSION })}</Text>
      </View>

      <PrimaryButton
        label={t('registerWizard.continue')}
        onPress={onContinue}
        disabled={!termsAccepted || !privacyAccepted}
      />

      <View style={styles.googleBlock}>
        <TouchableOpacity
          style={styles.googleButtonDisabled}
          disabled
          accessibilityRole="button"
          accessibilityLabel={`${t('registerWizard.google.continue')}. ${t('registerWizard.google.soon')}`}
          accessibilityState={{ disabled: true }}
        >
          <Text style={styles.googleButtonText}>{t('registerWizard.google.continue')}</Text>
          <Text style={styles.googleSoonBadge}>{t('registerWizard.google.soon')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function AgreementRow({ accepted, onToggle, label, linkLabel, onLink }) {
  return (
    <View style={styles.agreementRow}>
      <TouchableOpacity
        style={styles.agreementToggle}
        onPress={onToggle}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: accepted }}
        accessibilityLabel={label}
      >
        <View style={[styles.checkbox, accepted && styles.checkboxChecked]}>
          {accepted && <AppIcon name="check" size={16} color="#fff" />}
        </View>
        <Text style={styles.agreementLabel}>{label}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.agreementLink} onPress={onLink} accessibilityRole="link" accessibilityLabel={linkLabel}>
        <Text style={styles.agreementLinkText}>{linkLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

function IdentityStep({ form, update, focusedField, setFocusedField, refs, onContinue, t }) {
  return (
    <View>
      <FormField
        inputRef={refs.firstNameRef}
        name="prenom"
        icon="user"
        label={t('auth.firstname')}
        value={form.prenom}
        onChangeText={(value) => update('prenom', value)}
        focusedField={focusedField}
        setFocusedField={setFocusedField}
        maxLength={50}
        autoCapitalize="words"
        autoComplete="given-name"
        textContentType="givenName"
      />
      <FormField
        inputRef={refs.lastNameRef}
        name="nom"
        icon="person-circle-outline"
        label={t('auth.lastname')}
        value={form.nom}
        onChangeText={(value) => update('nom', value)}
        focusedField={focusedField}
        setFocusedField={setFocusedField}
        maxLength={50}
        autoCapitalize="words"
        autoComplete="family-name"
        textContentType="familyName"
      />
      <FormField
        inputRef={refs.emailRef}
        name="email"
        icon="mail-outline"
        label={t('auth.email')}
        value={form.email}
        onChangeText={(value) => update('email', value)}
        focusedField={focusedField}
        setFocusedField={setFocusedField}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="done"
        hint={t('registerWizard.step2.emailHint')}
      />
      <FormField
        inputRef={refs.birthDateRef}
        name="dateNaissance"
        icon="calendar-outline"
        label={t('registerWizard.birthDate.label')}
        value={form.dateNaissance}
        onChangeText={(value) => update('dateNaissance', formatBirthDateInput(value))}
        focusedField={focusedField}
        setFocusedField={setFocusedField}
        placeholder={t('registerWizard.birthDate.placeholder')}
        accessibilityHint={t('registerWizard.birthDate.hint')}
        keyboardType="number-pad"
        maxLength={10}
        autoComplete="birthdate-full"
        textContentType="none"
        returnKeyType="done"
        onSubmitEditing={onContinue}
      />
      <View style={styles.ageHint}>
        <AppIcon name="information-circle-outline" size={18} color={COLORS.bxBlueLight} />
        <Text style={styles.ageHintText}>{t('registerWizard.step2.ageHint')}</Text>
      </View>
      <PrimaryButton label={t('registerWizard.step2.continue')} onPress={onContinue} tone="blue" icon="arrow-forward" />
    </View>
  );
}

function FormField({ inputRef, name, icon, label, hint, focusedField, setFocusedField, ...inputProps }) {
  const showCounter = typeof inputProps.maxLength === 'number' && ['prenom', 'nom'].includes(name);
  return (
    <View style={styles.field}>
      <View style={styles.fieldHeader}>
        <Text style={styles.label}>{label}</Text>
        {showCounter ? (
          <Text style={styles.characterCounter}>{inputProps.value?.length || 0}/{inputProps.maxLength}</Text>
        ) : null}
      </View>
      <View style={[styles.inputShell, focusedField === name && styles.inputShellFocused]}>
        {icon ? <AppIcon name={icon} size={20} color={focusedField === name ? COLORS.bxBlueLight : COLORS.muted} /> : null}
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder={label}
          placeholderTextColor="#94a3b8"
          onFocus={() => setFocusedField(name)}
          onBlur={() => setFocusedField('')}
          accessibilityLabel={label}
          {...inputProps}
        />
      </View>
      {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    </View>
  );
}

function PasswordStep({
  form, update, focusedField, setFocusedField, showPassword, showConfirmation,
  setShowPassword, setShowConfirmation, passwordChecks, passwordStrength,
  loading, onRegister, onLogin, t,
}) {
  return (
    <View>
      <PasswordField
        name="password"
        label={t('auth.password')}
        value={form.motDePasse}
        onChangeText={(value) => update('motDePasse', value)}
        visible={showPassword}
        onToggle={() => setShowPassword((current) => !current)}
        focusedField={focusedField}
        setFocusedField={setFocusedField}
        t={t}
      />
      <PasswordHelp checks={passwordChecks} strength={passwordStrength} t={t} />
      <PasswordField
        name="confirmation"
        label={t('auth.confirm_password')}
        value={form.confirmation}
        onChangeText={(value) => update('confirmation', value)}
        visible={showConfirmation}
        onToggle={() => setShowConfirmation((current) => !current)}
        focusedField={focusedField}
        setFocusedField={setFocusedField}
        onSubmitEditing={onRegister}
        t={t}
      />
      <PrimaryButton label={t('auth.register_btn')} onPress={onRegister} loading={loading} />
      <TouchableOpacity style={styles.loginLink} onPress={onLogin} accessibilityRole="link">
        <Text style={styles.loginLinkText}>{t('auth.already_account')}</Text>
      </TouchableOpacity>
    </View>
  );
}

function PasswordField({ name, label, value, onChangeText, visible, onToggle, focusedField, setFocusedField, onSubmitEditing, t }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputShell, focusedField === name && styles.inputShellFocused]}>
        <AppIcon name="lock" size={20} color={focusedField === name ? COLORS.bxBlueLight : COLORS.muted} />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocusedField(name)}
          onBlur={() => setFocusedField('')}
          placeholder={label}
          placeholderTextColor="#94a3b8"
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoComplete={name === 'password' ? 'new-password' : 'off'}
          textContentType={name === 'password' ? 'newPassword' : 'none'}
          returnKeyType={onSubmitEditing ? 'done' : 'next'}
          onSubmitEditing={onSubmitEditing}
          accessibilityLabel={label}
        />
        <TouchableOpacity
          style={styles.passwordToggle}
          onPress={onToggle}
          accessibilityRole="button"
          accessibilityLabel={visible ? t('auth.hide_password') : t('auth.show_password')}
        >
          <AppIcon name={visible ? 'eye-off-outline' : 'eye-outline'} size={21} color={COLORS.muted} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function PasswordHelp({ checks, strength, t }) {
  const color = { weak: COLORS.danger, medium: COLORS.warning, strong: COLORS.success }[strength] || COLORS.muted;
  return (
    <View style={styles.passwordHelp}>
      {strength ? <Text style={[styles.passwordStrength, { color }]}>{t(`auth.password_strength_${strength}`)}</Text> : null}
      <PasswordRule valid={checks[0]} text={t('auth.password_rule_length')} />
      <PasswordRule valid={checks[1]} text={t('auth.password_rule_uppercase')} />
      <PasswordRule valid={checks[2]} text={t('auth.password_rule_digit')} />
    </View>
  );
}

function PasswordRule({ valid, text }) {
  return (
    <View style={styles.passwordRule}>
      <AppIcon name={valid ? 'checkmark-circle' : 'ellipse-outline'} size={14} color={valid ? COLORS.success : '#94a3b8'} />
      <Text style={[styles.passwordRuleText, valid && styles.passwordRuleValid]}>{text}</Text>
    </View>
  );
}

function PrimaryButton({ label, onPress, disabled = false, loading = false, tone = 'orange', icon }) {
  const unavailable = disabled || loading;
  return (
    <TouchableOpacity
      style={[styles.primaryButton, tone === 'blue' && styles.primaryButtonBlue, unavailable && styles.primaryButtonDisabled]}
      onPress={onPress}
      disabled={unavailable}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: unavailable, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <>
          <Text style={styles.primaryButtonText}>{label}</Text>
          {icon ? <AppIcon name={icon} size={19} color="#fff" /> : null}
        </>
      )}
    </TouchableOpacity>
  );
}

function validateIdentity(form, t) {
  if (!form.prenom.trim()) return { message: t('auth.error_firstname_required'), ref: (refs) => refs.firstNameRef };
  if (form.prenom.trim().length > 50) return { message: t('registerWizard.nameTooLong'), ref: (refs) => refs.firstNameRef };
  if (!form.nom.trim()) return { message: t('auth.error_lastname_required'), ref: (refs) => refs.lastNameRef };
  if (form.nom.trim().length > 50) return { message: t('registerWizard.nameTooLong'), ref: (refs) => refs.lastNameRef };
  if (!form.email.trim()) return { message: t('auth.error_email_required'), ref: (refs) => refs.emailRef };
  if (!isValidEmail(form.email)) return { message: t('auth.error_email_invalid'), ref: (refs) => refs.emailRef };
  const birthDateError = validateBirthDate(form.dateNaissance, t);
  if (birthDateError) return { message: birthDateError, ref: (refs) => refs.birthDateRef };
  return null;
}

function validateBirthDate(value, t) {
  if (!value.trim()) return t('registerWizard.birthDate.required');
  const parts = parseBirthDate(value);
  if (!parts) return t('registerWizard.birthDate.invalid');

  const today = new Date();
  const todayParts = { year: today.getFullYear(), month: today.getMonth() + 1, day: today.getDate() };
  const age = calculateAge(parts, todayParts);
  if (compareDateParts(parts, todayParts) > 0) return t('registerWizard.birthDate.future');
  if (age < 16) return t('registerWizard.birthDate.tooYoung');
  if (age > 120 || compareDateParts(parts, shiftYears(todayParts, -120)) < 0) return t('registerWizard.birthDate.implausible');
  return '';
}

function formatBirthDateInput(value) {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function parseBirthDate(value) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) return null;
  const parts = { day: Number(match[1]), month: Number(match[2]), year: Number(match[3]) };
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  if (date.getUTCFullYear() !== parts.year || date.getUTCMonth() + 1 !== parts.month || date.getUTCDate() !== parts.day) return null;
  return parts;
}

function calculateAge(birthDate, today) {
  let age = today.year - birthDate.year;
  if (today.month < birthDate.month || (today.month === birthDate.month && today.day < birthDate.day)) age -= 1;
  return age;
}

function compareDateParts(left, right) {
  return (left.year - right.year) || (left.month - right.month) || (left.day - right.day);
}

function shiftYears(date, years) {
  const year = date.year + years;
  const lastDay = new Date(Date.UTC(year, date.month, 0)).getUTCDate();
  return { year, month: date.month, day: Math.min(date.day, lastDay) };
}

function toIsoBirthDate(value) {
  const parts = parseBirthDate(value);
  if (!parts) return '';
  return `${String(parts.year).padStart(4, '0')}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}

function validatePassword(form, checks, t) {
  if (!form.motDePasse) return t('auth.error_password_required');
  if (!form.confirmation) return t('auth.error_confirmation_required');
  if (form.motDePasse !== form.confirmation) return t('auth.error_passwords');
  if (!checks.every(Boolean)) return t('auth.error_password_requirements');
  return '';
}

function getPasswordChecks(password) {
  return [password.length >= 8, /[A-Z]/.test(password), /\d/.test(password)];
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

function getApiError(error, fallback, t) {
  if (error.response?.status === 403) return t('errors.forbidden');
  const birthDateErrors = {
    BIRTH_DATE_REQUIRED: 'required',
    BIRTH_DATE_FUTURE: 'future',
    BIRTH_DATE_MIN_AGE: 'tooYoung',
    BIRTH_DATE_IMPLAUSIBLE: 'implausible',
  };
  if (birthDateErrors[error.response?.data?.code]) {
    return t(`registerWizard.birthDate.${birthDateErrors[error.response.data.code]}`);
  }
  const message = error.response?.data?.message?.toLowerCase() || '';
  if (message.includes('existe')) return t('auth.error_email_exists');
  return fallback;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.page },
  content: { flexGrow: 1, width: '100%', maxWidth: 420, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 28 },
  headerBack: { width: 44, height: 44, alignItems: 'flex-start', justifyContent: 'center' },
  progressBlock: { width: '100%', alignSelf: 'center', marginBottom: 16 },
  progressHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 },
  progressLabelGroup: { flexDirection: 'row', alignItems: 'center', gap: 7, flexShrink: 1 },
  progressNumber: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.softBlue },
  progressNumberText: { color: COLORS.bxBlueLight, fontSize: 12, lineHeight: 16, fontWeight: '700' },
  progressText: { color: COLORS.bxBlue, fontSize: 13, lineHeight: 18, fontWeight: '700', flexShrink: 1 },
  progressContext: { color: COLORS.muted, fontSize: 12, lineHeight: 16, textAlign: 'right', flexShrink: 1 },
  progressTrack: { flexDirection: 'row', gap: 4, height: 6 },
  progressSegment: { flex: 1, borderRadius: 999, backgroundColor: '#D3E4FE' },
  progressSegmentComplete: { backgroundColor: COLORS.success },
  progressSegmentActive: { backgroundColor: COLORS.bxBlueLight },
  card: { width: '100%', alignSelf: 'center', backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 16, shadowColor: '#111827', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.035, shadowRadius: 5, elevation: 1 },
  discoveryCard: { maxWidth: 420, backgroundColor: 'transparent', borderWidth: 0, borderRadius: 0, padding: 0 },
  stepLogo: { width: 160, height: 36, marginBottom: 12 },
  discoveryLogo: { width: 172, height: 38 },
  title: { color: COLORS.text, fontSize: 21, lineHeight: 27, fontWeight: '700' },
  subtitle: { color: COLORS.muted, fontSize: 14, lineHeight: 20, marginTop: 5, marginBottom: 18 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.softRed, borderWidth: 1, borderColor: '#FECACA', borderRadius: 13, padding: 12, marginBottom: 14 },
  errorText: { flex: 1, color: '#991B1B', fontSize: 13, lineHeight: 18 },
  discoveryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  discoveryFeature: { width: '48%', minHeight: 132, flexGrow: 1, flexBasis: 150, backgroundColor: COLORS.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: COLORS.border, shadowColor: '#111827', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.035, shadowRadius: 5, elevation: 1 },
  discoveryFeatureIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  discoveryFeatureTitle: { color: COLORS.text, fontSize: 14, lineHeight: 19, fontWeight: '700', marginBottom: 2 },
  discoveryFeatureText: { color: COLORS.muted, fontSize: 12, lineHeight: 16 },
  agreementsCard: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border, shadowColor: '#111827', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.035, shadowRadius: 5, elevation: 1 },
  agreementsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  agreementsTitle: { flex: 1, color: COLORS.text, fontSize: 14, lineHeight: 19, fontWeight: '700' },
  agreementsIntro: { color: COLORS.muted, fontSize: 12, lineHeight: 17, marginBottom: 12 },
  agreementRow: { backgroundColor: '#EFF4FF', borderRadius: 10, padding: 10, marginTop: 8 },
  agreementToggle: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 12 },
  agreementLabel: { flex: 1, color: COLORS.text, fontSize: 14, lineHeight: 19, fontWeight: '600' },
  agreementLink: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start', marginLeft: 36, paddingRight: 8 },
  agreementLinkText: { color: COLORS.bxBlueLight, fontSize: 12, lineHeight: 17, fontWeight: '600', textDecorationLine: 'underline' },
  legalVersion: { color: COLORS.muted, fontSize: 11, lineHeight: 16, marginTop: 10 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: COLORS.bxBlue, borderColor: COLORS.bxBlue },
  googleBlock: { marginTop: 12 },
  googleButtonDisabled: { width: '100%', minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, backgroundColor: COLORS.surface, paddingHorizontal: 16, opacity: 0.6 },
  googleButtonText: { flex: 1, color: COLORS.muted, fontSize: 14, lineHeight: 20, fontWeight: '600' },
  googleSoonBadge: { color: COLORS.muted, fontSize: 11, lineHeight: 16, fontWeight: '700', borderRadius: 999, backgroundColor: '#E5EEFF', paddingHorizontal: 7, paddingVertical: 3 },
  field: { marginBottom: 16 },
  fieldHeader: { minHeight: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 },
  label: { flexShrink: 1, color: COLORS.text, fontSize: 14, lineHeight: 19, fontWeight: '700' },
  characterCounter: { color: COLORS.muted, fontSize: 12, lineHeight: 16 },
  inputShell: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, backgroundColor: COLORS.surface, paddingHorizontal: 13 },
  inputShellFocused: { borderColor: COLORS.bxBlueLight, backgroundColor: '#fff' },
  input: { flex: 1, minHeight: 48, color: COLORS.text, fontSize: 15, paddingVertical: 10 },
  fieldHint: { color: COLORS.muted, fontSize: 12, lineHeight: 17, marginTop: 6 },
  ageHint: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, borderRadius: 8, backgroundColor: COLORS.softBlue, padding: 10, marginTop: -6, marginBottom: 16 },
  ageHintText: { flex: 1, color: COLORS.bxBlue, fontSize: 12, lineHeight: 17 },
  passwordToggle: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: -8 },
  passwordHelp: { backgroundColor: '#F8F9FF', borderRadius: 10, padding: 11, marginTop: -7, marginBottom: 16, gap: 6 },
  passwordStrength: { fontSize: 12, lineHeight: 17, fontWeight: '900', marginBottom: 2 },
  passwordRule: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  passwordRuleText: { flex: 1, color: COLORS.muted, fontSize: 12, lineHeight: 17 },
  passwordRuleValid: { color: '#15803D' },
  primaryButton: { minHeight: 52, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: COLORS.impactOrange, paddingHorizontal: 18, marginTop: 4 },
  primaryButtonBlue: { backgroundColor: COLORS.bxBlueLight },
  primaryButtonDisabled: { backgroundColor: '#CBD5E1' },
  primaryButtonText: { color: '#fff', fontSize: 15, lineHeight: 20, fontWeight: '900' },
  loginLink: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 8, paddingHorizontal: 10 },
  loginLinkText: { color: COLORS.bxBlueLight, fontSize: 13, lineHeight: 19, fontWeight: '800', textAlign: 'center' },
});
