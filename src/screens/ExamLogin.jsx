import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  ToastAndroid,
  Dimensions,
  Image,
  StatusBar,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';

const { width, height } = Dimensions.get('window');

const ExamLogin = ({ navigation, route }) => {
  const [regNumber, setRegNumber] = useState('');
  const [password, setPassword] = useState('');
  const [regNumberError, setRegNumberError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isAgreed, setIsAgreed] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const token = await AsyncStorage.getItem('sessionToken');
        const regNumber = await AsyncStorage.getItem('userRegNumber');
        const isLoggedOut = route.params?.isLoggedOut;

        if (isLoggedOut) {
          await AsyncStorage.removeItem('sessionToken');
          await AsyncStorage.removeItem('userRegNumber');
        } else if (token && regNumber) {
          navigation.navigate('ExamPages', { regNumber });
        }
      } catch (error) {
        console.error('Error checking session:', error);
        ToastAndroid.show('Failed to check session. Please try again.', ToastAndroid.SHORT);
      }
    };
    checkSession();
  }, [navigation, route]);

  const validateRegNumber = (value) => {
    if (!value) {
      setRegNumberError('Exam Registration Number is required.');
      return false;
    }
    if (value.length < 6) {
      setRegNumberError('Minimum 6 characters required.');
      return false;
    }
    if (!/^[a-zA-Z0-9]+$/.test(value)) {
      setRegNumberError('Alphanumeric characters only.');
      return false;
    }
    setRegNumberError('');
    return true;
  };

  const validatePassword = (value) => {
    if (!value) {
      setPasswordError('Password is required.');
      return false;
    }
    if (!/^\d{8}$/.test(value)) {
      setPasswordError('Password must be 8 digits (DDMMYYYY format).');
      return false;
    }

    const day = parseInt(value.slice(0, 2), 10);
    const month = parseInt(value.slice(2, 4), 10);
    const year = parseInt(value.slice(4, 8), 10);

    const date = new Date(year, month - 1, day);
    if (
      !(
        date.getDate() === day &&
        date.getMonth() + 1 === month &&
        date.getFullYear() === year &&
        date <= new Date()
      )
    ) {
      setPasswordError('Invalid date. Must be a valid past date in DDMMYYYY format.');
      return false;
    }

    setPasswordError('');
    return true;
  };

  const handleLogin = async () => {
    const isRegNumberValid = validateRegNumber(regNumber);
    const isPasswordValid = validatePassword(password);

    if (!isRegNumberValid || !isPasswordValid) {
      return;
    }

    setIsLoading(true);
    setLoginError('');

    try {
      const response = await mockLogin(regNumber, password);
      if (response.status === 200) {
        await AsyncStorage.setItem('sessionToken', response.token);
        await AsyncStorage.setItem('userRegNumber', regNumber);
        ToastAndroid.show('Login Successful', ToastAndroid.SHORT);
        setShowModal(true);
      } else {
        setLoginError('Invalid credentials. Please try again.');
      }
    } catch (error) {
      setLoginError('Connection failed. Check your internet.');
    } finally {
      setIsLoading(false);
    }
  };

  const mockLogin = (regNumber, password) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (
          (regNumber === 'GATE23' && password === '15081998') ||
          (regNumber === 'TEST123' && password === '01012000')
        ) {
          resolve({
            status: 200,
            token: 'secure-jwt-token',
            user: { regNumber: regNumber, examId: 'GATE-CSE-2025' },
          });
        } else {
          resolve({ status: 401, error: 'Invalid credentials.' });
        }
      }, 1500);
    });
  };

  const handleAgree = async () => {
    if (!isAgreed) {
      ToastAndroid.show('Please agree to the terms.', ToastAndroid.SHORT);
      return;
    }
    ToastAndroid.show('Proceeding to exam...', ToastAndroid.SHORT);
    navigation.navigate('ExamPages', { regNumber });
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#1565C0" barStyle="light-content" />
      <LinearGradient
        colors={['#1976D2', '#1565C0', '#0D47A1']}
        style={styles.gradientBackground}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollViewContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.container}>
              <View style={styles.logoContainer}>
                {/** Fallback for missing image */}
                {Image.resolveAssetSource(require('../../../assets/images/logo.png')) ? (
                  <Image
                    source={require('../../../assets/images/logo.png')}
                    style={styles.logo}
                    accessibilityLabel="NIELIT Exam Portal Logo"
                  />
                ) : (
                  <View style={styles.logoPlaceholder}>
                    <Text style={styles.logoPlaceholderText}>Logo Missing</Text>
                  </View>
                )}
                <Text style={styles.logoText}>NIELIT Exam Portal</Text>
              </View>

              <Text style={styles.title}>Exam Login</Text>

              <View style={styles.formContainer}>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Exam Reg. No.</Text>
                  <TextInput
                    style={[styles.input, regNumberError ? styles.inputError : null]}
                    value={regNumber}
                    onChangeText={(text) => {
                      setRegNumber(text);
                      validateRegNumber(text);
                    }}
                    placeholder="Enter Registration"
                    placeholderTextColor="#999"
                    autoCapitalize="none"
                    accessibilityLabel="Exam Registration Number input field"
                  />
                  {regNumberError ? <Text style={styles.errorText}>{regNumberError}</Text> : null}
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Password (DOB)</Text>
                  <View style={[styles.passwordContainer, passwordError ? styles.inputError : null]}>
                    <TextInput
                      style={styles.passwordInput}
                      value={password}
                      onChangeText={(text) => {
                        setPassword(text);
                        validatePassword(text);
                      }}
                      placeholder="DDMMYYYY"
                      placeholderTextColor="#999"
                      keyboardType="numeric"
                      maxLength={8}
                      secureTextEntry={!showPassword}
                      accessibilityLabel="Password input field (DDMMYYYY format)"
                    />
                    <TouchableOpacity
                      onPress={togglePasswordVisibility}
                      style={styles.eyeIcon}
                      accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                      accessibilityRole="button"
                      accessibilityState={{ expanded: showPassword }}
                    >
                      <Icon
                        name={showPassword ? 'visibility' : 'visibility-off'}
                        size={24}
                        color="#757575"
                      />
                    </TouchableOpacity>
                  </View>
                  {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
                </View>

                {loginError ? <Text style={styles.loginErrorText}>{loginError}</Text> : null}

                <TouchableOpacity
                  style={[
                    styles.loginButton,
                    (!regNumber || !password || regNumberError || passwordError) &&
                      styles.buttonDisabled,
                  ]}
                  onPress={handleLogin}
                  disabled={isLoading || !regNumber || !password || !!regNumberError || !!passwordError}
                  accessibilityRole="button"
                  accessibilityLabel="Login button"
                  accessibilityState={{
                    disabled:
                      isLoading || !regNumber || !password || !!regNumberError || !!passwordError,
                  }}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.buttonText}>Login</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.voiceVerificationButton}
                  onPress={() => navigation.navigate('VoiceVerification')}
                  accessibilityRole="button"
                  accessibilityLabel="Voice Verification button"
                >
                  <Icon name="mic" size={20} color="#1976D2" style={styles.micIcon} />
                  <Text style={styles.voiceVerificationText}>Use Voice Verification</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.supportContainer}>
                <Text style={styles.supportText}>Need help? Contact support:</Text>
                <Text style={styles.supportEmail}>gate-support@example.com</Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>

      <Modal visible={showModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalIllustration}>
              <Icon name="info" size={40} color="#1976D2" />
            </View>

            <Text style={styles.modalTitle}>
              Update your level before starting the next step
            </Text>

            <View style={styles.modalContent}>
              <Text style={styles.modalText}>• Exam Duration: 180 minutes.</Text>
              <Text style={styles.modalText}>• No breaks allowed once started.</Text>
              <Text style={styles.modalText}>
                • Suspicious activity may lead to disqualification.
              </Text>
              <Text style={styles.modalText}>
                • Ensure stable internet and device compatibility.
              </Text>
              <Text style={styles.modalText}>• Once started, you cannot pause the exam.</Text>
            </View>

            <View style={styles.checkboxContainer}>
              <TouchableOpacity
                style={styles.customCheckbox}
                onPress={() => setIsAgreed(!isAgreed)}
                accessibilityRole="checkbox"
                accessibilityLabel="I agree to the exam terms"
                accessibilityState={{ checked: isAgreed }}
              >
                <Icon
                  name={isAgreed ? 'check-box' : 'check-box-outline-blank'}
                  size={24}
                  color={isAgreed ? '#1976D2' : '#999'}
                />
              </TouchableOpacity>
              <Text style={styles.checkboxLabel}>I have read and agree to the exam terms.</Text>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowModal(false)}
                accessibilityRole="button"
                accessibilityLabel="Cancel button"
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.agreeButton, !isAgreed && styles.buttonDisabled]}
                onPress={handleAgree}
                disabled={!isAgreed}
                accessibilityRole="button"
                accessibilityLabel="I agree button"
                accessibilityState={{ disabled: !isAgreed }}
              >
                <Text style={styles.modalButtonText}>I Agree</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1565C0',
  },
  gradientBackground: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#ffffff',
    padding: 8,
  },
  logoPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoPlaceholderText: {
    color: '#999',
    fontSize: 14,
  },
  logoText: {
    fontSize: 26,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 12,
    fontFamily: 'Roboto-Bold',
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 32,
    textAlign: 'center',
    fontFamily: 'Roboto-Bold',
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E3A8A',
    marginBottom: 8,
    fontFamily: 'Roboto-Medium',
  },
  input: {
    height: 56,
    borderColor: '#E0E7FF',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1E3A8A',
    backgroundColor: '#F8FAFC',
    fontFamily: 'Roboto-Regular',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderColor: '#E0E7FF',
    borderWidth: 1,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
  },
  passwordInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1E3A8A',
    fontFamily: 'Roboto-Regular',
  },
  eyeIcon: {
    padding: 10,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    marginTop: 6,
    fontFamily: 'Roboto-Regular',
  },
  loginErrorText: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: 'Roboto-Regular',
  },
  loginButton: {
    backgroundColor: '#1E3A8A',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  buttonDisabled: {
    backgroundColor: '#93C5FD',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Roboto-Medium',
  },
  voiceVerificationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 16,
  },
  micIcon: {
    marginRight: 8,
  },
  voiceVerificationText: {
    color: '#1E3A8A',
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'Roboto-Medium',
  },
  supportContainer: {
    marginTop: 32,
    alignItems: 'center',
  },
  supportText: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'Roboto-Regular',
  },
  supportEmail: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
    fontFamily: 'Roboto-Medium',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: width * 0.9,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalIllustration: {
    marginBottom: 16,
    backgroundColor: '#E0F2FE',
    borderRadius: 50,
    padding: 12,
    alignSelf: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E3A8A',
    marginBottom: 16,
    textAlign: 'center',
    fontFamily: 'Roboto-Bold',
  },
  modalContent: {
    marginBottom: 20,
    width: '100%',
  },
  modalText: {
    fontSize: 16,
    color: '#4B5563',
    marginBottom: 8,
    lineHeight: 24,
    fontFamily: 'Roboto-Regular',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    width: '100%',
  },
  customCheckbox: {
    marginRight: 12,
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#1E3A8A',
    flex: 1,
    fontFamily: 'Roboto-Regular',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '48%',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#EF4444',
  },
  agreeButton: {
    backgroundColor: '#1E3A8A',
  },
  modalButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Roboto-Medium',
  },
});

export default ExamLogin;