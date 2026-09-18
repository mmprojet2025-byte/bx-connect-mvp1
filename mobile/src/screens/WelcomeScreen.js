import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { changeAppLanguage, SUPPORTED_LANGUAGES } from '../i18n';

export default function WelcomeScreen({ navigation }) {
  const { t, i18n } = useTranslation();
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
      <View style={styles.backgroundShapes} pointerEvents="none" accessibilityElementsHidden>
        <View style={[styles.backgroundShape, styles.topShape]} />
        <View style={[styles.backgroundShape, styles.middleShape]} />
        <View style={[styles.backgroundShape, styles.bottomShape]} />
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.header}>
          <View style={styles.languages} accessibilityRole="toolbar">
            {SUPPORTED_LANGUAGES.map((language) => {
              const selected = i18n.language?.startsWith(language);
              return (
                <TouchableOpacity
                  key={language}
                  style={[styles.languageButton, selected && styles.selectedLanguage]}
                  onPress={() => changeAppLanguage(language).catch(() => {})}
                  accessibilityRole="button"
                  accessibilityLabel={t(`common.language_${language}`)}
                  accessibilityState={{ selected }}
                >
                  <Text style={[styles.languageText, selected && styles.selectedLanguageText]}>
                    {language.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.main}>
          <Animated.View style={[styles.branding, { opacity: animationValues.logoOpacity, transform: [{ translateY: animationValues.logoTranslateY }] }]}>
            <Image
              source={require('../../assets/images/logo-bx-connect.png')}
              style={styles.logo}
              resizeMode="contain"
              accessibilityLabel="BX-Connect"
            />
          </Animated.View>
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
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  backgroundShapes: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  backgroundShape: {
    position: 'absolute',
    borderRadius: 999,
  },
  topShape: {
    width: 290,
    height: 290,
    top: -110,
    right: -100,
    backgroundColor: '#DBEAFE',
    opacity: 0.48,
  },
  middleShape: {
    width: 250,
    height: 250,
    top: '34%',
    left: -125,
    backgroundColor: '#FFEDD5',
    opacity: 0.4,
  },
  bottomShape: {
    width: 320,
    height: 260,
    right: -100,
    bottom: -100,
    backgroundColor: '#EEF2FF',
    opacity: 0.7,
  },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  header: { alignItems: 'flex-end' },
  languages: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  languageButton: {
    minWidth: 44,
    minHeight: 44,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  selectedLanguage: { backgroundColor: '#1E3A8A' },
  languageText: { color: '#334155', fontSize: 14, lineHeight: 20, fontWeight: '600' },
  selectedLanguageText: { color: '#FFFFFF' },
  main: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 32 },
  branding: { width: '100%', maxWidth: 340, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  logo: { width: '100%', maxWidth: 290, height: 150 },
  actions: { width: '100%', maxWidth: 360, alignSelf: 'center' },
  primaryButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#F97316',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  primaryButtonText: { color: '#fff', fontSize: 15, lineHeight: 20, fontWeight: '700', textAlign: 'center' },
  secondaryButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#2563EB',
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginTop: 12,
  },
  secondaryButtonText: { color: '#fff', fontSize: 15, lineHeight: 20, fontWeight: '700', textAlign: 'center' },
  discoverButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 8, paddingHorizontal: 16, paddingVertical: 10 },
  discoverText: { color: '#334155', fontSize: 15, lineHeight: 22, fontWeight: '600', textAlign: 'center' },
});
