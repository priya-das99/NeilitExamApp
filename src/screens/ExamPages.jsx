import React, { useEffect, useRef, useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
  Animated,
  BackHandler,
  StatusBar,
  AppState,
  PanResponder,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { GestureHandlerRootView, PanGestureHandler } from 'react-native-gesture-handler';
import LinearGradient from 'react-native-linear-gradient';
import { Immersive } from 'react-native-immersive';

// Component Imports
import { QuestionCard } from '../../components/QuestionCard';
import OptionItem from '../../components/OptionItem'; // Fixed: Default import
import { TimerBar } from '../../components/TimerBar'; // Fixed: Named import
import { ProgressDrawer } from '../../components/ProgressDrawer';
import { ExamCamera } from '../../components/ExamCamera';
import CheatingWarningModal from '../../components/CheatingWarningModal';
import { useExamMonitoring } from '../../hooks/useExamMonitoring';
import { ExamProvider, useExam } from '../../contexts/ExamContext';

// Mock Questions Data
const mockQuestions = [
  {
    id: 1,
    type: 'MCQ',
    question: 'Which of the following best describes the Industrial Revolution?',
    options: [
      'A political movement to overthrow the monarchy.',
      'A period of rapid industrialization and technological advancements.',
      'A cultural renaissance focused on arts and literature.',
      'A religious revival that swept through Europe.',
    ],
    correctAnswer: 1,
    hasImage: false,
  },
  {
    id: 2,
    type: 'MCQ',
    question: 'What areas of society were most affected by the Industrial Revolution?',
    options: [
      'Education and healthcare.',
      'Politics and governance.',
      'Agriculture and manufacturing.',
      'Sports and recreation.',
    ],
    correctAnswer: 2,
    hasImage: false,
  },
  {
    id: 3,
    type: 'MSQ',
    question: 'Select all inventors who contributed to the Industrial Revolution:',
    options: ['James Watt', 'Thomas Edison', 'Leonardo da Vinci', 'Eli Whitney'],
    correctAnswer: [0, 1, 3],
    hasImage: false,
  },
  {
    id: 4,
    type: 'MCQ',
    question:
      'The quadratic formula states that for $ax^2 + bx + c = 0$, $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$. If $a=1$, $b=-3$, and $c=2$, what are the solutions?',
    options: [
      '$x = 1, x = 2$',
      '$x = 2, x = 1$',
      '$x = -1, x = -2$',
      '$x = -2, x = -1$',
    ],
    correctAnswer: 1,
    hasImage: false,
    isMath: true,
  },
  {
    id: 5,
    type: 'MCQ',
    question: 'What was the primary energy source that powered the early stages of the Industrial Revolution?',
    options: ['Nuclear power', 'Solar energy', 'Coal', 'Natural gas'],
    correctAnswer: 2,
    hasImage: false,
  },
];

const ExamPagesContent = () => {
  const navigation = useNavigation();
  const { examState, setExamState } = useExam();
  const { currentQuestion, answers, multiAnswers, timeLeft } = examState;

  // State setters using context
  const setCurrentQuestion = (index) => {
    setExamState((prev) => ({ ...prev, currentQuestion: index }));
  };
  const setAnswers = (newAnswers) => {
    setExamState((prev) => ({ ...prev, answers: newAnswers }));
  };
  const setMultiAnswers = (newMultiAnswers) => {
    setExamState((prev) => ({ ...prev, multiAnswers: newMultiAnswers }));
  };
  const setTimeLeft = (time) => {
    setExamState((prev) => ({ ...prev, timeLeft: time }));
  };

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [warningVisible, setWarningVisible] = useState(false);
  const [securityModalVisible, setSecurityModalVisible] = useState(false);
  const [cheatingWarningVisible, setCheatingWarningVisible] = useState(false);
  const [cheatingType, setCheatingType] = useState(null);
  const [appSwitchCount, setAppSwitchCount] = useState(0);
  const [cameraPosition, setCameraPosition] = useState({ x: 16, y: 60 });
  const [cameraSize] = useState({ width: 100, height: 150 });
  const appState = useRef(AppState.currentState);

  const translateX = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const timerAnimation = useRef(new Animated.Value(1)).current;
  const pan = useRef(new Animated.ValueXY({ x: 16, y: 60 })).current;
  const timerRef = useRef(null);

  const {
    isCameraActive,
    faceDetected,
    multipleFaces,
    noiseLevel,
    cheatingDetected,
    cameraRef,
    startMonitoring,
    handleFaceDetection,
    handleNoiseDetected,
    detectCheating,
  } = useExamMonitoring();

  // Format time in hh:mm:ss
  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // PanResponder for dragging the camera preview
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: Animated.event(
        [
          null,
          {
            dx: pan.x,
            dy: pan.y,
          },
        ],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (e, gestureState) => {
        const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
        let newX = pan.x._value + gestureState.dx;
        let newY = pan.y._value + gestureState.dy;

        // Snap to corners
        if (newX < screenWidth / 2) newX = 16;
        else newX = screenWidth - cameraSize.width - 16;
        if (newY < screenHeight / 2) newY = 60;
        else newY = screenHeight - cameraSize.height - 60;

        setCameraPosition({ x: newX, y: newY });
        Animated.spring(pan, {
          toValue: { x: newX, y: newY },
          useNativeDriver: false,
        }).start();
      },
    })
  ).current;

  // Initialize exam state
  useEffect(() => {
    const initialAnswers = Array(mockQuestions.length).fill(null);
    const initialMultiAnswers = Array(mockQuestions.length).fill([]);
    setAnswers(initialAnswers);
    setMultiAnswers(initialMultiAnswers);
    setTimeLeft(300); // 5 minutes for testing

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [setAnswers, setMultiAnswers, setTimeLeft]);

  // Enable immersive mode and lock orientation
  useEffect(() => {
    Immersive.on();
    StatusBar.setHidden(true);
    StatusBar.setBarStyle('light-content');

    return () => {
      Immersive.off();
      StatusBar.setHidden(false);
    };
  }, []);

  // Handle back press
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        Alert.alert(
          'Warning',
          'Leaving the exam will disqualify you. Are you sure you want to exit?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Exit',
              onPress: () => handleAutoSubmit(true),
              style: 'destructive',
            },
          ]
        );
        return true;
      };

      BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
    }, [])
  );

  // Detect app switching using AppState
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (appState.current.match(/active/) && nextAppState === 'background') {
        setSecurityModalVisible(true);
        setAppSwitchCount((prev) => {
          const newCount = prev + 1;
          if (newCount >= 2) {
            handleAutoSubmit(true);
          }
          return newCount;
        });
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, []);

  // Timer Logic (Fixed countdown with auto-submit)
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 0) {
          clearInterval(timerRef.current);
          handleAutoSubmit();
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [setTimeLeft]);

  // Timer Animation (Blink when time is low)
  useEffect(() => {
    if (timeLeft <= 30) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(timerAnimation, {
            toValue: 0.4,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(timerAnimation, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else if (timeLeft <= 60) {
      timerAnimation.setValue(1); // Orange color, no blinking
    } else {
      timerAnimation.setValue(1); // Green color
    }
  }, [timeLeft]);

  // Anti-Cheat Monitoring
  useEffect(() => {
    const initializeMonitoring = async () => {
      const success = await startMonitoring();
      if (!success) {
        navigation.replace('ExamLogin');
      }
    };

    initializeMonitoring();

    const cheatWatcher = setInterval(() => {
      const cheatType = detectCheating();
      if (cheatType) {
        setCheatingType(cheatType);
        setCheatingWarningVisible(true);
        if (cheatType === 'face_not_visible' || cheatType === 'multiple_faces') {
          handleCheatingDetected(cheatType);
        }
      }
    }, 10000);

    return () => clearInterval(cheatWatcher);
  }, [faceDetected, multipleFaces, detectCheating, navigation, startMonitoring]);

  const handleCheatingDetected = (type) => {
    if (type === 'face_not_visible' || type === 'multiple_faces') {
      Alert.alert(
        'Cheating Detected',
        'You have been disqualified due to suspicious activity.',
        [
          {
            text: 'OK',
            onPress: () => handleAutoSubmit(true),
          },
        ]
      );
    }
  };

  const handleOptionSelect = useCallback(
    (optionIndex) => {
      const questionType = mockQuestions[currentQuestion].type;
      if (questionType === 'MCQ') {
        setAnswers((prevAnswers) => {
          const newAnswers = [...prevAnswers];
          newAnswers[currentQuestion] = optionIndex;
          return newAnswers;
        });
      } else if (questionType === 'MSQ') {
        setMultiAnswers((prevMultiAnswers) => {
          const currentSelections = [...(prevMultiAnswers[currentQuestion] || [])];
          const newSelections = currentSelections.includes(optionIndex)
            ? currentSelections.filter((item) => item !== optionIndex)
            : [...currentSelections, optionIndex];
          const newMultiAnswers = [...prevMultiAnswers];
          newMultiAnswers[currentQuestion] = newSelections;
          return newMultiAnswers;
        });
      }
    },
    [currentQuestion, setAnswers, setMultiAnswers]
  );

  const isOptionSelected = useCallback(
    (optionIndex) => {
      const questionType = mockQuestions[currentQuestion].type;
      if (questionType === 'MCQ') {
        return answers[currentQuestion] === optionIndex;
      } else if (questionType === 'MSQ') {
        return (multiAnswers[currentQuestion] || []).includes(optionIndex);
      }
      return false;
    },
    [answers, multiAnswers, currentQuestion]
  );

  const isQuestionAnswered = useCallback(() => {
    const questionType = mockQuestions[currentQuestion].type;
    if (questionType === 'MCQ') {
      return answers[currentQuestion] !== null;
    } else if (questionType === 'MSQ') {
      return (multiAnswers[currentQuestion] || []).length > 0;
    }
    return false;
  }, [answers, multiAnswers, currentQuestion]);

  const goToNextQuestion = useCallback(() => {
    if (currentQuestion === mockQuestions.length - 1) {
      setWarningVisible(true);
    } else {
      Animated.timing(translateX, {
        toValue: -Dimensions.get('window').width,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setCurrentQuestion(currentQuestion + 1);
        translateX.setValue(Dimensions.get('window').width);
        Animated.timing(translateX, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });
    }
  }, [currentQuestion, setCurrentQuestion]);

  const goToPreviousQuestion = useCallback(() => {
    if (currentQuestion > 0) {
      Animated.timing(translateX, {
        toValue: Dimensions.get('window').width,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setCurrentQuestion(currentQuestion - 1);
        translateX.setValue(-Dimensions.get('window').width);
        Animated.timing(translateX, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });
    }
  }, [currentQuestion, setCurrentQuestion]);

  const goToFirstQuestion = useCallback(() => {
    setCurrentQuestion(0);
    setWarningVisible(false);
  }, [setCurrentQuestion]);

  const goToQuestion = useCallback(
    (index) => {
      setCurrentQuestion(index);
      setIsDrawerOpen(false);
    },
    [setCurrentQuestion]
  );

  const onSwipeGesture = useCallback(
    ({ nativeEvent }) => {
      if (nativeEvent.velocityX > 500 && currentQuestion > 0) {
        goToPreviousQuestion();
      } else if (nativeEvent.velocityX < -500 && currentQuestion < mockQuestions.length - 1) {
        goToNextQuestion();
      }
    },
    [currentQuestion, goToPreviousQuestion, goToNextQuestion]
  );

  const getQuestionStatus = useCallback(
    (index) => {
      const questionType = mockQuestions[index].type;
      if (questionType === 'MCQ' && answers[index] !== null) {
        return 'answered';
      } else if (questionType === 'MSQ' && multiAnswers[index]?.length > 0) {
        return 'answered';
      }
      return 'skipped';
    },
    [answers, multiAnswers]
  );

  const handleAutoSubmit = useCallback(
    (disqualified = false) => {
      setIsSubmitting(true);
      setTimeout(() => {
        setIsSubmitting(false);
        navigation.replace('Reviews', {
          disqualified,
          answers,
          multiAnswers,
          totalQuestions: mockQuestions.length,
          timeTaken: 300 - timeLeft,
        });
      }, 2000);
    },
    [navigation, answers, multiAnswers, timeLeft]
  );

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={['#1E3A8A', '#3B82F6']} style={styles.header}>
          <TouchableOpacity onPress={() => setIsDrawerOpen(true)} style={styles.menuButton}>
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>GATE 2025</Text>
            <Text style={styles.marking}>MCQ 2 x 3 | MSQ 1 x 2</Text>
            <View style={styles.timerContainer}>
              <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
              <TimerBar timeLeft={timeLeft} totalTime={300} timerAnimation={timerAnimation} />
            </View>
          </View>
        </LinearGradient>

        <View style={styles.progressBarContainer}>
          <LinearGradient
            colors={['#4CAF50', '#A5D6A7']}
            style={[
              styles.progressBar,
              { width: `${((currentQuestion + 1) / mockQuestions.length) * 100}%` },
            ]}
          />
        </View>

        <PanGestureHandler onGestureEvent={onSwipeGesture}>
          <Animated.View style={[styles.content, { transform: [{ translateX }], opacity: fadeAnim }]}>
            <ScrollView style={styles.scrollContent}>
              <QuestionCard
                question={mockQuestions[currentQuestion]}
                currentIndex={currentQuestion}
                totalQuestions={mockQuestions.length}
              />
              <View style={styles.optionsContainer}>
                {mockQuestions[currentQuestion].options.map((option, index) => (
                  <OptionItem
                    key={index}
                    option={option}
                    index={index}
                    isSelected={isOptionSelected(index)}
                    onSelect={() => handleOptionSelect(index)}
                    questionType={mockQuestions[currentQuestion].type}
                  />
                ))}
              </View>
            </ScrollView>
          </Animated.View>
        </PanGestureHandler>

        <View style={styles.navigationContainer}>
          <TouchableOpacity
            style={[styles.navButton, styles.prevButton, currentQuestion === 0 && styles.disabledButton]}
            onPress={goToPreviousQuestion}
            disabled={currentQuestion === 0}
          >
            <LinearGradient colors={['#E0E0E0', '#B0BEC5']} style={styles.buttonGradient}>
              <Text style={styles.navButtonText}>Previous</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navButton, styles.nextButton]}
            onPress={goToNextQuestion}
          >
            <LinearGradient colors={['#3B82F6', '#1E3A8A']} style={styles.buttonGradient}>
              <Text style={styles.navButtonText}>
                {currentQuestion === mockQuestions.length - 1 ? 'Finish' : isQuestionAnswered() ? 'Next' : 'Skip'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {isCameraActive && (
          <Animated.View
            style={[
              styles.cameraContainer,
              {
                transform: [{ translateX: pan.x }, { translateY: pan.y }],
                width: cameraSize.width,
                height: cameraSize.height,
              },
            ]}
            {...panResponder.panHandlers}
          >
            <ExamCamera onFaceDetection={handleFaceDetection} cameraRef={cameraRef} />
          </Animated.View>
        )}

        <Modal transparent={true} visible={isSubmitting} animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.loadingContent}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text style={styles.loadingText}>Auto submitting...</Text>
            </View>
          </View>
        </Modal>

        <ProgressDrawer
          questions={mockQuestions}
          currentQuestion={currentQuestion}
          goToQuestion={goToQuestion}
          questionsStatus={mockQuestions.map((_, index) => getQuestionStatus(index))}
          onClose={() => setIsDrawerOpen(false)}
          visible={isDrawerOpen}
        />

        <Modal
          transparent={true}
          visible={warningVisible}
          animationType="fade"
          onRequestClose={() => setWarningVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.warningModal}>
              <View style={styles.warningIconContainer}>
                <View style={styles.warningIcon}>
                  <Text style={styles.warningIconText}>!</Text>
                </View>
              </View>
              <Text style={styles.warningTitle}>Warning!</Text>
              <Text style={styles.warningText}>
                You cannot submit the exam; it will be automatically submitted when the time is complete.
              </Text>
              <TouchableOpacity style={styles.goToFirstButton} onPress={goToFirstQuestion}>
                <LinearGradient colors={['#3B82F6', '#1E3A8A']} style={styles.buttonGradient}>
                  <Text style={styles.goToFirstButtonText}>Go to First</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.previousButton}
                onPress={() => {
                  setWarningVisible(false);
                  goToPreviousQuestion();
                }}
              >
                <LinearGradient colors={['#3B82F6', '#1E3A8A']} style={styles.buttonGradient}>
                  <Text style={styles.previousButtonText}>Previous</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal
          transparent={true}
          visible={securityModalVisible}
          animationType="fade"
          onRequestClose={() => {}}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.warningModal}>
              <View style={styles.warningIconContainer}>
                <View style={styles.warningIcon}>
                  <Text style={styles.warningIconText}>!</Text>
                </View>
              </View>
              <Text style={styles.warningTitle}>Security Alert!</Text>
              <Text style={styles.warningText}>
                App switching or screen navigation is not allowed during the exam. Return to the exam to continue, or you will be disqualified.
              </Text>
              <TouchableOpacity
                style={styles.goToFirstButton}
                onPress={() => setSecurityModalVisible(false)}
              >
                <LinearGradient colors={['#3B82F6', '#1E3A8A']} style={styles.buttonGradient}>
                  <Text style={styles.goToFirstButtonText}>Return to Exam</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <CheatingWarningModal
          visible={cheatingWarningVisible}
          type={cheatingType}
          onClose={() => setCheatingWarningVisible(false)}
          onBlock={() => handleAutoSubmit(true)}
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

const ExamPages = () => {
  return (
    <ExamProvider>
      <ExamPagesContent />
    </ExamProvider>
  );
};

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  menuButton: {
    position: 'absolute',
    left: 16,
    top: 16,
  },
  menuIcon: {
    fontSize: 24,
    color: '#FFFFFF',
  },
  headerContent: {
    alignItems: 'center',
    marginTop: 8,
  },
  headerTitle: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: '700',
    fontFamily: 'Poppins-Bold',
  },
  marking: {
    fontSize: 14,
    color: '#D1D5DB',
    marginVertical: 4,
    fontFamily: 'Poppins-Regular',
  },
  timerContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
  },
  timerText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontFamily: 'Poppins-Medium',
    marginBottom: 4,
  },
  progressBarContainer: {
    height: 10,
    backgroundColor: '#E0E7FF',
    width: '100%',
    borderRadius: 5,
    marginVertical: 10,
  },
  progressBar: {
    height: 10,
    borderRadius: 5,
  },
  content: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  optionsContainer: {
    marginVertical: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E7FF',
    backgroundColor: '#FFFFFF',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  navButton: {
    borderRadius: 12,
    overflow: 'hidden',
    minWidth: width * 0.25,
    elevation: 5,
  },
  buttonGradient: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  prevButton: {
    backgroundColor: '#E0E0E0',
  },
  nextButton: {
    backgroundColor: '#2196F3',
  },
  disabledButton: {
    opacity: 0.5,
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Poppins-Medium',
  },
  cameraContainer: {
    position: 'absolute',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 8,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  warningModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 30,
    width: width * 0.85,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  warningIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  warningIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFC107',
    justifyContent: 'center',
    alignItems: 'center',
  },
  warningIconText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  warningTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#F44336',
    marginBottom: 16,
    fontFamily: 'Poppins-Bold',
  },
  warningText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#4B5563',
    marginBottom: 24,
    fontFamily: 'Poppins-Regular',
  },
  goToFirstButton: {
    borderRadius: 12,
    width: '100%',
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 5,
  },
  goToFirstButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Poppins-Medium',
    textAlign: 'center',
    paddingVertical: 16,
  },
  previousButton: {
    borderRadius: 12,
    width: '100%',
    overflow: 'hidden',
    elevation: 5,
  },
  previousButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Poppins-Medium',
    textAlign: 'center',
    paddingVertical: 16,
  },
  loadingContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    elevation: 10,
    minWidth: width * 0.6,
  },
  loadingText: {
    fontSize: 18,
    marginTop: 16,
    color: '#4B5563',
    fontFamily: 'Poppins-Medium',
  },
});

export default ExamPages;