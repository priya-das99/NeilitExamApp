import React from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

const TimerBar = ({ timeLeft, totalTime, timerAnimation }) => {
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  };

  return (
    <View style={styles.timerContainer}>
      <Animated.View style={{ opacity: timerAnimation }}>
        <LinearGradient
          colors={
            timeLeft <= 60
              ? ['#F44336', '#EF5350']
              : timeLeft <= 300
              ? ['#FFB300', '#FFCA28']
              : ['#4CAF50', '#A5D6A7']
          }
          style={styles.timerBackground}
        >
          <Text
            style={[styles.timer, timeLeft <= 60 && styles.timerWarning]}
            accessible={true}
            accessibilityLabel={`Time remaining: ${formatTime(timeLeft)}`}
          >
            {formatTime(timeLeft)}
          </Text>
        </LinearGradient>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  timerContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  timerBackground: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  timer: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
    fontFamily: 'Poppins-Medium',
  },
  timerWarning: {
    color: '#FFFFFF',
  },
});

export { TimerBar };