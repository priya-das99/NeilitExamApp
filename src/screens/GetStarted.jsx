import React, { useEffect } from 'react';
import { 
  View, Text, ImageBackground, TouchableOpacity, StyleSheet, Animated, Easing 
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

const GetStarted = ({ navigation }) => {
  const fadeAnim = new Animated.Value(0);
  const slideAnim = new Animated.Value(50);
  const scaleAnim = new Animated.Value(0.8);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 1000,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleGetStarted = () => {
    navigation.navigate('CandidateLogin');
  };

  return (
    <ImageBackground
      source={require('../../assets/images/getbg.jpg')}
      style={styles.background}
      blurRadius={6}
    >
      <View style={styles.overlay} />

      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        {/* Logo */}
        <Animated.Image
          source={require('../../assets/images/logo.png')}
          style={[styles.logo, { transform: [{ translateY: slideAnim }] }]}
        />

        {/* Title */}
        <Animated.Text style={[styles.title, { transform: [{ translateY: slideAnim }] }]}>
          Welcome to{' '}
          <Text style={styles.brandName}>NielitExamPortal</Text>
        </Animated.Text>

        {/* Subtitle */}
        <Animated.Text style={[styles.subtitle, { transform: [{ scale: scaleAnim }] }]}>
          Enhance your skills and excel with expertly curated questions.
        </Animated.Text>

        {/* Gradient Get Started Button */}
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <TouchableOpacity onPress={handleGetStarted} activeOpacity={0.9}>
            <LinearGradient
              colors={['#007bff', '#0056b3']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.getStartedButton}
            >
              <Text style={styles.getStartedButtonText}>Get Started</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Footer Text */}
        <Text style={styles.footerText}>Developed by NIELIT Tezpur EC</Text>
      </Animated.View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    resizeMode: 'cover',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)', // Dark overlay for better readability
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logo: {
    width: 130,
    height: 130,
    marginBottom: 20,
    borderRadius: 20,
  },
  title: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
    fontFamily: 'Poppins-Bold',
  },
  brandName: {
    color: '#ffcc00',
  },
  subtitle: {
    fontSize: 18,
    color: '#f1f1f1',
    textAlign: 'center',
    marginBottom: 40,
    paddingHorizontal: 25,
    fontFamily: 'Poppins-Regular',
    lineHeight: 26,
  },
  getStartedButton: {
    width: 200,
    paddingVertical: 15,
    borderRadius: 30,
    alignItems: 'center',
    shadowColor: '#007bff',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  getStartedButtonText: {
    fontSize: 20,
    color: '#ffffff',
    fontWeight: 'bold',
    fontFamily: 'Poppins-SemiBold',
    letterSpacing: 1,
  },
  footerText: {
    position: 'absolute',
    bottom: 20,
    fontSize: 14,
    color: '#ddd',
    fontFamily: 'Poppins-Light',
  },
});

export default GetStarted;
