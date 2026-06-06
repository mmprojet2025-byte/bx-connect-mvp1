import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import AppIcon from '../components/AppIcon';
import {
  BORDER_RADIUS,
  Card,
  COLORS,
  SHADOWS,
  SPACING,
  TYPOGRAPHY,
} from '../components/MobileUI';
import { LEGAL_VERSION } from '../constants/legal';

const ICONS = {
  terms: 'shield',
  privacy: 'lock',
  notices: 'information-circle-outline',
};

export default function LegalScreen({ route }) {
  const { t } = useTranslation();
  const document = route.params?.document || 'terms';
  const sections = t(`legal.documents.${document}.sections`, { returnObjects: true });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.icon}>
          <AppIcon name={ICONS[document]} size={24} color="#fff" />
        </View>
        <Text style={styles.eyebrow}>{t('legal.eyebrow')}</Text>
        <Text style={styles.title}>{t(`legal.documents.${document}.title`)}</Text>
        <Text style={styles.intro}>{t(`legal.documents.${document}.intro`)}</Text>
        <Text style={styles.version}>{LEGAL_VERSION}</Text>
      </View>

      {Array.isArray(sections) && sections.map((section, index) => (
        <Card key={`${section.title}-${index}`} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <Text style={styles.sectionBody}>{section.body}</Text>
        </Card>
      ))}

      <Text style={styles.notice}>{t('legal.validationNotice')}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.page },
  content: { padding: SPACING.md, paddingBottom: SPACING.xxl },
  hero: {
    backgroundColor: COLORS.bxBlue,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.colored(COLORS.bxBlue),
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  eyebrow: { color: '#BAE6FD', ...TYPOGRAPHY.caption, fontWeight: '800' },
  title: { color: '#fff', fontSize: 27, lineHeight: 33, fontWeight: '900', marginTop: 3 },
  intro: { color: '#DBEAFE', ...TYPOGRAPHY.body, lineHeight: 21, marginTop: SPACING.sm },
  version: {
    alignSelf: 'flex-start',
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: BORDER_RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
    ...TYPOGRAPHY.tiny,
    fontWeight: '800',
    marginTop: SPACING.md,
  },
  section: { marginBottom: SPACING.sm },
  sectionTitle: { color: COLORS.text, ...TYPOGRAPHY.section },
  sectionBody: { color: COLORS.muted, ...TYPOGRAPHY.body, lineHeight: 22, marginTop: SPACING.sm },
  notice: { color: COLORS.muted, ...TYPOGRAPHY.tiny, lineHeight: 18, marginTop: SPACING.sm },
});
