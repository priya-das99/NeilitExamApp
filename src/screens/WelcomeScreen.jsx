import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ImageBackground } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

const WelcomeScreen = ({ navigation }) => {
  return (
    <ImageBackground 
      source={require('../../assets/images/wbg.png')} // Replace with your background image
      style={styles.background}
    >
      <LinearGradient colors={['rgba(0,0,0,0.6)', 'rgba(0,0,0,0.3)']} style={styles.overlay}>
        {/* Logo */}
        <Image
          source={require('../../assets/images/logo.png')} // Replace with your logo image
          style={styles.logo}
        />

        {/* Title */}
        <Text style={styles.title}>WELCOME</Text>

        {/* Subtitle */}
        <Text style={styles.subtitle}>
          Challenge yourself with our interactive quizzes and discover how much you know about various topics.
        </Text>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          {/* Skip Button */}
          <TouchableOpacity
            style={styles.skipButton}
            onPress={() => navigation.navigate('CandidateLogin')}
          >
            <Text style={styles.skipButtonText}>Skip</Text>
          </TouchableOpacity>

          {/* Next Button */}
          <TouchableOpacity
            style={styles.nextButton}
            onPress={() => navigation.navigate('Language')}
          >
            <Text style={styles.nextButtonText}>Next</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
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
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logo: {
    width: 150,
    height: 150,
    marginBottom: 20,
  },
  title: {
    fontFamily: 'Poppins-Bold',
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 18,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 40,
    paddingHorizontal: 30,
    opacity: 0.9,
    fontFamily: 'Poppins-Regular',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 20,
  },
  skipButton: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  skipButtonText: {
    fontSize: 16,
    color: '#000000',
    fontWeight: 'bold',
  },
  nextButton: {
    backgroundColor: '#ff7f50',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  nextButtonText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: 'bold',
  },
});

export default WelcomeScreen;
