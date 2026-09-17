import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import AppIcon from '../components/AppIcon';
import { changeAppLanguage, SUPPORTED_LANGUAGES } from '../i18n';

export default function WelcomeScreen({ navigation }) {
  const { t, i18n } = useTranslation();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [animationValues] = useState(() => ({
    logoOpacity: new Animated.Value(0),
    logoTranslateY: new Animated.Value(10),
    actionOpacities: [0, 1, 2].map(() => new Animated.Value(0)),
    actionTranslations: [0, 1, 2].map(() => new Animated.Value(8)),
  }));

  useEffect(() => {
    let mounted = true;
    let entranceAnimation;

    const showImmediately = () => {
      animationValues.logoOpacity.setValue(1);
      animationValues.logoTranslateY.setValue(0);
      animationValues.actionOpacities.forEach((value) => value.setValue(1));
      animationValues.actionTranslations.forEach((value) => value.setValue(0));
    };

    const startEntrance = () => {
      animationValues.logoOpacity.setValue(0);
      animationValues.logoTranslateY.setValue(10);
      animationValues.actionOpacities.forEach((value) => value.setValue(0));
      animationValues.actionTranslations.forEach((value) => value.setValue(8));
      entranceAnimation = Animated.sequence([
        Animated.parallel([
          Animated.timing(animationValues.logoOpacity, {
            toValue: 1,
            duration: 320,
            useNativeDriver: true,
          }),
          Animated.timing(animationValues.logoTranslateY, {
            toValue: 0,
            duration: 320,
            useNativeDriver: true,
          }),
        ]),
        Animated.stagger(70, animationValues.actionOpacities.map((opacity, index) => (
          Animated.parallel([
            Animated.timing(opacity, {
              toValue: 1,
              duration: 220,
              useNativeDriver: true,
            }),
            Animated.timing(animationValues.actionTranslations[index], {
              toValue: 0,
              duration: 220,
              useNativeDriver: true,
            }),
          ])
        ))),
      ]);
      entranceAnimation.start();
    };

    const handleReduceMotion = (enabled) => {
      if (!enabled) return;
      entranceAnimation?.stop();
      showImmediately();
    };

    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', handleReduceMotion);
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (!mounted) return;
        if (enabled) showImmediately();
        else startEntrance();
      })
      .catch(() => {
        if (mounted) showImmediately();
      });

    return () => {
      mounted = false;
      subscription.remove();
      entranceAnimation?.stop();
    };
  }, [animationValues]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'right', 'bottom', 'left']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => setSettingsOpen((open) => !open)}
            accessibilityRole="button"
            accessibilityLabel={t('welcome.settings')}
            accessibilityState={{ expanded: settingsOpen }}
          >
            <AppIcon name="settings-outline" size={24} color="#64748B" />
          </TouchableOpacity>
        </View>
        {settingsOpen && (
          <View style={styles.settingsPanel}>
            <Text style={styles.settingsLabel}>{t('profile.language')}</Text>
            <View style={styles.languages}>
              {SUPPORTED_LANGUAGES.map((language) => (
                <TouchableOpacity
                  key={language}
                  style={[styles.languageButton, i18n.language?.startsWith(language) && styles.selectedLanguage]}
                  onPress={() => changeAppLanguage(language).catch(() => {})}
                  accessibilityRole="button"
                  accessibilityState={{ selected: i18n.language?.startsWith(language) }}
                >
                  <Text style={styles.languageText}>{t(`common.language_${language}`)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={styles.main}>
          <Animated.View style={[styles.branding, { opacity: animationValues.logoOpacity, transform: [{ translateY: animationValues.logoTranslateY }] }]}>
            <Image
              source={require('../../assets/images/logo-bx-connect.png')}
              style={styles.logo}
              resizeMode="contain"
              accessibilityLabel="BX-Connect"
            />
            <Text style={styles.description}>{t('welcome.description')}</Text>
          </Animated.View>
          <Image
            source={require('../../assets/images/welcome-community.jpg')}
            style={styles.communityImage}
            resizeMode="cover"
            accessibilityLabel={t('welcome.communityImage')}
          />
        </View>

        <View style={styles.actions}>
          <Animated.View
            style={{ opacity: animationValues.actionOpacities[0], transform: [{ translateY: animationValues.actionTranslations[0] }] }}
          >
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.navigate('Register')}
              accessibilityRole="button"
              accessibilityLabel={t('navigation.createAccount')}
            >
              <Text style={styles.primaryButtonText}>{t('navigation.createAccount')}</Text>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View
            style={{ opacity: animationValues.actionOpacities[1], transform: [{ translateY: animationValues.actionTranslations[1] }] }}
          >
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => navigation.navigate('Login')}
              accessibilityRole="button"
              accessibilityLabel={t('auth.login_btn')}
            >
              <Text style={styles.secondaryButtonText}>{t('auth.login_btn')}</Text>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View
            style={{ opacity: animationValues.actionOpacities[2], transform: [{ translateY: animationValues.actionTranslations[2] }] }}
          >
            <TouchableOpacity
              style={styles.discoverButton}
              onPress={() => navigation.navigate('Home')}
              accessibilityRole="link"
              accessibilityLabel={t('welcome.discover')}
            >
              <Text style={styles.discoverText}>{t('welcome.discover')}</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  header: { alignItems: 'flex-end', paddingTop: 4 },
  settingsButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  settingsPanel: { backgroundColor: '#F1F5F9', borderRadius: 14, padding: 12, marginBottom: 12 },
  settingsLabel: { color: '#192E6B', fontSize: 14, fontWeight: '600', marginBottom: 8 },
  languages: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  languageButton: { minHeight: 44, paddingHorizontal: 12, paddingVertical: 12, justifyContent: 'center', borderRadius: 10 },
  selectedLanguage: { backgroundColor: '#DBEAFE' },
  languageText: { color: '#0062D2', fontSize: 14, fontWeight: '600' },
  main: { flexGrow: 1, alignItems: 'center', justifyContent: 'space-evenly', paddingBottom: 24 },
  branding: { width: '100%', alignItems: 'center', paddingTop: 12, paddingBottom: 24 },
  logo: { width: '100%', maxWidth: 270, height: 90 },
  description: { maxWidth: 280, color: '#64748B', fontSize: 15, lineHeight: 24, textAlign: 'center', marginTop: 12 },
  communityImage: { width: '100%', aspectRatio: 1.9, maxHeight: 180, borderRadius: 16, backgroundColor: '#F1F5F9' },
  actions: { width: '100%', paddingTop: 8 },
  primaryButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#F56E10',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  primaryButtonText: { color: '#fff', fontSize: 16, lineHeight: 24, fontWeight: '700', textAlign: 'center' },
  secondaryButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#192E6B',
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginTop: 14,
  },
  secondaryButtonText: { color: '#fff', fontSize: 16, lineHeight: 24, fontWeight: '600', textAlign: 'center' },
  discoverButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 20, paddingHorizontal: 12, paddingVertical: 10 },
  discoverText: { color: '#0062D2', fontSize: 15, lineHeight: 22, fontWeight: '500', textAlign: 'center' },
});
