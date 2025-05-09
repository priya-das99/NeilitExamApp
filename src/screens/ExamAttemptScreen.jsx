import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { databases, appwriteConfig } from '../utils/appwriteConfig';
import { Query } from 'appwrite';
import Checkbox from '@react-native-community/checkbox';

const { width, height } = Dimensions.get('window');

const ExamAttemptScreen = ({ route, navigation }) => {
  const { examId, assignmentId } = route.params;
  const [loading, setLoading] = useState(true);
  const [examData, setExamData] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [markedQuestions, setMarkedQuestions] = useState(new Set());
  const [showInstructions, setShowInstructions] = useState(true);
  const [timer, setTimer] = useState(10);
  const [examStarted, setExamStarted] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [understood, setUnderstood] = useState(false);
  const [error, setError] = useState(null);

  // Fetch exam and questions data
  useEffect(() => {
    const fetchExamData = async () => {
      try {
        setLoading(true);
        setError(null);

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

        if (!examRes) {
          throw new Error('Exam not found');
        }

        // Validate exam data
        if (!examRes.title || !examRes.duration) {
          throw new Error('Invalid exam data');
        }

        setExamData(examRes);

        // Fetch questions
        const questionsRes = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.questionsCollectionId,
          [Query.equal('examId', examId)]
        );

        if (!questionsRes.documents || questionsRes.documents.length === 0) {
          throw new Error('No questions found for this exam');
        }

        const formattedQuestions = questionsRes.documents.map(q => {
          try {
            return {
              ...q,
              options: JSON.parse(q.options),
              correctAnswers: JSON.parse(q.correctAnswers)
            };
          } catch (parseError) {
            console.error('Error parsing question data:', parseError);
            throw new Error('Invalid question format');
          }
        });

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

  // Instructions timer
  useEffect(() => {
    let interval;
    if (showInstructions && timer > 0) {
      interval = setInterval(() => {
        setTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [showInstructions, timer]);

  // Auto-save answers
  useEffect(() => {
    if (examStarted) {
      const saveAnswers = async () => {
        try {
          await databases.updateDocument(
            appwriteConfig.databaseId,
            appwriteConfig.examAssignmentsCollectionId,
            assignmentId,
            {
              answers: JSON.stringify(answers),
              lastSaved: new Date().toISOString()
            }
          );
          setLastSaved(new Date());
        } catch (error) {
          console.error('Error saving answers:', error);
        }
      };

      const interval = setInterval(saveAnswers, 30000); // Auto-save every 30 seconds
      return () => clearInterval(interval);
    }
  }, [examStarted, answers, assignmentId]);

  const handleStartExam = () => {
    if (understood && timer === 0) {
      setShowInstructions(false);
      setExamStarted(true);
    }
  };

  const handleAnswer = (questionId, answer) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
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

  const handleSubmit = async () => {
    Alert.alert(
      'Submit Exam',
      'Are you sure you want to submit? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          style: 'destructive',
          onPress: async () => {
            try {
              await databases.updateDocument(
                appwriteConfig.databaseId,
                appwriteConfig.examAssignmentsCollectionId,
                assignmentId,
                {
                  status: 'completed',
                  answers: JSON.stringify(answers),
                  submittedAt: new Date().toISOString()
                }
              );
              navigation.navigate('StudentDashboard');
            } catch (error) {
              console.error('Error submitting exam:', error);
              Alert.alert('Error', 'Failed to submit exam. Please try again.');
            }
          }
        }
      ]
    );
  };

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

  if (showInstructions) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsTitle}>Exam Instructions</Text>
          <ScrollView style={styles.instructionsContent}>
            <Text style={styles.instructionText}>• Read each question carefully before answering</Text>
            <Text style={styles.instructionText}>• You can navigate between questions using Previous/Next buttons</Text>
            <Text style={styles.instructionText}>• Use "Mark for Review" to flag questions you want to revisit</Text>
            <Text style={styles.instructionText}>• Your answers are automatically saved every 30 seconds</Text>
            <Text style={styles.instructionText}>• You cannot leave the exam once started</Text>
            <Text style={styles.instructionText}>• Ensure stable internet connection throughout the exam</Text>
          </ScrollView>
          <View style={styles.timerContainer}>
            <Text style={styles.timerText}>
              Please wait {timer} seconds before starting
            </Text>
          </View>
          <View style={styles.checkboxContainer}>
            <Checkbox
              value={understood}
              onValueChange={setUnderstood}
              tintColors={{ true: '#1976d2', false: '#666' }}
            />
            <Text style={styles.checkboxLabel}>I understand and agree to the instructions</Text>
          </View>
          <TouchableOpacity
            style={[
              styles.startButton,
              (!understood || timer > 0) && styles.startButtonDisabled
            ]}
            onPress={handleStartExam}
            disabled={!understood || timer > 0}
          >
            <Text style={styles.startButtonText}>Start Exam</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = (Object.keys(answers).length / questions.length) * 100;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.examTitle}>{examData?.title}</Text>
        <Text style={styles.timerText}>
          Time Remaining: {examData?.duration} minutes
        </Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { width: `${progress}%` }]} />
        <Text style={styles.progressText}>{Math.round(progress)}% Complete</Text>
      </View>

      {/* Question Display */}
      <ScrollView style={styles.questionContainer}>
        <Text style={styles.questionNumber}>
          Question {currentQuestionIndex + 1} of {questions.length}
        </Text>
        <Text style={styles.questionText}>{currentQuestion?.questionText}</Text>
        
        {/* Options */}
        {currentQuestion?.options.map((option, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.optionButton,
              answers[currentQuestion.$id] === index && styles.selectedOption
            ]}
            onPress={() => handleAnswer(currentQuestion.$id, index)}
          >
            <Text style={styles.optionText}>
              {String.fromCharCode(65 + index)}. {option.text}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Navigation Buttons */}
      <View style={styles.navigationContainer}>
        <TouchableOpacity
          style={[styles.navButton, currentQuestionIndex === 0 && styles.navButtonDisabled]}
          onPress={() => handleNavigation('prev')}
          disabled={currentQuestionIndex === 0}
        >
          <Icon name="arrow-back" size={24} color="#fff" />
          <Text style={styles.navButtonText}>Previous</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.markButton}
          onPress={handleMarkForReview}
        >
          <Icon
            name={markedQuestions.has(currentQuestionIndex) ? 'bookmark' : 'bookmark-border'}
            size={24}
            color="#1976d2"
          />
          <Text style={styles.markButtonText}>
            {markedQuestions.has(currentQuestionIndex) ? 'Unmark' : 'Mark for Review'}
          </Text>
        </TouchableOpacity>

        {currentQuestionIndex === questions.length - 1 ? (
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
          >
            <Text style={styles.submitButtonText}>Submit Exam</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => handleNavigation('next')}
          >
            <Text style={styles.navButtonText}>Next</Text>
            <Icon name="arrow-forward" size={24} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {/* Question Status Panel */}
      <View style={styles.statusPanel}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {questions.map((_, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.questionNumber,
                answers[questions[index].$id] !== undefined && styles.answeredQuestion,
                markedQuestions.has(index) && styles.markedQuestion,
                currentQuestionIndex === index && styles.currentQuestion
              ]}
              onPress={() => setCurrentQuestionIndex(index)}
            >
              <Text style={styles.questionNumberText}>{index + 1}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Last Saved Indicator */}
      {lastSaved && (
        <Text style={styles.lastSavedText}>
          Last saved at {lastSaved.toLocaleTimeString()}
        </Text>
      )}
    </SafeAreaView>
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
  instructionsContainer: {
    flex: 1,
    padding: 20,
  },
  instructionsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 20,
    textAlign: 'center',
  },
  instructionsContent: {
    flex: 1,
  },
  instructionText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 10,
    lineHeight: 24,
  },
  timerContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  timerText: {
    fontSize: 18,
    color: '#666',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkboxLabel: {
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
  startButton: {
    backgroundColor: '#1976d2',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  startButtonDisabled: {
    backgroundColor: '#ccc',
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  header: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  examTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  progressContainer: {
    height: 4,
    backgroundColor: '#eee',
    position: 'relative',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#1976d2',
  },
  progressText: {
    position: 'absolute',
    right: 10,
    top: -20,
    fontSize: 12,
    color: '#666',
  },
  questionContainer: {
    flex: 1,
    padding: 20,
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
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  markButtonText: {
    color: '#1976d2',
    fontSize: 16,
    marginLeft: 5,
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
  statusPanel: {
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  questionNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
  },
  answeredQuestion: {
    backgroundColor: '#4caf50',
  },
  markedQuestion: {
    backgroundColor: '#ffc107',
  },
  currentQuestion: {
    borderWidth: 2,
    borderColor: '#1976d2',
  },
  questionNumberText: {
    color: '#333',
    fontSize: 16,
  },
  lastSavedText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 12,
    padding: 5,
  },
});

export default ExamAttemptScreen; 