import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image, Animated, Easing } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useAppwrite } from '../utils/AppwriteContext';

const SplashScreen = ({ navigation }) => {
  const spinValue = new Animated.Value(0);
  const scaleValue = new Animated.Value(0.8);
  const fadeValue = new Animated.Value(0);
  const { isLoggedIn, user } = useAppwrite();

  useEffect(() => {
    // Start animations
    Animated.parallel([
      Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 3000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start(),
      Animated.spring(scaleValue, {
        toValue: 1,
        friction: 3,
        useNativeDriver: true,
      }).start(),
      Animated.timing(fadeValue, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      }).start(),
    ]);

    // Navigate to the next screen after 3 seconds
    const timer = setTimeout(() => {
      if (isLoggedIn && user?.preferences?.role === 'admin') {
        navigation.replace('AdminDashboard');
      } else if (isLoggedIn && user?.preferences?.role === 'student') {
        navigation.replace('DrawerMain');
      } else {
        navigation.replace('CandidateLogin');
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [isLoggedIn, user, navigation]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <LinearGradient colors={['#000428', '#004e92']} style={styles.container}>
      <Animated.Image
        style={[styles.logo, { transform: [{ rotate: spin }, { scale: scaleValue }] }]}
        source={require('../../assets/images/logo.png')}
      />
      <Animated.Text style={[styles.title, { opacity: fadeValue }]}>
        NielitExamPortal
      </Animated.Text>
      <Animated.Text style={[styles.subtitle, { opacity: fadeValue }]}>
        Developed By - NIELIT Tezpur EC
      </Animated.Text>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 160,
    height: 160,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 16,
    color: '#dfe6e9',
    marginTop: 10,
  },
});

export default SplashScreen;
