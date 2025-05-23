// MicrophoneMonitor.js component implementation
import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import AudioRecord from 'react-native-audio-record';

export const MicrophoneMonitor = ({ onNoiseDetected }) => {
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    const options = {
      sampleRate: 16000,
      channels: 1,
      bitsPerSample: 16,
      audioSource: 6, // MIC source
      wavFile: 'temp_audio.wav'
    };

    // Initialize audio recording
    AudioRecord.init(options);

    // Start monitoring
    startMonitoring();

    return () => {
      if (isRecording) {
        AudioRecord.stop();
      }
    };
  }, []);

  const startMonitoring = async () => {
    try {
      // Start audio recording
      AudioRecord.start();
      setIsRecording(true);

      // Set up periodic noise level detection
      const intervalId = setInterval(() => {
        // Get audio buffer and analyze volume
        AudioRecord.on('data', (data) => {
          // Convert the audio buffer to volume level (0-1)
          const volume = calculateVolumeFromBuffer(data);
          
          // Notify the parent component about the noise level
          if (onNoiseDetected) {
            onNoiseDetected(volume);
          }
        });
      }, 1000); // Check every second

      return () => {
        clearInterval(intervalId);
        if (isRecording) {
          AudioRecord.stop();
          setIsRecording(false);
        }
      };
    } catch (error) {
      console.error('Failed to start audio monitoring:', error);
    }
  };

  // Helper function to calculate average volume from audio buffer
  const calculateVolumeFromBuffer = (buffer) => {
    // This is a simplified version - in a real app, you'd process the audio buffer
    // to calculate actual volume levels
    
    // Convert buffer to Int16Array to process the PCM data
    const view = new Int16Array(buffer.buffer);
    
    // Calculate RMS (root mean square) as a measure of volume
    let sum = 0;
    for (let i = 0; i < view.length; i++) {
      sum += Math.abs(view[i]);
    }
    
    const averageAmplitude = sum / view.length;
    
    // Normalize to 0-1 range (assuming 16-bit audio = max value of 32767)
    const normalizedVolume = Math.min(averageAmplitude / 32767, 1);
    
    return normalizedVolume;
  };

  // Render nothing visible - this is a background monitoring component
  return <View style={styles.hidden} />;
};

const styles = StyleSheet.create({
  hidden: {
    width: 0,
    height: 0,
    opacity: 0,
    position: 'absolute',
  },
});