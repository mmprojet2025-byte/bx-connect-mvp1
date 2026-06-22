import { useCallback, useEffect, useState } from 'react';
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
import api from '../api/axios';
import AppIcon from '../components/AppIcon';
import { Badge, COLORS, SectionHeader } from '../components/MobileUI';

const PARTNER_TYPES = ['ENTREPRISE', 'ASSOCIATION', 'INSTITUTION', 'ECOLE', 'AUTRE'];

const EMPTY_PROFILE = {
  nomOrganisation: '',
  typePartenaire: 'AUTRE',
  logoUrl: '',
  personneContact: '',
  emailContact: '',
  telephone: '',
  siteWeb: '',
  description: '',
};

export default function PartnerProfileScreen() {
  const { t } = useTranslation();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(EMPTY_PROFILE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/partenaire/profil');
      const nextProfile = res.data || {};
      setProfile(nextProfile);
      setForm(profileToForm(nextProfile));
    } catch (err) {
      setError(getApiError(err, t, t('partnerInstitution.profileLoadError', {
        defaultValue: 'Impossible de charger le profil partenaire.',
      })));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const saveProfile = async () => {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const res = await api.put('/partenaire/profil', cleanPayload(form));
      const nextProfile = res.data || {};
      setProfile(nextProfile);
      setForm(profileToForm(nextProfile));
      setMessage(t('partnerInstitution.profileSaved', { defaultValue: 'Profil partenaire enregistré.' }));
    } catch (err) {
      setError(getApiError(err, t, t('partnerInstitution.profileError', {
        defaultValue: 'Impossible d’enregistrer le profil partenaire.',
      })));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.bxBlue} />
        <Text style={styles.loadingText}>{t('common.loading', { defaultValue: 'Chargement...' })}</Text>
      </View>
    );
  }

  const incomplete = !form.nomOrganisation.trim() || !form.description.trim();

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <SectionHeader
            title={t('partnerInstitution.profileTitle', { defaultValue: 'Profil partenaire' })}
            subtitle={t('partnerInstitution.profileSubtitle', {
              defaultValue: 'Présentez votre organisation aux membres et à l’administration.',
            })}
            icon="building"
          />
          {profile?.logoUrl ? (
            <View style={styles.logoPreview}>
              <Image source={{ uri: profile.logoUrl }} style={styles.logoImage} resizeMode="contain" />
            </View>
          ) : null}
          {incomplete ? (
            <View style={styles.noticeBox}>
              <AppIcon name="warning" size={18} color={COLORS.warning} />
              <Text style={styles.noticeText}>
                {t('partnerInstitution.incompleteProfile', {
                  defaultValue: 'Profil incomplet : ajoutez au moins le nom de l’organisation et une description.',
                })}
              </Text>
            </View>
          ) : (
            <View style={styles.completeBox}>
              <AppIcon name="check" size={18} color={COLORS.success} />
              <Text style={styles.completeText}>
                {t('partnerInstitution.completeProfile', { defaultValue: 'Profil partenaire renseigné.' })}
              </Text>
            </View>
          )}
        </View>

        {message ? <InfoBox text={message} tone="success" /> : null}
        {error ? <InfoBox text={error} tone="danger" /> : null}

        <View style={styles.formCard}>
          <Input
            label={t('partnerInstitution.organization', { defaultValue: 'Organisation' })}
            value={form.nomOrganisation}
            onChangeText={(value) => updateField('nomOrganisation', value)}
            placeholder={t('partnerInstitution.organizationPlaceholder', { defaultValue: 'Nom de l’organisation' })}
          />

          <Text style={styles.label}>{t('partnerInstitution.type', { defaultValue: 'Type de partenaire' })}</Text>
          <View style={styles.typeGrid}>
            {PARTNER_TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                style={[styles.typeButton, form.typePartenaire === type && styles.typeButtonActive]}
                onPress={() => updateField('typePartenaire', type)}
              >
                <Text style={[styles.typeText, form.typePartenaire === type && styles.typeTextActive]}>
                  {t(`partnerInstitution.types.${type}`, { defaultValue: type })}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Input
            label={t('partnerInstitution.description', { defaultValue: 'Description' })}
            value={form.description}
            onChangeText={(value) => updateField('description', value)}
            placeholder={t('partnerInstitution.descriptionPlaceholder', { defaultValue: 'Décrivez brièvement votre organisation' })}
            multiline
          />
          <Input
            label={t('partnerInstitution.website', { defaultValue: 'Site web' })}
            value={form.siteWeb}
            onChangeText={(value) => updateField('siteWeb', value)}
            placeholder="https://..."
            autoCapitalize="none"
            keyboardType="url"
          />
          <Input
            label={t('partnerInstitution.logoUrl', { defaultValue: 'URL du logo' })}
            value={form.logoUrl}
            onChangeText={(value) => updateField('logoUrl', value)}
            placeholder="https://..."
            autoCapitalize="none"
            keyboardType="url"
          />
          <Input
            label={t('partnerInstitution.contactPerson', { defaultValue: 'Personne de contact' })}
            value={form.personneContact}
            onChangeText={(value) => updateField('personneContact', value)}
            placeholder={t('common.notAvailable', { defaultValue: 'Non renseigné' })}
          />
          <Input
            label={t('partnerInstitution.contactEmail', { defaultValue: 'Email de contact' })}
            value={form.emailContact}
            onChangeText={(value) => updateField('emailContact', value)}
            placeholder="contact@example.org"
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <Input
            label={t('partnerInstitution.phone', { defaultValue: 'Téléphone' })}
            value={form.telephone}
            onChangeText={(value) => updateField('telephone', value)}
            placeholder="+32..."
            keyboardType="phone-pad"
          />

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.disabledButton]}
            onPress={saveProfile}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <AppIcon name="save" size={18} color="#fff" />
            )}
            <Text style={styles.saveText}>
              {saving
                ? t('common.saving', { defaultValue: 'Enregistrement...' })
                : t('common.save', { defaultValue: 'Enregistrer' })}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryTitleRow}>
            <Text style={styles.summaryTitle}>{t('partnerInstitution.publicPreview', { defaultValue: 'Aperçu' })}</Text>
            <Badge
              label={t(`partnerInstitution.types.${form.typePartenaire}`, { defaultValue: form.typePartenaire })}
              color={COLORS.impactOrange}
              soft
            />
          </View>
          <Text style={styles.summaryName}>{form.nomOrganisation || t('partnerInstitution.organization', { defaultValue: 'Organisation' })}</Text>
          <Text style={styles.summaryText} numberOfLines={4}>
            {form.description || t('partnerInstitution.noDescription', { defaultValue: 'Aucune description renseignée.' })}
          </Text>
          {form.siteWeb ? <Text style={styles.summaryLink} numberOfLines={1}>{form.siteWeb}</Text> : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Input({ label, multiline, style, ...props }) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        style={[styles.input, multiline && styles.textarea, style]}
        placeholderTextColor="#94a3b8"
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </View>
  );
}

