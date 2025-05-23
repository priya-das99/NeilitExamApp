// CheatingWarningModal.js component implementation
import React from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

const { width } = Dimensions.get('window');

const CheatingWarningModal = ({ visible, type, onClose, onBlock }) => {
  const getWarningMessage = () => {
    switch (type) {
      case 'face_not_visible':
        return 'Your face is not visible in the camera. Please ensure your face is clearly visible to continue.';
      case 'multiple_faces':
        return 'Multiple faces detected in camera. Please ensure you are the only person visible to continue.';
      case 'suspicious_noise':
        return 'Suspicious noise detected. Please ensure you are in a quiet environment.';
      default:
        return 'Suspicious activity detected. This may lead to disqualification.';
    }
  };

  const getWarningTitle = () => {
    switch (type) {
      case 'face_not_visible':
        return 'Face Not Visible';
      case 'multiple_faces':
        return 'Multiple Faces Detected';
      case 'suspicious_noise':
        return 'Suspicious Noise';
      default:
        return 'Warning';
    }
  };

  const isCritical = type === 'face_not_visible' || type === 'multiple_faces';

  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.warningModal}>
          <View style={styles.warningIconContainer}>
            <View style={[styles.warningIcon, isCritical && styles.criticalIcon]}>
              <Text style={styles.warningIconText}>!</Text>
            </View>
          </View>
          <Text style={[styles.warningTitle, isCritical && styles.criticalTitle]}>
            {getWarningTitle()}
          </Text>
          <Text style={styles.warningText}>{getWarningMessage()}</Text>
          
          <TouchableOpacity style={styles.primaryButton} onPress={onClose}>
            <LinearGradient colors={['#3B82F6', '#1E3A8A']} style={styles.buttonGradient}>
              <Text style={styles.buttonText}>Acknowledge</Text>
            </LinearGradient>
          </TouchableOpacity>
          
          {isCritical && (
            <TouchableOpacity style={styles.secondaryButton} onPress={onBlock}>
              <LinearGradient colors={['#EF4444', '#B91C1C']} style={styles.buttonGradient}>
                <Text style={styles.buttonText}>I Understand Consequences</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  warningModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    width: width * 0.85,
    alignItems: 'center',
    elevation: 5,
  },
  warningIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  warningIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFC107',
    justifyContent: 'center',
    alignItems: 'center',
  },
  criticalIcon: {
    backgroundColor: '#EF4444',
  },
  warningIconText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  warningTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F44336',
    marginBottom: 12,
    fontFamily: 'Roboto-Bold',
  },
  criticalTitle: {
    color: '#B91C1C',
  },
  warningText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#757575',
    marginBottom: 24,
    fontFamily: 'Roboto-Regular',
  },
  primaryButton: {
    borderRadius: 8,
    width: '100%',
    marginBottom: 12,
    overflow: 'hidden',
  },
  secondaryButton: {
    borderRadius: 8,
    width: '100%',
    overflow: 'hidden',
  },
  buttonGradient: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'Roboto-Medium',
  },
});

export default CheatingWarningModal;