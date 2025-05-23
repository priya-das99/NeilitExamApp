import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Dimensions,
  ToastAndroid,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import RNFS from 'react-native-fs';

const { width, height } = Dimensions.get('window');

const VoiceVerificationScreen = ({ navigation, route }) => {
  const { exam } = route.params || {};
  const [hasPermission, setHasPermission] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioPath, setAudioPath] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const audioRecorderPlayer = useRef(new AudioRecorderPlayer()).current;
  const recordTime = useRef(0); // Tracks duration from listener
  const timerRef = useRef(null); // Fallback timer
  const startTimeRef = useRef(0); // Start time for fallback calculation

  // Request and check microphone permission
  useEffect(() => {
    const requestPermission = async () => {
      try {
        const micPermission = await check(
          Platform.OS === 'ios' ? PERMISSIONS.IOS.MICROPHONE : PERMISSIONS.ANDROID.RECORD_AUDIO
        );
        if (micPermission === RESULTS.DENIED) {
          const requestResult = await request(
            Platform.OS === 'ios' ? PERMISSIONS.IOS.MICROPHONE : PERMISSIONS.ANDROID.RECORD_AUDIO
          );
          if (requestResult === RESULTS.GRANTED) {
            setHasPermission(true);
            ToastAndroid.show('Microphone is ON.', ToastAndroid.LONG);
            setIsMicOn(true);
          } else {
            setHasPermission(false);
            Alert.alert('Permission Denied', 'Microphone access is required for voice verification.', [
              { text: 'Retry', onPress: () => requestPermission() },
              { text: 'Cancel', onPress: () => navigation.goBack() },
            ]);
          }
        } else if (micPermission === RESULTS.GRANTED) {
          setHasPermission(true);
          ToastAndroid.show('Microphone is ON.', ToastAndroid.LONG);
          setIsMicOn(true);
        } else {
          setHasPermission(false);
          Alert.alert('Permission Denied', 'Microphone access is required for voice verification.', [
            { text: 'Retry', onPress: () => requestPermission() },
            { text: 'Cancel', onPress: () => navigation.goBack() },
          ]);
        }
      } catch (error) {
        console.error('Permission error:', error);
        Alert.alert('Error', 'Failed to check microphone permission.');
      }
    };
    requestPermission();
  }, []);

  // Start recording
  const startRecording = async () => {
    if (!hasPermission) {
      Alert.alert('Error', 'Microphone permission is required.');
      return;
    }

    try {
      const path = `${RNFS.DocumentDirectoryPath}/voice_verification.wav`;
      console.log('Recording path:', path);
      await audioRecorderPlayer.startRecorder(path);
      
      // Start listener for duration
      audioRecorderPlayer.addRecordBackListener((e) => {
        recordTime.current = e.currentPosition;
        console.log('Listener duration:', recordTime.current);
        return;
      });

      // Start fallback timer
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current;
        console.log('Fallback timer duration:', elapsed);
      }, 100);

      setIsRecording(true);
      ToastAndroid.show('Recording started. Read the DEMO Text aloud.', ToastAndroid.LONG);
    } catch (error) {
      console.error('Recording error:', error);
      Alert.alert('Error', 'Failed to start recording.');
      setIsRecording(false);
    }
  };

  // Stop recording
  const stopRecording = async () => {
    try {
      const result = await audioRecorderPlayer.stopRecorder();
      audioRecorderPlayer.removeRecordBackListener();

      // Stop fallback timer and calculate duration
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      const fallbackDuration = Date.now() - startTimeRef.current;
      console.log('Final listener duration:', recordTime.current);
      console.log('Final fallback duration:', fallbackDuration);

      // Use the maximum of listener duration and fallback duration
      const finalDuration = Math.max(recordTime.current, fallbackDuration);

      setIsRecording(false);
      setAudioPath(result);

      if (finalDuration < 2000) { // Minimum 2 seconds
        setAudioPath(null);
        ToastAndroid.show('Recording too short. Please speak for at least 2 seconds.', ToastAndroid.LONG);
      } else {
        ToastAndroid.show('Recording stopped. Audio captured.', ToastAndroid.LONG);
      }

      recordTime.current = 0;
      startTimeRef.current = 0;
    } catch (error) {
      console.error('Stop recording error:', error);
      Alert.alert('Error', 'Failed to stop recording.');
      setIsRecording(false);
    }
  };

  // Handle capture button
  const handleCapture = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Handle submit
  const handleSubmit = () => {
    if (!audioPath) {
      Alert.alert('Error', 'Please capture your voice before submitting.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      navigation.navigate('ExamLogin', { exam });
    }, 1500); // Simulate processing time
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (isRecording) {
        stopRecording();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Icon name="person-outline" size={50} color="#007BFF" />
          <Icon name="mic" size={30} color="#007BFF" style={styles.micIcon} />
          <Icon name="graphic-eq" size={40} color="#00cc00" style={styles.soundWaveIcon} />
        </View>
        <Text style={styles.title}>Voice Verification</Text>
        <View style={styles.waveform}>
          <Icon name="show-chart" size={80} color="#007BFF" />
        </View>
      </View>
      <View style={styles.textBox}>
        <Text style={styles.textLabel}>DEMO Text</Text>
        <Text style={styles.demoText}>
          India, the land of diversity, is a vibrant country known for its rich cultural heritage, ancient traditions, and rapid modernization.
        </Text>
      </View>
      <Text style={styles.instruction}>
        Microphone must remain ON during the exam session.
      </Text>
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.actionButton} onPress={() => navigation.goBack()}>
          <Text style={styles.buttonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: isRecording ? '#ff4444' : '#007BFF' }]}
          onPress={handleCapture}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>{isRecording ? 'Stop' : 'Capture'}</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        style={[styles.submitButton, { opacity: audioPath ? 1 : 0.5 }]}
        onPress={handleSubmit}
        disabled={!audioPath || isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <Text style={styles.buttonText}>Submit</Text>
        )}
      </TouchableOpacity>
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
  iconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  micIcon: {
    marginLeft: 10,
  },
  soundWaveIcon: {
    marginLeft: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007BFF',
    marginBottom: 15,
  },
  waveform: {
    marginTop: 10,
  },
  textBox: {
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    width: '80%',
    alignItems: 'center',
  },
  textLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  demoText: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    lineHeight: 20,
  },
  instruction: {
    fontSize: 12,
    color: '#000000',
    marginBottom: 30,
    textAlign: 'center',
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
});

export default VoiceVerificationScreen;