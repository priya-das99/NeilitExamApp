import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Modal,
  Dimensions,
  Animated,
  BackHandler,
  StatusBar,
  AppState,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { databases, appwriteConfig } from '../utils/appwriteConfig';
import { Query } from 'appwrite';
import Checkbox from '@react-native-community/checkbox';
import { GestureHandlerRootView, PanGestureHandler } from 'react-native-gesture-handler';
import LinearGradient from 'react-native-linear-gradient';
import { Immersive } from 'react-native-immersive';
import { ProgressDrawer } from '../components/ProgressDrawer';
import { TimerBar } from '../components/TimerBar';
import { QuestionCard } from '../components/QuestionCard';
import OptionItem from '../components/OptionItem';
import { useAppwrite } from '../utils/AppwriteContext';

const { width, height } = Dimensions.get('window');

const ExamAttemptScreen = ({ route, navigation }) => {
  const { examId, assignmentId } = route.params;
  const [loading, setLoading] = useState(true);
  const [examData, setExamData] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [markedQuestions, setMarkedQuestions] = useState(new Set());
  const [examStarted, setExamStarted] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [error, setError] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [warningVisible, setWarningVisible] = useState(false);
  const [securityModalVisible, setSecurityModalVisible] = useState(false);
  const [subjectName, setSubjectName] = useState('');
  const appState = useRef(AppState.currentState);

  const translateX = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const timerAnimation = useRef(new Animated.Value(1)).current;
  const timerRef = useRef(null);

  // Calculate exam end time based on scheduled start time and duration
  const [timeLeft, setTimeLeft] = useState(0);
  const [examEndTime, setExamEndTime] = useState(null);

  const { user } = useAppwrite();
  const [studentId, setStudentId] = useState(user && user.studentId);

  // Fetch studentId from students collection if not present
  useEffect(() => {
    const fetchStudentId = async () => {
      if (!user || studentId) return;
      try {
        // Fetch student document by email
        const res = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.studentsCollectionId,
          [Query.equal('email', user.email)]
        );
        if (res.documents.length > 0) {
          setStudentId(res.documents[0].studentId);
        }
      } catch (err) {
        console.error('Error fetching studentId:', err);
      }
    };
    fetchStudentId();
  }, [user, studentId]);

  // Fetch exam and questions data
  useEffect(() => {
    const fetchExamData = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('Fetching exam data for ID:', examId);

        // Validate examId
        if (!examId) {
          throw new Error('Invalid exam ID');
        }

        // Fetch exam details
        const examRes = await databases.getDocument(
          appwriteConfig.databaseId,
          appwriteConfig.examsCollectionId,
          examId
        );

        console.log('Exam data received:', examRes);

        if (!examRes) {
          throw new Error('Exam not found');
        }

        // Validate exam data
        if (!examRes.title || !examRes.duration) {
          throw new Error('Invalid exam data');
        }

        setExamData(examRes);

        // Fetch subject name if not present
        if (examRes.subjectId) {
          try {
            const subjectRes = await databases.getDocument(
              appwriteConfig.databaseId,
              appwriteConfig.subjectsCollectionId,
              examRes.subjectId
            );
            setSubjectName(subjectRes.subjectName || '');
          } catch (err) {
            setSubjectName('');
          }
        }

        // Fetch exam_questions mapping
        const examQuestionsRes = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.examQuestionsCollectionId,
          [Query.equal('examId', examId), Query.orderAsc('order')]
        );

        console.log('Exam questions mapping:', examQuestionsRes.documents);

        const questionIds = examQuestionsRes.documents.map(eq => eq.questionId);

        if (questionIds.length === 0) {
          throw new Error('No questions found for this exam');
        }

        // Fetch all questions by questionId (custom field, not $id)
        const questionsRes = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.questionsCollectionId,
          [Query.equal('questionId', questionIds)]
        );

        console.log('Questions data received:', questionsRes.documents);

        const examQuestionsMap = {};
        examQuestionsRes.documents.forEach(eq => {
          examQuestionsMap[eq.questionId] = {
            order: eq.order,
            createdAt: eq.createdAt
          };
        });

        const formattedQuestions = questionsRes.documents.map(q => ({
          ...q,
          options: q.options ? JSON.parse(q.options) : [],
          correctAnswers: q.correctAnswers ? JSON.parse(q.correctAnswers) : [],
          order: examQuestionsMap[q.questionId]?.order || 0
        }));

        formattedQuestions.sort((a, b) => a.order - b.order);

        console.log('Formatted questions:', formattedQuestions);

        setQuestions(formattedQuestions);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching exam data:', error);
        setError(error.message || 'Failed to load exam. Please try again.');
        setLoading(false);
        
        // Show error alert and navigate back
        Alert.alert(
          'Error',
          error.message || 'Failed to load exam. Please try again.',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack()
            }
          ]
        );
      }
    };

    fetchExamData();
  }, [examId, navigation]);

  // Enable immersive mode and lock orientation
  useEffect(() => {
    try {
      // Set status bar
      StatusBar.setHidden(true);
      StatusBar.setBarStyle('light-content');

      // Try to enable immersive mode if available
      if (typeof Immersive !== 'undefined' && Immersive) {
        Immersive.on();
      }

      return () => {
        // Cleanup
        StatusBar.setHidden(false);
        if (typeof Immersive !== 'undefined' && Immersive) {
          Immersive.off();
        }
      };
    } catch (error) {
      console.log('Immersive mode not available:', error);
      // Continue without immersive mode
    }
  }, []);

  // Handle back press
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
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
    });
    return () => backHandler.remove();
  }, []);

  // Detect app switching
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (appState.current.match(/active/) && nextAppState === 'background') {
        setSecurityModalVisible(true);
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, []);

  // Update examStarted effect to start countdown
  useEffect(() => {
    if (examData?.startTime && examData?.duration) {
      const start = new Date(examData.startTime).getTime();
      const end = start + examData.duration * 60 * 1000;
      setExamEndTime(end);
      // If exam has started, calculate remaining time
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((end - now) / 1000));
      setTimeLeft(remaining);
      if (remaining > 0) {
        const interval = setInterval(() => {
          const now = Date.now();
          const left = Math.max(0, Math.floor((end - now) / 1000));
          setTimeLeft(left);
          if (left <= 0) {
            clearInterval(interval);
            handleAutoSubmit();
          }
        }, 1000);
        return () => clearInterval(interval);
      } else {
        // Exam is over
        setTimeLeft(0);
        handleAutoSubmit();
      }
    }
  }, [examData]);

  // Timer Animation
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
      timerAnimation.setValue(1);
    } else {
      timerAnimation.setValue(1);
    }
  }, [timeLeft]);

  const calculateScore = (question, answer) => {
    if (!answer) return 0;
    
    if (question.type === 'mcq') {
      // For MCQ: Full marks if correct, zero if wrong
      return question.correctAnswers.includes(answer) ? question.marks : 0;
    } else if (question.type === 'msq') {
      // For MSQ: Calculate based on correct options selected
      const studentAnswerArray = Array.isArray(answer) ? answer : [answer];
      const correctOptionsCount = question.correctAnswers.length;
      
      // Calculate marks per correct option
      const marksPerCorrectOption = question.marks / correctOptionsCount;
      
      // Count how many correct options the student selected
      const correctlySelectedCount = studentAnswerArray.filter(
        answer => question.correctAnswers.includes(answer)
      ).length;
      
      // Calculate marks for this question
      const questionScore = correctlySelectedCount * marksPerCorrectOption;
      
      // Round to 1 decimal place
      return Math.round(questionScore * 10) / 10;
    }
    return 0;
  };

  const handleAutoSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Calculate total score and track attempted questions
      let totalScore = 0;
      let attemptedQuestions = 0;
      let unattemptedQuestions = 0;

      questions.forEach(question => {
        const answer = answers[question.questionId];
        if (answer !== undefined && answer !== null && answer !== '') {
          attemptedQuestions++;
          const questionScore = calculateScore(question, answer);
          totalScore += questionScore;
        } else {
          unattemptedQuestions++;
        }
      });

      // Round the score to integer as per collection structure
      const finalScore = Math.round(totalScore);

      // Format answers to be more compact
      const formattedAnswers = Object.entries(answers).map(([questionId, answer]) => {
        // For MCQ, store just the selected option index
        // For MSQ, store array of selected option indices
        return `${questionId}:${Array.isArray(answer) ? answer.join(',') : answer}`;
      }).join(';');

      // Prepare data according to exam_assignments collection structure
      const resultData = {
        assignmentId,
        examId,
        studentId,
        status: 'completed',
        score: finalScore,
        submittedAt: new Date().toISOString(),
        courseId: examData.courseId,
        answers: formattedAnswers,
        submitted: true
      };

      // Check if assignment document exists
      let assignmentDoc;
      try {
        assignmentDoc = await databases.getDocument(
          appwriteConfig.databaseId,
          appwriteConfig.examAssignmentsCollectionId,
          assignmentId
        );
      } catch (err) {
        assignmentDoc = null;
      }

      if (assignmentDoc) {
        // Update if exists
        await databases.updateDocument(
          appwriteConfig.databaseId,
          appwriteConfig.examAssignmentsCollectionId,
          assignmentId,
          resultData
        );
      } else {
        // Create if not exists
        await databases.createDocument(
          appwriteConfig.databaseId,
          appwriteConfig.examAssignmentsCollectionId,
          assignmentId,
          resultData
        );
      }

      navigation.replace('StudentStack');
    } catch (error) {
      console.error('Error submitting exam:', error);
      Alert.alert('Error', 'Failed to submit exam. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = () => {
    if (markedQuestions.size > 0) {
      Alert.alert(
        'Review Marked Questions',
        'You have questions marked for review. Would you like to review them before submitting?',
        [
          { text: 'Review Now', onPress: () => setCurrentQuestionIndex([...markedQuestions][0]) },
          { text: 'Submit Anyway', style: 'destructive', onPress: () => handleAutoSubmit(false) },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    } else {
      Alert.alert(
        'Submit Exam',
        'Are you sure you want to submit? This action cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Submit', style: 'destructive', onPress: () => handleAutoSubmit(false) },
        ]
      );
    }
  };

  const handleStartExam = () => {
    setExamStarted(true);
  };

  const handleAnswer = (questionId, answerIndex, questionType) => {
    setAnswers(prev => {
      let newAnswers = { ...prev };
      if (questionType === 'mcq') {
        if (prev[questionId] === answerIndex) {
          delete newAnswers[questionId];
        } else {
          newAnswers[questionId] = answerIndex;
        }
      } else if (questionType === 'msq') {
        const prevSelections = Array.isArray(prev[questionId]) ? prev[questionId] : [];
        let updatedSelections;
        if (prevSelections.includes(answerIndex)) {
          updatedSelections = prevSelections.filter(i => i !== answerIndex);
        } else {
          updatedSelections = [...prevSelections, answerIndex];
        }
        if (updatedSelections.length === 0) {
          delete newAnswers[questionId];
        } else {
          newAnswers[questionId] = updatedSelections;
        }
      }
      console.log('handleAnswer called:', { questionId, answerIndex, questionType, newAnswers });
      return newAnswers;
    });
  };

  const handleMarkForReview = () => {
    setMarkedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(currentQuestionIndex)) {
        newSet.delete(currentQuestionIndex);
      } else {
        newSet.add(currentQuestionIndex);
      }
      return newSet;
    });
  };

  const handleNavigation = (direction) => {
    if (direction === 'prev' && currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    } else if (direction === 'next' && currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  // Add formatTime function if missing
  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Add getQuestionStatus function if missing
  const getQuestionStatus = (index) => {
    if (answers[questions[index]?.$id] !== undefined) {
      return 'answered';
    }
    if (markedQuestions.has(index)) {
      return 'marked';
    }
    return 'unanswered';
  };

  // Add onSwipeGesture function if missing
  const onSwipeGesture = useCallback(
    ({ nativeEvent }) => {
      if (nativeEvent.velocityX > 500 && currentQuestionIndex > 0) {
        handleNavigation('prev');
      } else if (nativeEvent.velocityX < -500 && currentQuestionIndex < questions.length - 1) {
        handleNavigation('next');
      }
    },
    [currentQuestionIndex, questions.length]
  );

  // Build questionsStatus array for ProgressDrawer
  const questionsStatus = questions.map((q, idx) => {
    if (markedQuestions.has(idx)) return 'marked';
    if (answers[q.questionId] !== undefined) return 'answered';
    return 'unanswered';
  });

  // Calculate MCQ/MSQ counts and total marks
  const mcqCount = questions.filter(q => q.type === 'mcq').length;
  const msqCount = questions.filter(q => q.type === 'msq').length;
  const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 0), 0);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1976d2" />
        <Text style={styles.loadingText}>Loading exam...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="error-outline" size={48} color="#f44336" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Add debug logs before rendering
  console.log('Questions:', questions);
  const currentQuestion = questions[currentQuestionIndex];
  console.log('Current Question:', currentQuestion);

  const progress = (Object.keys(answers).length / questions.length) * 100;

  if (!currentQuestion) return <Text>No question to display</Text>;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#F5F7FA' }}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F7FA' }}>
        {/* Organized Header */}
        <View style={{ backgroundColor: '#1E3A8A', paddingTop: 36, paddingBottom: 28, paddingHorizontal: 16, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, elevation: 8, zIndex: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
            <TouchableOpacity onPress={() => setIsDrawerOpen(true)} style={{ position: 'absolute', left: 0, padding: 12, zIndex: 20, minWidth: 48, minHeight: 48, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 28 }}>☰</Text>
            </TouchableOpacity>
            <Text style={{ color: '#fff', fontSize: 22, fontWeight: 'bold', textAlign: 'center', flex: 1 }}>{examData?.title || 'Exam'}</Text>
          </View>
          <View style={{ alignItems: 'center', marginBottom: 10 }}>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold', letterSpacing: 0.5, textAlign: 'center' }}>{subjectName || 'Subject'}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
            <View>
            <Text style={{ color: '#fff', fontSize: 14 }}>
                MCQ: {mcqCount} | MSQ: {msqCount} | Total Marks: {totalMarks}
            </Text>
            </View>
            <View style={{ marginLeft: 8 }}>
              <TimerBar
                timeLeft={timeLeft}
                totalTime={examData?.duration ? examData.duration * 60 : 0}
                timerAnimation={timerAnimation}
              />
            </View>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressBarContainer}>
          <LinearGradient
            colors={['#4CAF50', '#A5D6A7']}
            style={[
              styles.progressBar,
              { width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` },
            ]}
          />
        </View>

        {/* Scrollable Question/Options Area */}
        <View style={{ flex: 1 }}>
          <ScrollView style={styles.scrollContent} contentContainerStyle={{ paddingBottom: 120 }}>
            <QuestionCard
              question={currentQuestion}
              currentIndex={currentQuestionIndex}
              totalQuestions={questions.length}
            />
            <View style={styles.optionsContainer}>
              {currentQuestion?.options.map((option) => {
                // Use optionId for selection and as key, text for display
                const optionValue = option.optionId;
                const optionText = option.text;

                const isSelected =
                  currentQuestion.type === 'msq'
                    ? Array.isArray(answers[currentQuestion.questionId]) && answers[currentQuestion.questionId].includes(optionValue)
                    : answers[currentQuestion.questionId] === optionValue;

                const handleSingleSelect = (selectedValue) => {
                  setAnswers(prev => {
                    const newAnswers = { ...prev };
                    if (selectedValue === null) {
                      delete newAnswers[currentQuestion.questionId];
                    } else {
                      newAnswers[currentQuestion.questionId] = selectedValue;
                    }
                    return newAnswers;
                  });
                };

                const handleMultiSelect = (selectedValue) => {
                  setAnswers(prev => {
                    const prevSelections = Array.isArray(prev[currentQuestion.questionId]) ? prev[currentQuestion.questionId] : [];
                    let updatedSelections;
                    if (prevSelections.includes(selectedValue)) {
                      updatedSelections = prevSelections.filter(v => v !== selectedValue);
                    } else {
                      updatedSelections = [...prevSelections, selectedValue];
                    }
                    const newAnswers = { ...prev };
                    if (updatedSelections.length === 0) {
                      delete newAnswers[currentQuestion.questionId];
                    } else {
                      newAnswers[currentQuestion.questionId] = updatedSelections;
                    }
                    return newAnswers;
                  });
                };

                return (
                  <OptionItem
                    key={optionValue}
                    option={optionText}
                    value={optionValue}
                    isSelected={isSelected}
                    questionType={currentQuestion.type}
                    onSingleSelect={handleSingleSelect}
                    onSelect={handleMultiSelect}
                  />
                );
              })}
            </View>
            <View style={{ alignItems: 'flex-end', marginTop: -24, marginBottom: 16, marginRight: 8 }}>
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'transparent' }}
                onPress={handleMarkForReview}
              >
                <Icon
                  name={markedQuestions.has(currentQuestionIndex) ? 'bookmark' : 'bookmark-border'}
                  size={22}
                  color="#8e24aa"
                  style={{ marginRight: 4 }}
                />
                <Text style={{ color: '#8e24aa', fontWeight: 'bold' }}>
                  {markedQuestions.has(currentQuestionIndex) ? 'Unmark' : 'Mark for Review'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>

        {/* Navigation Bar with gradient/shadow buttons, icon for mark for review, and marginBottom */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingBottom: 64, paddingTop: 8 }}>
          {/* Previous Button */}
          <TouchableOpacity
            style={[styles.flexButton, currentQuestionIndex === 0 && styles.navButtonDisabled]}
            onPress={() => handleNavigation('prev')}
            disabled={currentQuestionIndex === 0}
            activeOpacity={1}
          >
            <LinearGradient
              colors={currentQuestionIndex === 0 ? ['#E0E0E0', '#B0BEC5'] : ['#3B82F6', '#1E3A8A']}
              style={styles.gradientButton}
            >
              <Text style={[styles.gradientButtonText, currentQuestionIndex === 0 && { color: '#222' }]}>Previous</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Next or Submit Button */}
          {currentQuestionIndex === questions.length - 1 ? (
            <TouchableOpacity
              style={styles.flexButton}
              onPress={handleSubmit}
              activeOpacity={1}
            >
              <LinearGradient colors={['#4CAF50', '#2E7D32']} style={styles.gradientButton}>
                <Text style={styles.gradientButtonText}>Submit</Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.flexButton}
              onPress={() => handleNavigation('next')}
              activeOpacity={1}
            >
              <LinearGradient colors={['#3B82F6', '#1E3A8A']} style={styles.gradientButton}>
                <Text style={styles.gradientButtonText}>Next</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>

        <Modal transparent={true} visible={isSubmitting} animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.loadingContent}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text style={styles.loadingText}>Auto submitting...</Text>
            </View>
          </View>
        </Modal>

        <ProgressDrawer
          questions={questions}
          currentQuestion={currentQuestionIndex}
          goToQuestion={setCurrentQuestionIndex}
          questionsStatus={questionsStatus}
          onClose={() => setIsDrawerOpen(false)}
          visible={isDrawerOpen}
        />

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
                <Text style={styles.goToFirstButtonText}>Return to Exam</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  errorText: {
    marginTop: 10,
    fontSize: 16,
    color: '#f44336',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#1976d2',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  header: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  marking: {
    fontSize: 14,
    color: '#fff',
  },
  menuButton: {
    padding: 10,
  },
  menuIcon: {
    fontSize: 24,
    color: '#fff',
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: '#eee',
    position: 'relative',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#1976d2',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  scrollContent: {
    flex: 1,
  },
  questionNumber: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  questionText: {
    fontSize: 18,
    color: '#333',
    marginBottom: 20,
    lineHeight: 24,
  },
  optionButton: {
    padding: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 10,
  },
  selectedOption: {
    backgroundColor: '#e3f2fd',
    borderColor: '#1976d2',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1976d2',
    padding: 10,
    borderRadius: 6,
  },
  navButtonDisabled: {
    backgroundColor: '#ccc',
  },
  navButtonText: {
    color: '#fff',
    fontSize: 16,
    marginHorizontal: 5,
  },
  markButton: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderColor: 'transparent',
    borderRadius: 0,
    paddingVertical: 0,
    marginHorizontal: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markButtonText: {
    color: '#1976d2',
    fontWeight: 'bold',
    fontSize: 15,
  },
  submitButton: {
    backgroundColor: '#4caf50',
    padding: 10,
    borderRadius: 6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  loadingContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  warningModal: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  warningIconContainer: {
    backgroundColor: '#ffd740',
    borderRadius: 20,
    padding: 5,
    marginBottom: 10,
  },
  warningIcon: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
  },
  warningIconText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffd740',
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  warningText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  goToFirstButton: {
    backgroundColor: '#1976d2',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  goToFirstButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 6,
  },
  timerContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  timerText: {
    fontSize: 18,
    color: '#666',
  },
  optionsContainer: {
    marginTop: 20,
  },
  flexButton: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
    marginHorizontal: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradientButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 4,
  },
  gradientButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  markButton: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderColor: 'transparent',
    borderRadius: 0,
    paddingVertical: 0,
    marginHorizontal: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markButtonText: {
    color: '#1976d2',
    fontWeight: 'bold',
    fontSize: 15,
  },
});

export default ExamAttemptScreen; 