function InfoBox({ text, tone }) {
  const success = tone === 'success';
  return (
    <View style={[styles.infoBox, { borderLeftColor: success ? COLORS.success : COLORS.danger, backgroundColor: success ? '#f0fdf4' : '#fef2f2' }]}>
      <Text style={[styles.infoText, { color: success ? '#15803d' : COLORS.danger }]}>{text}</Text>
    </View>
  );
}

function profileToForm(profile) {
  return {
    nomOrganisation: profile?.nomOrganisation || '',
    typePartenaire: profile?.typePartenaire || 'AUTRE',
    logoUrl: profile?.logoUrl || '',
    personneContact: profile?.personneContact || '',
    emailContact: profile?.emailContact || '',
    telephone: profile?.telephone || '',
    siteWeb: profile?.siteWeb || '',
    description: profile?.description || '',
  };
}

function cleanPayload(form) {
  return Object.fromEntries(
    Object.entries(form).map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value]),
  );
}

function getApiError(err, t, fallback) {
  if (err.response?.status === 401) return t('errors.session_expired', { defaultValue: 'Session expirée.' });
  if (err.response?.status === 403) return t('errors.forbidden', { defaultValue: 'Accès refusé.' });
  return fallback;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.page },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: COLORS.page },
  loadingText: { marginTop: 12, color: COLORS.muted, fontSize: 14 },
  content: { paddingBottom: 28 },
  header: { backgroundColor: '#fff', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  logoPreview: { width: 96, height: 58, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  logoImage: { width: 82, height: 44 },
  noticeBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 14, backgroundColor: COLORS.softYellow, padding: 10 },
  noticeText: { flex: 1, color: '#92400e', fontSize: 12, lineHeight: 17, fontWeight: '700' },
  completeBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, backgroundColor: COLORS.softGreen, padding: 10 },
  completeText: { flex: 1, color: '#15803d', fontSize: 12, lineHeight: 17, fontWeight: '700' },
  infoBox: { marginHorizontal: 14, marginTop: 10, padding: 12, borderRadius: 10, borderLeftWidth: 4 },
  infoText: { fontSize: 13, lineHeight: 18 },
  formCard: { margin: 14, backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, padding: 14 },
  inputGroup: { marginBottom: 12 },
  label: { color: COLORS.bxBlue, fontSize: 12, lineHeight: 16, fontWeight: '900', marginBottom: 6 },
  input: { minHeight: 46, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, backgroundColor: '#f8fafc', paddingHorizontal: 12, color: COLORS.text, fontSize: 14 },
  textarea: { minHeight: 96, paddingTop: 11, lineHeight: 19 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  typeButton: { borderRadius: 999, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 11, paddingVertical: 8, backgroundColor: '#fff' },
  typeButtonActive: { borderColor: COLORS.impactOrange, backgroundColor: COLORS.softOrange },
  typeText: { color: COLORS.muted, fontSize: 12, fontWeight: '800' },
  typeTextActive: { color: COLORS.impactOrange },
  saveButton: { minHeight: 48, borderRadius: 15, backgroundColor: COLORS.bxBlue, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginTop: 2 },
  saveText: { color: '#fff', fontSize: 14, fontWeight: '900' },
  disabledButton: { opacity: 0.65 },
  summaryCard: { marginHorizontal: 14, marginBottom: 16, backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, padding: 14 },
  summaryTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  summaryTitle: { color: COLORS.muted, fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  summaryName: { color: COLORS.bxBlue, fontSize: 17, lineHeight: 22, fontWeight: '900', marginTop: 10 },
  summaryText: { color: COLORS.text, fontSize: 13, lineHeight: 19, marginTop: 6 },
  summaryLink: { color: COLORS.bxBlueLight, fontSize: 12, lineHeight: 16, fontWeight: '800', marginTop: 8 },
});
