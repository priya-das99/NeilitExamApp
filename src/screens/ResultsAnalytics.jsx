import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  StatusBar,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AdminSidebar from '../components/AdminSidebar';
import DateTimePicker from '@react-native-community/datetimepicker';
import { databases, appwriteConfig } from '../utils/appwriteConfig';
import { Query } from 'appwrite';
import { useNavigation } from '@react-navigation/native';

// Utility function for calculating exam results
const calculateExamScore = (score = 0, totalMarks = 0) => {
  const percentage = totalMarks ? Math.round((score / totalMarks) * 100) : 0;
  return {
    score,
    percentage,
    status: percentage >= 30 ? 'PASS' : 'FAIL'
  };
};

const ResultsAnalytics = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingExams, setPendingExams] = useState([]);
  const [generatedResults, setGeneratedResults] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showStudentList, setShowStudentList] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [releaseDate, setReleaseDate] = useState(new Date());
  const [examDetails, setExamDetails] = useState(null);
  const [studentAnswers, setStudentAnswers] = useState([]);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showExamReview, setShowExamReview] = useState(false);
  const [lastFetchTimestamp, setLastFetchTimestamp] = useState(null);
  const [cachedPendingExams, setCachedPendingExams] = useState([]);
  const [cachedGeneratedResults, setCachedGeneratedResults] = useState([]);
  const [modalStats, setModalStats] = useState({
    correctAnswers: 0,
    wrongAnswers: 0,
    score: 0,
    percentage: 0,
    status: 'FAIL',
  });
  const navigation = useNavigation();
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

  const isCacheValid = () => {
    if (!lastFetchTimestamp) return false;
    const now = new Date().getTime();
    return (now - lastFetchTimestamp) < CACHE_DURATION;
  };

  // Fetch pending exams with caching
  const fetchPendingExams = async (forceRefresh = false) => {
    try {
      // Return cached data if valid and not forcing refresh
      if (!forceRefresh && isCacheValid() && cachedPendingExams.length > 0) {
        console.log('Using cached pending exams data');
        setPendingExams(cachedPendingExams);
        setLoading(false);
        return;
      }

      setLoading(true);
      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.examAssignmentsCollectionId,
        [Query.equal('status', 'completed')]
      );
      
      const groupedExams = {};
      
      for (const exam of response.documents) {
        if (!groupedExams[exam.examId]) {
          groupedExams[exam.examId] = {
            students: []
          };
        }
        groupedExams[exam.examId].students.push(exam);
      }

      for (const examId in groupedExams) {
        try {
          const examDoc = await databases.getDocument(
            appwriteConfig.databaseId,
            appwriteConfig.examsCollectionId,
            examId
          );

          let subjectName = 'Unknown Subject';
          if (examDoc.subjectId) {
            try {
              const subjectDoc = await databases.getDocument(
                appwriteConfig.databaseId,
                appwriteConfig.subjectsCollectionId,
                examDoc.subjectId
              );
              subjectName = subjectDoc.subjectName || subjectDoc.title || subjectDoc.name || 'Unknown Subject';
            } catch (subjectErr) {
              console.log(`Subject not found for ID ${examDoc.subjectId} - using default name`);
              subjectName = 'Subject Not Found';
            }
          }

          groupedExams[examId] = {
            examId: examId,
            title: examDoc.title || 'Untitled Exam',
            subjectId: examDoc.subjectId,
            subjectName,
            duration: examDoc.duration || 0,
            totalMarks: examDoc.totalMarks || 0,
            date: examDoc.date || new Date().toISOString(),
            students: groupedExams[examId].students
          };
        } catch (error) {
          console.log(`Error fetching exam details for ${examId}`);
        }
      }
      
      const examsArray = Object.values(groupedExams);
      setCachedPendingExams(examsArray);
      setLastFetchTimestamp(new Date().getTime());
      setPendingExams(examsArray);
    } catch (error) {
      console.error('Error fetching pending exams:', error);
      Alert.alert('Error', 'Failed to fetch pending exams');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchPendingExams(true).finally(() => {
      setRefreshing(false);
    });
  }, []);

  useEffect(() => {
    // On initial load, check cache first
    if (cachedPendingExams.length > 0 && isCacheValid()) {
      setPendingExams(cachedPendingExams);
      setLoading(false);
    } else {
      fetchPendingExams();
    }
  }, []);

  // Fetch generated results
  const fetchGeneratedResults = async () => {
    try {
      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        'results',
        [Query.orderDesc('createdAt')]
      );
      
      // Group results by examId
      const groupedResults = response.documents.reduce((acc, result) => {
        if (!acc[result.examId]) {
          acc[result.examId] = {
            examId: result.examId,
            title: result.examDetails?.title,
            subject: result.examDetails?.subject,
            date: result.examDetails?.date,
            results: []
          };
        }
        acc[result.examId].results.push(result);
        return acc;
      }, {});
      
      setGeneratedResults(Object.values(groupedResults));
    } catch (error) {
      console.error('Error fetching results:', error);
      Alert.alert('Error', 'Failed to fetch generated results');
    }
  };

  // Calculate exam results
  const calculateResults = async (exam) => {
    try {
      console.log('Calculating results for exam:', exam.assignmentId);
      return calculateExamScore(exam.score, exam.totalMarks);
    } catch (error) {
      console.error('Error calculating results:', error);
      return calculateExamScore(0, 0); // Return default values in case of error
    }
  };

  // Batch process results generation
  const generateResultsForAll = async (exam) => {
    try {
      console.log('Starting results generation for exam:', exam.examId);
      setLoading(true);

      // Fetch assignments from exam_assignment collection
      const assignmentQuery = await databases.listDocuments(
        appwriteConfig.databaseId,
        '680d1e10001b5a3229dc', // exam_assignment collection
        [
          Query.equal('examId', exam.examId),
          Query.equal('status', 'completed')
        ]
      );

      if (!assignmentQuery.documents.length) {
        Alert.alert('No Data', 'No completed assignments found for this exam');
        setLoading(false);
        return;
      }

      let processedCount = 0;
      let failedCount = 0;

      for (const assignment of assignmentQuery.documents) {
        try {
          // Validate that we have an assignmentId
          if (!assignment.$id) {
            console.error('Missing assignmentId for assignment:', assignment);
            continue;
          }

          // Calculate result using the score from assignment
          const { score, percentage, status } = calculateExamScore(
            assignment.score || 0,
            exam.totalMarks || 0
          );

          // Create result with explicit assignmentId field
          const resultData = {
            resultId: `RES_${Date.now()}_${assignment.studentId}`,
            examId: exam.examId,
            studentId: assignment.studentId,
            courseId: assignment.courseId,
            subjectId: exam.subjectId,
            assignmentId: assignment.$id,
            totalQuestions: parseInt(assignment.totalQuestions || 0),
            score,
            percentage,
            status: status.toLowerCase(),
            timeTaken: parseInt(assignment.timeTaken || 0),
            startTime: assignment.startTime,
            endTime: assignment.endTime,
            answers: assignment.answers,
            submittedAt: assignment.submittedAt,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          // Create result document
          const createdResult = await databases.createDocument(
            appwriteConfig.databaseId,
            'results',
            resultData
          );

          // Update assignment status
          await databases.updateDocument(
            appwriteConfig.databaseId,
            '680d1e10001b5a3229dc',
            assignment.$id,
            { status: 'result_generated' }
          );

          processedCount++;
        } catch (error) {
          console.error('Error processing assignment:', {
            assignmentId: assignment.$id,
            error: error.message,
            stack: error.stack
          });
          failedCount++;
        }
      }

      setLoading(false);

      if (failedCount > 0) {
        Alert.alert(
          'Partial Success',
          `Generated ${processedCount} results. Failed to generate ${failedCount} results.`
        );
      } else {
        Alert.alert('Success', `Successfully generated all ${processedCount} results`);
      }

      setShowGenerateModal(false);
      fetchPendingExams(true);
    } catch (error) {
      console.error('Error in batch processing:', error);
      setLoading(false);
      Alert.alert('Error', 'Failed to process results. Please try again.');
    }
  };

  // Release results for all students in an exam
  const releaseResultsForAll = async (exam) => {
    try {
      for (const result of exam.results) {
        await databases.updateDocument(
          appwriteConfig.databaseId,
          'results',
          result.resultId,
          { status: 'released' }
        );
      }
      Alert.alert('Success', 'Results released for all students');
      fetchGeneratedResults();
    } catch (error) {
      console.error('Error releasing results:', error);
      Alert.alert('Error', 'Failed to release results');
    }
  };

  useEffect(() => {
    fetchGeneratedResults();
  }, []);

  useEffect(() => {
    if (showStudentModal && selectedStudent) {
      // Calculate results using our consistent calculation method
      calculateResults(selectedStudent).then(results => {
        setModalStats({
          correctAnswers: results.correctAnswers,
          wrongAnswers: results.wrongAnswers,
          score: results.score,
          percentage: results.percentage,
          status: results.status
        });
      }).catch(error => {
        console.error('Error calculating student performance:', error);
        setModalStats({
          correctAnswers: 0,
          wrongAnswers: 0,
          score: 0,
          percentage: 0,
          status: 'FAIL'
        });
      });
    }
  }, [showStudentModal, selectedStudent]);

  const renderPendingExamItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.examCard}
      onPress={() => {
        navigation.navigate('ExamReviewScreen', { exam: item });
      }}
    >
      <View style={styles.examHeader}>
        <View style={styles.examInfo}>
          <Text style={styles.examTitle}>{item.title}</Text>
          <Text style={styles.examSubject}>Subject: {item.subjectName}</Text>
          <Text style={styles.examDate}>
            Date: {new Date(item.date).toLocaleDateString()}
          </Text>
        </View>
        <Icon name="chevron-right" size={24} color="#666" />
      </View>
    </TouchableOpacity>
  );

  const renderExamReview = () => (
    <View style={styles.examReviewContainer}>
      <View style={styles.examDetailsSection}>
        <Text style={styles.sectionTitle}>Exam Details</Text>
        <View style={styles.detailsCard}>
          <Text style={styles.detailText}>Title: {selectedExam?.title}</Text>
          <Text style={styles.detailText}>Subject: {selectedExam?.subjectName}</Text>
          <Text style={styles.detailText}>Duration: {selectedExam?.duration} minutes</Text>
          <Text style={styles.detailText}>Total Marks: {selectedExam?.totalMarks}</Text>
          <Text style={styles.detailText}>
            Date: {new Date(selectedExam?.date).toLocaleDateString()}
          </Text>
        </View>
      </View>

      <View style={styles.studentsSection}>
        <Text style={styles.sectionTitle}>Assigned Students</Text>
        <FlatList
          data={selectedExam?.students}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.studentCard}
              onPress={() => {
                setSelectedStudent(item);
                setShowStudentModal(true);
              }}
            >
              <Text style={styles.studentName}>Student ID: {item.studentId}</Text>
              <Icon name="chevron-right" size={20} color="#666" />
            </TouchableOpacity>
          )}
          keyExtractor={item => item.$id}
        />
      </View>
    </View>
  );

  const renderStudentModal = () => {
    const attemptedQuestions = selectedStudent?.answers ? 
      selectedStudent.answers.split(';').filter(a => a.trim() !== '').length : 0;
    const totalQuestions = selectedStudent?.totalQuestions || 0;
    const unattemptedQuestions = totalQuestions - attemptedQuestions;

    return (
      <Modal
        visible={showStudentModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowStudentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Student Performance</Text>
              <TouchableOpacity
                onPress={() => setShowStudentModal(false)}
                style={styles.closeButton}
              >
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.performanceDetails}>
              <View style={styles.performanceItem}>
                <Text style={styles.performanceLabel}>Total Questions:</Text>
                <Text style={styles.performanceValue}>{totalQuestions}</Text>
              </View>
              <View style={styles.performanceItem}>
                <Text style={styles.performanceLabel}>Attempted Questions:</Text>
                <Text style={styles.performanceValue}>{attemptedQuestions}</Text>
              </View>
              <View style={styles.performanceItem}>
                <Text style={styles.performanceLabel}>Unattempted Questions:</Text>
                <Text style={styles.performanceValue}>{unattemptedQuestions}</Text>
              </View>
              <View style={styles.performanceItem}>
                <Text style={styles.performanceLabel}>Correct Answers:</Text>
                <Text style={styles.performanceValue}>{modalStats.correctAnswers}</Text>
              </View>
              <View style={styles.performanceItem}>
                <Text style={styles.performanceLabel}>Wrong Answers:</Text>
                <Text style={styles.performanceValue}>{modalStats.wrongAnswers}</Text>
              </View>
              <View style={styles.performanceItem}>
                <Text style={styles.performanceLabel}>Score:</Text>
                <Text style={styles.performanceValue}>{modalStats.score}</Text>
              </View>
              <View style={styles.performanceItem}>
                <Text style={styles.performanceLabel}>Percentage:</Text>
                <Text style={styles.performanceValue}>{modalStats.percentage}%</Text>
              </View>
              <View style={styles.performanceItem}>
                <Text style={styles.performanceLabel}>Status:</Text>
                <Text style={[
                  styles.performanceValue,
                  { color: modalStats.status === 'PASS' ? '#4CAF50' : '#F44336' }
                ]}>
                  {modalStats.status}
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  // Add loading indicator component
  const LoadingOverlay = () => (
    loading ? (
      <View style={styles.loadingOverlay}>
        <ActivityIndicator size="large" color="#003399" />
        <Text style={styles.loadingText}>Generating Results...</Text>
      </View>
    ) : null
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#003399" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <LoadingOverlay />
      <View style={styles.container}>
        <AdminSidebar isVisible={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
        
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setIsMenuOpen(true)}>
            <Icon name="menu" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Results & Analytics</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.content}>
          {/* <Text style={styles.sectionTitle}> Results</Text> */}
          <FlatList
            data={pendingExams}
            renderItem={renderPendingExamItem}
            keyExtractor={item => item.examId}
            contentContainerStyle={styles.resultsList}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#003399']}
              />
            }
          />
        </View>
      </View>

      {/* Student Performance Modal */}
      {renderStudentModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  resultsList: {
    gap: 15,
  },
  examCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  examHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  examInfo: {
    flex: 1,
  },
  examTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  examSubject: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  examDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  examReviewContainer: {
    flex: 1,
  },
  examDetailsSection: {
    marginBottom: 20,
  },
  detailsCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
    marginTop: 10,
  },
  detailText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  studentsSection: {
    flex: 1,
  },
  studentCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
  },
  studentName: {
    fontSize: 16,
    color: '#333',
  },
  performanceDetails: {
    padding: 15,
  },
  performanceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  performanceLabel: {
    fontSize: 16,
    color: '#666',
  },
  performanceValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
  },
});

export default ResultsAnalytics; 