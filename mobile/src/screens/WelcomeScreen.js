import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../components/MobileUI';

export default function WelcomeScreen({ navigation }) {
  const { t } = useTranslation();
  const animationValues = useRef({
    logoOpacity: new Animated.Value(0),
    logoTranslateY: new Animated.Value(10),
    actionOpacities: [0, 1, 2].map(() => new Animated.Value(0)),
    actionTranslations: [0, 1, 2].map(() => new Animated.Value(8)),
  }).current;

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
        <View style={styles.decoration} pointerEvents="none" accessible={false}>
          <View style={styles.blueShape} />
          <View style={styles.orangeShape} />
          <View style={styles.lightBlueShape} />
        </View>

        <View style={styles.main}>
          <Animated.View style={{ opacity: animationValues.logoOpacity, transform: [{ translateY: animationValues.logoTranslateY }] }}>
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
  content: {
    flexGrow: 1,
    overflow: 'hidden',
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 10,
  },
  decoration: { ...StyleSheet.absoluteFillObject },
  blueShape: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#EFF6FF',
    top: -80,
    right: -95,
  },
  orangeShape: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#FFF7ED',
    top: '38%',
    left: -58,
  },
  lightBlueShape: {
    position: 'absolute',
    width: 72,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#BAE6FD',
    top: '25%',
    alignSelf: 'center',
  },
  main: { flex: 1, minHeight: 260, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 260, height: 66, maxWidth: '90%' },
  actions: { width: '100%', maxWidth: 520, alignSelf: 'center', paddingTop: 18 },
  primaryButton: {
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: COLORS.impactOrange,
    paddingHorizontal: 18,
  },
  primaryButtonText: { color: '#fff', fontSize: 15, lineHeight: 20, fontWeight: '900' },
  secondaryButton: {
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: COLORS.bxBlue,
    paddingHorizontal: 18,
    marginTop: 10,
  },
  secondaryButtonText: { color: '#fff', fontSize: 15, lineHeight: 20, fontWeight: '900' },
  discoverButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 4, paddingHorizontal: 12 },
  discoverText: { color: COLORS.bxBlueLight, fontSize: 14, lineHeight: 20, fontWeight: '800', textAlign: 'center' },
});
