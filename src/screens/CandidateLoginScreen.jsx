import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  ImageBackground, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Animated, 
  Image, 
  ActivityIndicator,
  Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAppwrite } from '../utils/AppwriteContext';
import { useAuthNavigation } from '../hooks/useAuthNavigation';
import { databases, appwriteConfig } from '../utils/appwriteConfig';
import { Query } from 'appwrite';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

const CandidateLoginScreen = ({ navigation }) => {
  const { 
    isLoggedIn, 
    user,
    handleLogin, 
    isLoading: contextLoading,
    error: contextError
  } = useAppwrite();
  const { navigateByRole } = useAuthNavigation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');
  const [localLoading, setLocalLoading] = useState(false);
  const [pendingRole, setPendingRole] = useState(null);
  const [loginAttempts, setLoginAttempts] = useState(0);
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(300)).current;

  // Handle auth state changes (backup navigation)
  useEffect(() => {
    if (isLoggedIn && user?.preferences?.role) {
      navigateByRole(user.preferences.role);
    }
  }, [isLoggedIn, user]);

  // Handle context errors
  useEffect(() => {
    if (contextError) {
      handleLoginError(contextError);
    }
  }, [contextError]);

  // Animation setup
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const validateCredentials = () => {
    // Trim whitespace from inputs
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail) {
      setLocalError('Email and password is required');
      return false;
    }
    if (!emailRegex.test(trimmedEmail)) {
      setLocalError('Please enter a valid email address');
      return false;
    }
    if (trimmedEmail.length > 100) {
      setLocalError('Email must be less than 100 characters');
      return false;
    }

    // Password validation
    if (!trimmedPassword) {
      setLocalError('Password is required');
      return false;
    }
    if (trimmedPassword.length < 6) {
      setLocalError('Password must be at least 6 characters');
      return false;
    }
    if (trimmedPassword.length > 50) {
      setLocalError('Password must be less than 50 characters');
      return false;
    }

    return true;
  };

  const handleLoginAttempt = async () => {
    if (!validateCredentials()) return;

    // Check for too many attempts
    if (loginAttempts >= MAX_LOGIN_ATTEMPTS) {
      const lastAttemptTime = await AsyncStorage.getItem('lastLoginAttempt');
      if (lastAttemptTime) {
        const timeSinceLastAttempt = Date.now() - parseInt(lastAttemptTime);
        if (timeSinceLastAttempt < LOCKOUT_DURATION) {
          const minutesLeft = Math.ceil((LOCKOUT_DURATION - timeSinceLastAttempt) / 60000);
          setLocalError(`Too many attempts. Please try again in ${minutesLeft} minutes`);
          return;
        }
      }
      setLoginAttempts(0);
    }

    setLocalLoading(true);
    setLocalError('');
    
    try {
      const user = await handleLogin(email.trim(), password.trim());
      setLoginAttempts(0);
      await AsyncStorage.removeItem('lastLoginAttempt');
      // Success handled in useEffect
    } catch (error) {
      setLoginAttempts(prev => prev + 1);
      await AsyncStorage.setItem('lastLoginAttempt', Date.now().toString());
      handleLoginError(error);
    } finally {
      setLocalLoading(false);
    }
  };

  const handleLoginError = (error) => {
    const errorMap = {
      'Invalid email or password': 'Wrong email or password',
      'User document not found': 'Account not found. Please sign up first',
      'Server error. Please try again later': 'Server error. Please try again later',
      'Invalid credentials': 'Wrong email or password',
      'user_not_found': 'Account does not exist',
      'too_many_requests': 'Too many attempts. Try again later',
      'Role not set in preferences': 'Contact administrator to assign your role',
      'network_error': 'Network error. Please check your connection',
      'timeout': 'Request timed out. Please try again',
      'invalid_email': 'Please enter a valid email address',
      'invalid_password': 'Invalid password format',
      default: error.message || 'Login failed. Please try again.'
    };

    setLocalError(errorMap[error.message] || errorMap.default);
  };

  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#0066cc" />
      <Text style={styles.loadingText}>Authenticating...</Text>
    </View>
  );

  if (contextLoading) {
    return renderLoadingState();
  }

  return (
    <ImageBackground
      source={require('../../assets/images/getbg.jpg')}
      style={styles.background}
    >
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        {/* Admin Login Button */}
        <TouchableOpacity 
          style={styles.adminLoginButton} 
          onPress={() => navigation.navigate('ControllerLogin')}
          accessibilityLabel="Admin login button"
          accessibilityHint="Double tap to navigate to admin login"
        >
          <Image
            source={require('../../assets/icons/admin_icon.png')}
            style={styles.adminIcon}
          />
        </TouchableOpacity>

        {/* Logo */}
        <Animated.Image
          source={require('../../assets/images/logo.png')}
          style={[styles.logo, { transform: [{ translateY: slideAnim }] }]}
          accessibilityLabel="App logo"
        />

        <Text style={styles.title}>Login To Your Account</Text>

        {/* Email Input */}
        <View style={[styles.inputContainer, localError && styles.inputError]}>
          <Icon name="email" size={24} color="#999999" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Enter Email"
            placeholderTextColor="#999999"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setLocalError(''); // Clear error when user types
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={100}
            editable={!localLoading}
          />
        </View>

        {/* Password Input */}
        <View style={[styles.inputContainer, localError && styles.inputError]}>
          <Icon name="lock" size={24} color="#999999" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#999999"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setLocalError(''); // Clear error when user types
            }}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={50}
            editable={!localLoading}
          />
          <TouchableOpacity 
            onPress={togglePasswordVisibility} 
            style={styles.eyeIcon}
          >
            <Icon
              name={showPassword ? 'visibility-off' : 'visibility'}
              size={24}
              color="#999999"
            />
          </TouchableOpacity>
        </View>

        {/* Error Message */}
        {localError ? 
          <Text style={styles.errorText}>{localError}</Text> : null}

        {/* Login Button */}
        <TouchableOpacity 
          style={[
            styles.loginButton, 
            (localLoading || contextLoading) && styles.disabledButton
          ]} 
          onPress={handleLoginAttempt}
          disabled={localLoading || contextLoading}
          accessibilityLabel="Login button"
          accessibilityHint="Double tap to login with your credentials"
        >
          {localLoading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.loginButtonText}>Login</Text>
          )}
        </TouchableOpacity>

        {/* Navigation Links */}
        <TouchableOpacity 
          onPress={() => navigation.navigate('ForgotPassword')}
          accessibilityLabel="Forgot password link"
          accessibilityHint="Double tap to navigate to forgot password screen"
        >
          <Text style={styles.linkText}>Forgot Password?</Text>
        </TouchableOpacity>
      </Animated.View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    resizeMode: 'cover',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#0066cc',
  },
  adminLoginButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0066cc',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 6,
    zIndex: 10,
  },
  adminIcon: {
    width: 28,
    height: 28,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 40,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '90%',
    height: 60,
    paddingHorizontal: 15,
    marginBottom: 15,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#cccccc',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputError: {
    borderColor: '#ff4444',
    borderWidth: 2,
  },
  input: {
    flex: 1,
    fontSize: 16,
    marginLeft: 10,
    color: '#333333',
  },
  inputIcon: {
    marginRight: 10,
  },
  eyeIcon: {
    marginLeft: 10,
  },
  loginButton: {
    width: '90%',
    height: 56,
    backgroundColor: '#0066cc',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
    shadowColor: '#0066cc',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  disabledButton: {
    backgroundColor: '#99c2ff',
    shadowOpacity: 0.1,
  },
  loginButtonText: {
    fontSize: 18,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  loginText: {
    fontSize: 16,
    color: '#0066cc',
    marginBottom: 15,
  },
  linkText: {
    fontSize: 16,
    color: '#0066cc',
    marginBottom: 15,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 14,
    marginTop: -10,
    marginBottom: 15,
    width: '90%',
    alignSelf: 'center',
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default CandidateLoginScreen;