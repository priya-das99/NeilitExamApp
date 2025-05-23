import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';

const ExamCamera = ({ onFaceDetection, cameraRef }) => {
  const device = useCameraDevice('front');
  const { hasPermission, requestPermission } = useCameraPermission();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Request camera permission
  useEffect(() => {
    const requestCameraAccess = async () => {
      if (!hasPermission) {
        const granted = await requestPermission();
        if (!granted) {
          console.log('Camera permission denied');
        }
      }
    };
    requestCameraAccess();
  }, [hasPermission, requestPermission]);

  // Pulse animation for recording indicator
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [pulseAnim]);

  // Handle face detection (placeholder for VisionCamera face detection)
  const handleFacesDetected = (faces) => {
    if (onFaceDetection) {
      onFaceDetection({ faces });
    }
  };

  if (!device || !hasPermission) {
    return (
      <View style={styles.cameraContainer}>
        <Text style={styles.errorText}>Camera not available or permission denied</Text>
      </View>
    );
  }

  return (
    <Animated.View style={[styles.cameraContainer, { transform: [{ scale: pulseAnim }] }]}>
      <Camera
        ref={cameraRef}
        style={styles.camera}
        device={device}
        isActive={true}
        enableFaceDetection
        onFacesDetected={handleFacesDetected} // VisionCamera requires a plugin for face detection; this is a placeholder
      />
      <View style={styles.recordingIndicator}>
        <View style={styles.redDot} />
        <Text style={styles.recordingText}>Recording</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  cameraContainer: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 100,
    height: 150,
    borderRadius: 12,
    overflow: 'hidden',
    opacity: 0.9,
    elevation: 5,
  },
  camera: {
    flex: 1,
  },
  recordingIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 16,
  },
  redDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F44336',
    marginRight: 4,
  },
  recordingText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontFamily: 'Roboto-Regular',
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 12,
    textAlign: 'center',
    padding: 10,
  },
});

export { ExamCamera };