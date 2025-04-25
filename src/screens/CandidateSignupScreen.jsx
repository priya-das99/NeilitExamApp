import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { AuthService } from '../utils/authService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Constants for throttling
const REGISTRATION_THROTTLE_KEY = 'lastRegistrationAttempt';
const THROTTLE_DURATION = 30 * 1000; // 30 seconds

const CandidateSignupScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isThrottled, setIsThrottled] = useState(false);
  const [retryTimer, setRetryTimer] = useState(0);

  // Check if registration is throttled on component mount
  useEffect(() => {
    checkThrottleStatus();
  }, []);

  // Timer for throttling countdown
  useEffect(() => {
    let interval;
    if (isThrottled && retryTimer > 0) {
      interval = setInterval(() => {
        setRetryTimer((prev) => {
          if (prev <= 1) {
            setIsThrottled(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isThrottled, retryTimer]);

  // Check if user is throttled
  const checkThrottleStatus = async () => {
    try {
      const lastAttempt = await AsyncStorage.getItem(REGISTRATION_THROTTLE_KEY);
      if (lastAttempt) {
        const timestamp = parseInt(lastAttempt, 10);
        const now = Date.now();
        const timeElapsed = now - timestamp;

        if (timeElapsed < THROTTLE_DURATION) {
          const remainingTime = Math.ceil((THROTTLE_DURATION - timeElapsed) / 1000);
          setIsThrottled(true);
          setRetryTimer(remainingTime);
          setErrorMessage(`Too many registration attempts. Please try again in ${remainingTime} seconds.`);
        }
      }
    } catch (error) {
      console.error('Error checking throttle status:', error);
    }
  };

  // Set throttle when needed
  const setThrottle = async () => {
    try {
      await AsyncStorage.setItem(REGISTRATION_THROTTLE_KEY, Date.now().toString());
      setIsThrottled(true);
      setRetryTimer(30);
    } catch (error) {
      console.error('Error setting throttle:', error);
    }
  };

  // Validate the form inputs
  const validateForm = () => {
    if (!name || !email || !password || !confirmPassword) {
      setErrorMessage('All fields are required.');
      return false;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return false;
    }

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters.');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrorMessage('Please enter a valid email address.');
      return false;
    }

    return true;
  };

  // Handle signup submission
  const handleSignup = async () => {
    if (isRegistering || isThrottled) return;

    // Clear previous errors
    setErrorMessage('');

    // Validate the form
    if (!validateForm()) return;

    setIsRegistering(true);

    try {
      // Register the user using the AuthService.registerUser method
      const user = await AuthService.registerUser(email, password, name);

      // Show success message and navigate to login
      Alert.alert(
        'Registration Successful',
        'Your account has been created successfully. Please sign in with your credentials.',
        [
          {
            text: 'Go to Login',
            onPress: () => {
              navigation.navigate('CandidateLogin');
            }
          }
        ]
      );
    } catch (error) {
      console.error('Signup error:', error);

      // Handle specific error types
      if (error.message && error.message.includes('Permissions')) {
        setErrorMessage('An error occurred while saving your data. Please contact support.');
      } else if (error.message && error.message.includes('Rate limit')) {
        setThrottle();
        setErrorMessage('Too many registration attempts. Please try again in 30 seconds.');
      } else if (error.message && error.message.includes('already exists')) {
        setErrorMessage('An account with this email already exists.');
      } else {
        setErrorMessage('Registration failed: ' + (error.message || 'Unknown error'));
      }
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Candidate Signup</Text>

      {errorMessage ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      <TextInput
        style={styles.input}
        placeholder="Full Name"
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
        editable={!isThrottled}
      />

      <TextInput
        style={styles.input}
        placeholder="Email"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
        editable={!isThrottled}
      />

      <TextInput
        style={styles.input}
        placeholder="Password (minimum 8 characters)"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        editable={!isThrottled}
      />

      <TextInput
        style={styles.input}
        placeholder="Confirm Password"
        secureTextEntry
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        editable={!isThrottled}
      />

      <TouchableOpacity
        style={[
          styles.button,
          (isRegistering || isThrottled) && styles.disabledButton
        ]}
        onPress={handleSignup}
        disabled={isRegistering || isThrottled}
      >
        <Text style={styles.buttonText}>
          {isRegistering ? 'Creating Account...' : isThrottled ? `Retry in ${retryTimer}s` : 'Sign Up'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.loginLink}
        onPress={() => navigation.navigate('CandidateLogin')}
      >
        <Text style={styles.loginText}>Already have an account? Login</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
  },
  errorText: {
    color: '#d32f2f',
    textAlign: 'center',
    fontSize: 14,
  },
  input: {
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 15,
  },
  disabledButton: {
    backgroundColor: '#cccccc',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  loginLink: {
    alignItems: 'center',
  },
  loginText: {
    color: '#007bff',
    textAlign: 'center',
    fontSize: 16,
  },
});

export default CandidateSignupScreen;
