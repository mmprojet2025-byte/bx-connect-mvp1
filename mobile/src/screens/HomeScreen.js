import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import AppIcon from '../components/AppIcon';
import { COLORS, Card, SectionHeader } from '../components/MobileUI';

const features = [
  {
    titleKey: 'home.features.activitiesTitle',
    textKey: 'home.features.activitiesText',
    icon: 'activity',
    color: COLORS.info,
    route: 'Activities',
  },
  {
    titleKey: 'home.features.projectsTitle',
    textKey: 'home.features.projectsText',
    icon: 'project',
    color: COLORS.impactOrange,
    route: 'Login',
  },
  {
    titleKey: 'home.features.groupsTitle',
    textKey: 'home.features.groupsText',
    icon: 'group',
    color: COLORS.success,
    route: 'Groupes',
  },
  {
    titleKey: 'home.features.communityTitle',
    textKey: 'home.features.communityText',
    icon: 'message',
    color: '#8B5CF6',
    route: 'Login',
  },
];

const audiences = [
  { labelKey: 'home.audiences.members', icon: 'user', color: COLORS.info },
  { labelKey: 'home.audiences.referents', icon: 'shield', color: COLORS.success },
  { labelKey: 'home.audiences.partners', icon: 'wallet', color: COLORS.impactOrange },
];

export default function HomeScreen({ navigation }) {
  const { isAuthenticated, user } = useAuth();
  const { t } = useTranslation();

  const goTo = (route) => {
    if (route === 'Login' && isAuthenticated) {
      navigation.navigate('Activities');
      return;
    }
    navigation.navigate(route);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Image
          source={require('../../assets/images/logo-bx-connect.png')}
          style={styles.brandLogo}
          resizeMode="contain"
        />

        <Text style={styles.slogan}>{t('brand.slogan')}</Text>
        <Text style={styles.heroText}>{t('home.heroText')}</Text>

        <View style={styles.heroActions}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate(isAuthenticated ? 'Activities' : 'Login')}
            activeOpacity={0.86}
          >
            <AppIcon name={isAuthenticated ? 'activity' : 'lock'} size={18} color="#fff" />
            <Text style={styles.primaryButtonText}>
              {isAuthenticated ? t('home.viewActivities') : t('auth.login_btn')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('Activities')}
            activeOpacity={0.86}
          >
            <AppIcon name="search" size={18} color={COLORS.bxBlue} />
            <Text style={styles.secondaryButtonText}>{t('home.discover')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {isAuthenticated ? (
        <Card style={styles.welcomeCard}>
          <View style={styles.welcomeIcon}>
            <AppIcon name="check" size={22} color={COLORS.success} />
          </View>
          <View style={styles.welcomeTextWrap}>
            <Text style={styles.welcomeTitle}>
              {user?.prenom
                ? t('home.welcomeNamed', { name: user.prenom })
                : t('home.welcome')}
            </Text>
            <Text style={styles.welcomeText}>{t('home.welcomeText')}</Text>
          </View>
        </Card>
      ) : null}

      <View style={styles.section}>
        <SectionHeader
          title={t('home.featuresTitle')}
          subtitle={t('home.featuresSubtitle')}
          icon="project"
        />
        <View style={styles.featureGrid}>
          {features.map((feature) => (
            <TouchableOpacity
              key={feature.titleKey}
              style={styles.featureCard}
              onPress={() => goTo(feature.route)}
              activeOpacity={0.86}
            >
              <View style={[styles.featureIcon, { backgroundColor: `${feature.color}18` }]}>
                <AppIcon name={feature.icon} size={22} color={feature.color} />
              </View>
              <Text style={styles.featureTitle}>{t(feature.titleKey)}</Text>
              <Text style={styles.featureText}>{t(feature.textKey)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader
          title={t('home.audiencesTitle')}
          subtitle={t('home.audiencesSubtitle')}
          icon="group"
        />
        <View style={styles.audienceRow}>
          {audiences.map((audience) => (
            <View key={audience.labelKey} style={styles.audiencePill}>
              <View style={[styles.audienceIcon, { backgroundColor: `${audience.color}18` }]}>
                <AppIcon name={audience.icon} size={18} color={audience.color} />
              </View>
              <Text style={styles.audienceText}>{t(audience.labelKey)}</Text>
            </View>
          ))}
        </View>
      </View>

      {!isAuthenticated ? (
        <Card style={styles.joinCard}>
          <Image
            source={require('../../assets/illustrations/community.png')}
            style={styles.joinIllustration}
            resizeMode="contain"
          />
          <View style={styles.joinContent}>
            <Text style={styles.joinTitle}>{t('home.joinTitle')}</Text>
            <Text style={styles.joinText}>{t('home.joinText')}</Text>
          </View>
          <TouchableOpacity
            style={styles.joinButton}
            onPress={() => navigation.navigate('Register')}
            activeOpacity={0.86}
          >
            <Text style={styles.joinButtonText}>{t('auth.create_free_account')}</Text>
          </TouchableOpacity>
        </Card>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.page },
  content: { padding: 14, paddingBottom: 24 },
  hero: {
    backgroundColor: COLORS.bxBlue,
    borderRadius: 20,
    padding: 15,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: COLORS.bxBlue,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 4,
  },
  brandLogo: { width: 156, height: 46, marginBottom: 8 },
  slogan: { color: '#fff', fontSize: 19, lineHeight: 23, fontWeight: '900', marginBottom: 5 },
  heroText: { color: '#DBEAFE', fontSize: 12, lineHeight: 17, marginBottom: 11 },
  heroActions: { flexDirection: 'row', gap: 8 },
  primaryButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 13,
    backgroundColor: COLORS.impactOrange,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryButtonText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  secondaryButton: {
    minHeight: 40,
    borderRadius: 13,
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  secondaryButtonText: { color: COLORS.bxBlue, fontSize: 12, fontWeight: '900' },
  welcomeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    padding: 10,
  },
  welcomeIcon: {
    width: 36,
    height: 36,
    borderRadius: 13,
    backgroundColor: COLORS.softGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  welcomeTextWrap: { flex: 1 },
  welcomeTitle: { color: COLORS.bxBlue, fontSize: 14, fontWeight: '900' },
  welcomeText: { color: COLORS.muted, fontSize: 11, lineHeight: 15, marginTop: 1 },
  section: { marginBottom: 12 },
  featureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  featureCard: {
    width: '48.8%',
    minHeight: 92,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 7,
    elevation: 1,
  },
  featureIcon: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  featureTitle: { color: COLORS.bxBlue, fontSize: 13, fontWeight: '900', marginBottom: 3 },
  featureText: { color: COLORS.muted, fontSize: 10, lineHeight: 13 },
  audienceRow: { flexDirection: 'row', gap: 7 },
  audiencePill: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 8,
    alignItems: 'center',
  },
  audienceIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  audienceText: { color: COLORS.bxBlue, fontSize: 11, fontWeight: '900', textAlign: 'center' },
  joinCard: { padding: 12 },
  joinIllustration: { width: 96, height: 96, alignSelf: 'center', marginBottom: 6 },
  joinContent: { marginBottom: 9 },
  joinTitle: { color: COLORS.bxBlue, fontSize: 15, fontWeight: '900', marginBottom: 3 },
  joinText: { color: COLORS.muted, fontSize: 12, lineHeight: 16 },
  joinButton: {
    minHeight: 40,
    borderRadius: 13,
    backgroundColor: COLORS.bxBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinButtonText: { color: '#fff', fontSize: 12, fontWeight: '900' },
});
