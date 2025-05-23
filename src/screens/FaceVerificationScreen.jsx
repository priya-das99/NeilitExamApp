import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  AppState,
  Image,
  Dimensions,
  ScrollView,
  Platform,
  BackHandler,
} from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { databases, appwriteConfig } from '../utils/appwriteConfig';

const { width, height } = Dimensions.get('window');

const FaceVerificationScreen = ({ navigation, route }) => {
  const { exam } = route.params || {};
  const [showModal, setShowModal] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [instructionsAccepted, setInstructionsAccepted] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const device = useCameraDevice('front');
  const { hasPermission, requestPermission } = useCameraPermission();
  const cameraRef = useRef(null);

  // Request camera permission on mount
  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  // Handle Android back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (capturedImage) {
        setCapturedImage(null);
        return true;
      }
      return false;
    });
    return () => backHandler.remove();
  }, [capturedImage]);

  // Timer effect for guidelines
  useEffect(() => {
    let timer;
    if (showModal && exam) {
      const startTime = new Date(exam.startTime).getTime();
      const now = Date.now();
      const initialTimeRemaining = Math.max(0, startTime - now);
      setTimeRemaining(initialTimeRemaining);
      timer = setInterval(() => {
        const currentTime = Date.now();
        const remaining = Math.max(0, startTime - currentTime);
        setTimeRemaining(remaining);
        if (remaining === 0) {
          clearInterval(timer);
        }
      }, 1000);
    }
    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [showModal, exam]);

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === 'background') {
        Alert.alert(
          'Warning',
          'Leaving the app during verification is not allowed. This may result in disqualification.',
          [{ text: 'OK' }]
        );
      }
    };
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, []);

  // Capture photo
  const handleCapture = async () => {
    if (cameraRef.current) {
      try {
        setIsLoading(true);
        const photo = await cameraRef.current.takePhoto({
          qualityPrioritization: 'quality',
          flash: 'off',
          enableShutterSound: false,
          skipMetadata: true,
        });
        setCapturedImage(`file://${photo.path}`);
      } catch (error) {
        console.error('Capture error:', error);
        Alert.alert('Error', 'Failed to capture photo. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Retake photo
  const handleRetake = () => {
    setCapturedImage(null);
  };

  // Handle photo submission
  const handleSubmit = async () => {
    if (!capturedImage) {
      Alert.alert('Error', 'Please capture your photo before proceeding.');
      return;
    }
    
    try {
      setIsLoading(true);
      // Update student verification status
      await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.studentsCollectionId,
        exam.studentId,
        {
          isVerified: true,
          verificationStatus: 'verified',
          lastVerificationTime: new Date().toISOString()
        }
      );
      setShowModal(true);
    } catch (error) {
      console.error('Submission error:', error);
      Alert.alert('Error', 'Failed to submit photo. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle starting the exam after accepting guidelines
  const handleStartExam = () => {
    if (timeRemaining === 0 && instructionsAccepted) {
      setShowModal(false);
      navigation.navigate('VoiceVerificationScreen', { exam });
    }
  };

  // Modal for exam guidelines
  const renderModal = () => (
    <Modal visible={showModal} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Exam Guidelines</Text>
          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalText}>
              1. Read all instructions carefully before starting the exam.{'\n\n'}
              2. Ensure you have a stable internet connection.{'\n\n'}
              3. Do not refresh or close the browser during the exam.{'\n\n'}
              4. All answers must be submitted before the time expires.{'\n\n'}
              5. Any form of cheating will result in immediate disqualification.
            </Text>
          </ScrollView>
          <View style={styles.timerContainer}>
            <Text style={styles.timerText}>Time Remaining: {formatTime(timeRemaining)}</Text>
          </View>
          <View style={styles.checkboxContainer}>
            <TouchableOpacity 
              style={styles.checkbox}
              onPress={() => setInstructionsAccepted(!instructionsAccepted)}
            >
              {instructionsAccepted && <Icon name="check" size={20} color="#007BFF" />}
            </TouchableOpacity>
            <Text style={styles.checkboxLabel}>I have read and accepted all instructions</Text>
          </View>
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modalButton,
                styles.proceedButton,
                { opacity: (timeRemaining === 0 && instructionsAccepted) ? 1 : 0.5 }
              ]}
              disabled={timeRemaining > 0 || !instructionsAccepted}
              onPress={handleStartExam}
            >
              <Text style={styles.modalButtonText}>Start Exam</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Main camera UI
  const renderCamera = () => {
    if (!device || !hasPermission) {
      return (
        <View style={styles.cameraContainer}>
          <Text style={styles.errorText}>Camera not available or permission denied</Text>
        </View>
      );
    }
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Icon name="person-outline" size={50} color="#007BFF" style={styles.faceIcon} />
          <Text style={styles.title}>Photo Verification</Text>
        </View>
        <View style={styles.cameraContainer}>
          {capturedImage ? (
            <Image source={{ uri: capturedImage }} style={styles.cameraPreview} resizeMode="contain" />
          ) : (
            <Camera
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              device={device}
              isActive={true}
              photo={true}
              enableZoomGesture
              orientation="portrait"
              preset="high"
              pixelFormat="yuv"
            />
          )}
        </View>
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.buttonText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, isLoading && styles.disabledButton]}
            onPress={capturedImage ? handleRetake : handleCapture}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>{capturedImage ? 'Retake' : 'Capture'}</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[styles.submitButton, (!capturedImage || isLoading) && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={!capturedImage || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>Submit Photo</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {renderCamera()}
      {renderModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  faceIcon: {
    marginBottom: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007BFF',
    marginBottom: 15,
  },
  cameraContainer: {
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#007BFF',
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 30,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  cameraPreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '70%',
    marginBottom: 20,
  },
  actionButton: {
    backgroundColor: '#007BFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    elevation: 3,
  },
  submitButton: {
    backgroundColor: '#007BFF',
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 25,
    elevation: 3,
    width: '60%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: width * 0.85,
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 20,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalContent: {
    marginBottom: 20,
  },
  modalText: {
    fontSize: 16,
    color: '#555',
    marginBottom: 10,
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    width: '45%',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#ff4444',
  },
  proceedButton: {
    backgroundColor: '#007BFF',
  },
  modalButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 16,
    color: '#ff4444',
    textAlign: 'center',
    marginVertical: 20,
  },
  timerContainer: {
    alignItems: 'center',
    marginVertical: 15,
  },
  timerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#666',
    borderRadius: 4,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#666',
  },
  disabledButton: {
    opacity: 0.5,
  },
});

export default FaceVerificationScreen;