import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, Alert } from 'react-native';

const CandidateOtpVerification = ({ navigation }) => {
  const [otp, setOtp] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);

  const handleVerify = () => {
    if (otp.length === 6) {
      // Simulate OTP verification success
      setIsModalVisible(true);
    } else {
      Alert.alert('Invalid OTP', 'Please enter a valid 6-digit OTP.');
    }
  };

  const handleResendOtp = () => {
    // Simulate OTP resend logic
    Alert.alert('OTP Resent', 'A new OTP has been sent to your mobile number.');
  };

  const handleModalClose = () => {
    setIsModalVisible(false);
    navigation.navigate('Home'); // Navigate to Home screen after verification
  };

  return (
    <View style={styles.container}>
      {/* Title */}
      <Text style={styles.title}>Enter 6 Digit OTP</Text>

      {/* Subtitle */}
      <Text style={styles.subtitle}>
        Enter the OTP code from the phone we just sent you.
      </Text>

      {/* OTP Input */}
      <TextInput
        style={styles.otpInput}
        placeholder="Enter OTP"
        placeholderTextColor="#999999"
        value={otp}
        onChangeText={setOtp}
        keyboardType="number-pad"
        maxLength={6}
      />

      {/* Resend OTP Link */}
      <TouchableOpacity onPress={handleResendOtp}>
        <Text style={styles.resendText}>Didn't receive OTP Code? Resend</Text>
      </TouchableOpacity>

      {/* Verify Button */}
      <TouchableOpacity style={styles.verifyButton} onPress={handleVerify}>
        <Text style={styles.verifyButtonText}>Verify</Text>
      </TouchableOpacity>

      {/* Success Modal */}
      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Login Successful</Text>
            <TouchableOpacity style={styles.modalButton} onPress={handleModalClose}>
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    fontFamily: 'Poppins-Bold', // Use a custom font
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
    fontFamily: 'Poppins-Regular', // Use a custom font
  },
  otpInput: {
    width: '80%',
    padding: 15,
    marginBottom: 20,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cccccc',
    textAlign: 'center',
    fontSize: 18,
    fontFamily: 'Poppins-Medium', // Use a custom font
  },
  resendText: {
    fontSize: 14,
    color: '#007bff',
    marginBottom: 20,
    fontFamily: 'Poppins-Regular', // Use a custom font
  },
  verifyButton: {
    width: '80%',
    padding: 15,
    backgroundColor: '#007bff',
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  verifyButtonText: {
    fontSize: 18,
    color: '#ffffff',
    fontWeight: 'bold',
    fontFamily: 'Poppins-SemiBold', // Use a custom font
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    padding: 20,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    fontFamily: 'Poppins-Bold', // Use a custom font
  },
  modalButton: {
    width: '50%',
    padding: 10,
    backgroundColor: '#007bff',
    borderRadius: 10,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: 'bold',
    fontFamily: 'Poppins-SemiBold', // Use a custom font
  },
});

export default CandidateOtpVerification;