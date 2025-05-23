import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions, Modal, Animated } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

const ProgressDrawer = ({ questions, currentQuestion, goToQuestion, questionsStatus, onClose, visible }) => {
  const { width } = Dimensions.get('window');
  const slideAnim = React.useRef(new Animated.Value(300)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.drawerContainer}>
        <Animated.View style={[styles.drawer, { transform: [{ translateY: slideAnim }] }]}>
          <LinearGradient
            colors={['#1E3A8A', '#3B82F6']}
            style={styles.drawerHeader}
          >
            <Text style={styles.drawerTitle}>Question Progress</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </LinearGradient>
          <Text style={styles.progressCounter}>
            {questionsStatus.filter((status) => status === 'answered').length}/{questions.length}
          </Text>
          <ScrollView contentContainerStyle={styles.questionGrid}>
            {questions.map((_, index) => {
              const status = questionsStatus[index];
              let boxStyle = styles.questionItem;
              if (status === 'answered') boxStyle = [boxStyle, styles.questionAnswered];
              else if (status === 'marked') boxStyle = [boxStyle, styles.questionMarked];
              else if (status === 'unanswered') boxStyle = [boxStyle, styles.questionUnanswered];
              return (
                <TouchableOpacity
                  key={index}
                  style={boxStyle}
                  onPress={() => goToQuestion(index)}
                  accessible={true}
                  accessibilityLabel={`Question ${index + 1}, status: ${status}`}
                >
                  <Text style={styles.questionItemText}>{index + 1}</Text>
                  {status === 'answered' && <View style={styles.statusIndicatorGreen} />}
                  {status === 'skipped' && <View style={styles.statusIndicatorYellow} />}
                  {status === 'flagged' && <View style={styles.statusIndicatorRed} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  drawerContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  drawer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    minHeight: Dimensions.get('window').height * 0.6,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    padding: 16,
    borderRadius: 10,
  },
  drawerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Poppins-SemiBold',
  },
  closeButton: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  progressCounter: {
    fontSize: 18,
    color: '#3B82F6',
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
    fontFamily: 'Poppins-Medium',
  },
  questionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingBottom: 20,
  },
  questionItem: {
    width: Dimensions.get('window').width * 0.25,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    margin: 8,
    borderRadius: 12,
    position: 'relative',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  questionItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    fontFamily: 'Poppins-Medium',
  },
  questionAnswered: {
    backgroundColor: '#E8F5E9',
    borderColor: '#43A047',
    borderWidth: 2,
  },
  questionSkipped: {
    backgroundColor: '#FFF9C4',
  },
  questionFlagged: {
    backgroundColor: '#FFEBEE',
  },
  questionCurrent: {
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  questionUnanswered: {
    backgroundColor: '#FFEBEE',
    borderColor: '#E53935',
    borderWidth: 2,
  },
  questionMarked: {
    backgroundColor: '#F3E5F5',
    borderColor: '#8e24aa',
    borderWidth: 2,
  },
  statusIndicatorGreen: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
  },
  statusIndicatorYellow: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFB300',
  },
  statusIndicatorRed: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#F44336',
  },
});

export { ProgressDrawer };