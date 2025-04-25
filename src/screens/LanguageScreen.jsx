import React, { useState, useEffect } from 'react';
import { View, Text, ImageBackground, TouchableOpacity, StyleSheet, Animated } from 'react-native';

const LanguageScreen = ({ navigation }) => {
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const fadeAnim = new Animated.Value(0); // For fade animation

  const languages = ['English', 'অসমীয়া', 'বাংলা', 'हिन्दी'];

  // Fade-in animation when the screen loads
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const handleLanguageSelect = (language) => {
    setSelectedLanguage(language);
    // You can add logic here to change the app's language globally
  };

  const handleConfirm = () => {
    // Navigate to the GetStarted screen
    navigation.navigate('GetStarted');
  };

  return (
    <ImageBackground
    source={require('../../assets/images/lgbg.png')} // Replace with your background image
      style={styles.background}
    >
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <Text style={styles.title}>Select Language</Text>

        {/* Language Options */}
        <View style={styles.languageContainer}>
          {languages.map((language, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.languageButton,
                selectedLanguage === language && styles.selectedLanguageButton,
              ]}
              onPress={() => handleLanguageSelect(language)}
            >
              <Text
                style={[
                  styles.languageText,
                  selectedLanguage === language && styles.selectedLanguageText,
                ]}
              >
                {language}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Confirm Button */}
        <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
          <Text style={styles.confirmButtonText}>Confirm</Text>
        </TouchableOpacity>
      </Animated.View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    resizeMode: 'cover',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)', // Semi-transparent white background
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 30,
  },
  languageContainer: {
    width: '100%',
    alignItems: 'center',
  },
  languageButton: {
    width: '80%',
    padding: 15,
    marginVertical: 10,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cccccc',
    alignItems: 'center',
  },
  selectedLanguageButton: {
    backgroundColor: '#32cd32',
    borderColor: '#32cd32',
  },
  languageText: {
    fontSize: 18,
    color: '#000000',
  },
  selectedLanguageText: {
    color: '#ffffff',
  },
  confirmButton: {
    width: '80%',
    padding: 15,
    marginTop: 30,
    backgroundColor: '#007bff',
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 18,
    color: '#ffffff',
    fontWeight: 'bold',
  },
});

export default LanguageScreen;