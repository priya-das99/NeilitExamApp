import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Alert, ScrollView, BackHandler } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const mockQuestions = [
  {
    id: 1,
    text: 'What is the capital of France?',
    options: ['Berlin', 'London', 'Paris', 'Madrid'],
    image: null,
  },
  {
    id: 2,
    text: 'Which planet is known as the Red Planet?',
    options: ['Earth', 'Mars', 'Jupiter', 'Saturn'],
    image: require('../../assets/images/exam-time.png'),
  },
  {
    id: 3,
    text: 'Who wrote "Romeo and Juliet"?',
    options: ['Charles Dickens', 'William Shakespeare', 'Jane Austen', 'Mark Twain'],
    image: null,
  },
];

const EXAM_DURATION = 60 * 5; // 5 minutes in seconds

const ExamAttemptScreen = ({ navigation }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timer, setTimer] = useState(EXAM_DURATION);
  const [showInstructions, setShowInstructions] = useState(true);
  const timerRef = useRef();

  // Prevent leaving during exam
  useEffect(() => {
    const backAction = () => {
      Alert.alert('Warning', 'Are you sure you want to leave? Your progress will be lost.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Leave', style: 'destructive', onPress: () => navigation.goBack() },
      ]);
      return true;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => subscription.remove();
  }, [navigation]);

  // Timer countdown
  useEffect(() => {
    if (!showInstructions && timer > 0) {
      timerRef.current = setTimeout(() => setTimer(timer - 1), 1000);
    }
    if (timer === 0) {
      handleSubmit();
    }
    return () => clearTimeout(timerRef.current);
  }, [timer, showInstructions]);

  // Auto-save answers (simulate)
  useEffect(() => {
    // Here you would auto-save to backend
  }, [answers]);

  const handleOptionSelect = (optionIdx) => {
    setAnswers({ ...answers, [currentQuestion]: optionIdx });
  };

  const handleNext = () => {
    if (currentQuestion < mockQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleSubmit = () => {
    Alert.alert(
      'Submit Exam',
      'Are you sure you want to submit your answers?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Submit', style: 'destructive', onPress: () => {
          // Here you would submit to backend
          navigation.reset({
            index: 0,
            routes: [{ name: 'StudentDashboard' }],
          });
          Alert.alert('Exam Submitted', 'Your answers have been submitted.');
        } },
      ]
    );
  };

  const renderInstructions = () => (
    <View style={styles.instructionsContainer}>
      <Text style={styles.instructionsTitle}>Exam Instructions</Text>
      <Text style={styles.instructionsText}>
        1. Read each question carefully.\n
        2. You have 5 minutes to complete the exam.\n
        3. Your answers will be auto-saved.\n
        4. Do not leave or refresh the app during the exam.\n
        5. Click "Start Exam" to begin.
      </Text>
      <TouchableOpacity style={styles.startExamButton} onPress={() => setShowInstructions(false)}>
        <Icon name="play-arrow" size={22} color="#fff" />
        <Text style={styles.startExamButtonText}>Start Exam</Text>
      </TouchableOpacity>
    </View>
  );

  const q = mockQuestions[currentQuestion];
  const progress = ((currentQuestion + 1) / mockQuestions.length) * 100;

  return (
    <View style={styles.container}>
      {showInstructions ? (
        renderInstructions()
      ) : (
        <>
          {/* Timer and Progress Bar */}
          <View style={styles.timerRow}>
            <Icon name="timer" size={22} color="#1976d2" />
            <Text style={styles.timerText}>{Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}</Text>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressText}>Q{currentQuestion + 1} of {mockQuestions.length}</Text>
          </View>

          {/* Question Card */}
          <View style={styles.questionCard}>
            <Text style={styles.questionText}>{q.text}</Text>
            {q.image && (
              <Image source={q.image} style={styles.questionImage} />
            )}
            <View style={styles.optionsList}>
              {q.options.map((opt, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.optionBtn, answers[currentQuestion] === idx && styles.selectedOption]}
                  onPress={() => handleOptionSelect(idx)}
                >
                  <Text style={styles.optionText}>{opt}</Text>
                  {answers[currentQuestion] === idx && <Icon name="check-circle" size={20} color="#1976d2" />}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Navigation Buttons */}
          <View style={styles.navRow}>
            <TouchableOpacity style={[styles.navBtn, currentQuestion === 0 && styles.disabledNavBtn]} onPress={handlePrev} disabled={currentQuestion === 0}>
              <Icon name="chevron-left" size={24} color={currentQuestion === 0 ? '#ccc' : '#1976d2'} />
              <Text style={[styles.navBtnText, currentQuestion === 0 && { color: '#ccc' }]}>Previous</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
              <Icon name="send" size={20} color="#fff" />
              <Text style={styles.submitBtnText}>Submit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.navBtn, currentQuestion === mockQuestions.length - 1 && styles.disabledNavBtn]} onPress={handleNext} disabled={currentQuestion === mockQuestions.length - 1}>
              <Text style={[styles.navBtnText, currentQuestion === mockQuestions.length - 1 && { color: '#ccc' }]}>Next</Text>
              <Icon name="chevron-right" size={24} color={currentQuestion === mockQuestions.length - 1 ? '#ccc' : '#1976d2'} />
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 18,
    justifyContent: 'center',
  },
  instructionsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  instructionsTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 12,
  },
  instructionsText: {
    fontSize: 16,
    color: '#444',
    marginBottom: 24,
    textAlign: 'left',
  },
  startExamButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1976d2',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 28,
  },
  startExamButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    justifyContent: 'space-between',
  },
  timerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976d2',
    marginLeft: 8,
    marginRight: 12,
  },
  progressBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginHorizontal: 10,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 8,
    backgroundColor: '#1976d2',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  questionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 22,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  questionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  questionImage: {
    width: '100%',
    height: 120,
    resizeMode: 'contain',
    marginBottom: 16,
    borderRadius: 8,
  },
  optionsList: {
    marginTop: 8,
  },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 10,
    justifyContent: 'space-between',
  },
  selectedOption: {
    backgroundColor: '#e3f2fd',
    borderWidth: 1,
    borderColor: '#1976d2',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: '#1976d2',
  },
  navBtnText: {
    color: '#1976d2',
    fontWeight: 'bold',
    fontSize: 15,
    marginHorizontal: 4,
  },
  disabledNavBtn: {
    opacity: 0.5,
    borderColor: '#ccc',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#43a047',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 22,
  },
  submitBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
    marginLeft: 6,
  },
});

export default ExamAttemptScreen; 