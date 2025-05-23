import { useState, useRef, useEffect } from 'react';
import { Alert, BackHandler, AppState } from 'react-native';

export const useExamMonitoring = () => {
  const [isCameraActive, setIsCameraActive] = useState(true);
  const [isMicActive, setIsMicActive] = useState(true);
  const [faceDetected, setFaceDetected] = useState(false);
  const [multipleFaces, setMultipleFaces] = useState(false);
  const [noiseLevel, setNoiseLevel] = useState(0);
  const [cheatingDetected, setCheatingDetected] = useState(false);
  const [noFaceTimeout, setNoFaceTimeout] = useState(null);
  const [appState, setAppState] = useState(AppState.currentState);
  
  const cameraRef = useRef(null);
  const cheatingWarningsRef = useRef({
    face_not_visible: 0,
    multiple_faces: 0,
    noise_detected: 0,
    app_switched: 0,
  });

  // Start monitoring security measures
  const startMonitoring = async () => {
    try {
      // Camera permission would be handled here in a real app
      setIsCameraActive(true);
      setIsMicActive(true);
      
      // Subscribe to app state changes
      const appStateSubscription = AppState.addEventListener('change', nextAppState => {
        setAppState(nextAppState);
        if (nextAppState === 'background' || nextAppState === 'inactive') {
          cheatingWarningsRef.current.app_switched += 1;
          setCheatingDetected(true);
        }
      });
      
      // Clean up function would remove the subscription
      
      return true;
    } catch (error) {
      console.error('Failed to start monitoring:', error);
      Alert.alert(
        'Camera Permission',
        'We need camera access to continue with the secure exam.',
        [{ text: 'OK' }]
      );
      return false;
    }
  };

  const handleFaceDetection = (event) => {
    if (!event.faces || event.faces.length === 0) {
      setFaceDetected(false);
      
      // Start a timer if face is not detected
      if (!noFaceTimeout) {
        const timeout = setTimeout(() => {
          cheatingWarningsRef.current.face_not_visible += 1;
          setCheatingDetected(true);
        }, 5000); // 5 seconds of no face before warning
        setNoFaceTimeout(timeout);
      }
    } else {
      setFaceDetected(true);
      
      // Clear timeout if face is detected again
      if (noFaceTimeout) {
        clearTimeout(noFaceTimeout);
        setNoFaceTimeout(null);
      }
      
      // Check for multiple faces
      if (event.faces.length > 1) {
        setMultipleFaces(true);
        cheatingWarningsRef.current.multiple_faces += 1;
        setCheatingDetected(true);
      } else {
        setMultipleFaces(false);
      }
    }
  };

  const handleNoiseDetected = (level) => {
    setNoiseLevel(level);
    
    // If noise is above threshold
    if (level > 75) { // Arbitrary threshold
      cheatingWarningsRef.current.noise_detected += 1;
      setCheatingDetected(true);
    }
  };

  // Check for different types of cheating
  const detectCheating = () => {
    // Reset cheating flag
    setCheatingDetected(false);
    
    // Check various cheating conditions
    if (cheatingWarningsRef.current.face_not_visible > 3) {
      return 'face_not_visible';
    }
    
    if (cheatingWarningsRef.current.multiple_faces > 1) {
      return 'multiple_faces';
    }
    
    if (cheatingWarningsRef.current.noise_detected > 3) {
      return 'noise_detected';
    }
    
    if (cheatingWarningsRef.current.app_switched > 0) {
      return 'app_switched';
    }
    
    return null;
  };

  // Cleanup function
  useEffect(() => {
    return () => {
      if (noFaceTimeout) {
        clearTimeout(noFaceTimeout);
      }
    };
  }, [noFaceTimeout]);

  return {
    isCameraActive,
    isMicActive,
    faceDetected,
    multipleFaces,
    noiseLevel,
    cheatingDetected,
    cameraRef,
    startMonitoring,
    handleFaceDetection,
    handleNoiseDetected,
    detectCheating,
  };
};