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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AdminSidebar from '../components/AdminSidebar';
import DateTimePicker from '@react-native-community/datetimepicker';
import { databases, appwriteConfig } from '../utils/appwriteConfig';
import { Query } from 'appwrite';
import { useNavigation } from '@react-navigation/native';

// Mock data for results
const mockResults = [
  {
    id: '1',
    examName: 'Mathematics Final Exam',
    totalStudents: 50,
    averageScore: 75,
    passPercentage: 85,
    topScore: 98,
    date: '2024-03-15',
  },
  {
    id: '2',
    examName: 'Science Midterm',
    totalStudents: 45,
    averageScore: 68,
    passPercentage: 78,
    topScore: 95,
    date: '2024-03-10',
  },
  {
    id: '3',
    examName: 'History Quiz',
    totalStudents: 40,
    averageScore: 82,
    passPercentage: 90,
    topScore: 100,
    date: '2024-03-05',
  },
];

const ResultsAnalytics = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
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
  const navigation = useNavigation();

  // Fetch pending exams
  const fetchPendingExams = async () => {
    try {
      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.examAssignmentsCollectionId,
        [Query.equal('status', 'completed')]
      );
      
      // Group exams by examId
      const groupedExams = {};
      
      // First, group the assignments by examId
      for (const exam of response.documents) {
        if (!groupedExams[exam.examId]) {
          groupedExams[exam.examId] = {
            students: []
          };
        }
        groupedExams[exam.examId].students.push(exam);
      }

      // Then, fetch exam details for each unique examId
      for (const examId in groupedExams) {
        try {
          const examDoc = await databases.getDocument(
            appwriteConfig.databaseId,
            appwriteConfig.examsCollectionId,
            examId
          );

          // Debug: log the subjectId being fetched
          console.log('Fetching subject for examId:', examId, 'subjectId:', examDoc.subjectId);

          let subjectName = 'Unknown Subject';
          if (examDoc.subjectId) {
            try {
              const subjectDoc = await databases.getDocument(
                appwriteConfig.databaseId,
                appwriteConfig.subjectsCollectionId,
                examDoc.subjectId
              );
              subjectName = subjectDoc.subjectName || subjectDoc.title || subjectDoc.name || 'Unknown Subject';
              console.log('Fetched subject name:', subjectName, 'for subjectId:', examDoc.subjectId);
            } catch (subjectErr) {
              console.error(`Error fetching subject for subjectId ${examDoc.subjectId}:`, subjectErr);
            }
          } else {
            console.warn(`No subjectId found for examId ${examId}`);
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
          console.error(`Error fetching exam details for ${examId}:`, error);
          groupedExams[examId] = {
            examId: examId,
            title: 'Error Loading Exam',
            subjectName: 'Unknown Subject',
            duration: 0,
            totalMarks: 0,
            date: new Date().toISOString(),
            students: groupedExams[examId].students
          };
        }
      }
      
      setPendingExams(Object.values(groupedExams));
    } catch (error) {
      console.error('Error fetching pending exams:', error);
      Alert.alert('Error', 'Failed to fetch pending exams');
    }
  };

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
  const calculateResults = (exam) => {
    const answers = exam.answers.split(';');
    let correctAnswers = 0;
    let wrongAnswers = 0;
    let totalScore = 0;

    answers.forEach(answer => {
      const [questionId, studentAnswer] = answer.split(':');
      if (studentAnswer) {
        // Compare with correct answer and calculate score
        if (isAnswerCorrect(questionId, studentAnswer)) {
          correctAnswers++;
          totalScore += getQuestionMarks(questionId);
        } else {
          wrongAnswers++;
        }
      }
    });

    const totalQuestions = exam.totalQuestions;
    const percentage = Math.round((totalScore / exam.totalMarks) * 100);

    return {
      correctAnswers,
      wrongAnswers,
      totalScore,
      percentage
    };
  };

  // Generate results for all students in an exam
  const generateResultsForAll = async (exam) => {
    try {
      for (const studentExam of exam.students) {
        const results = calculateResults(studentExam);
        
        const resultData = {
          resultId: `RES_${Date.now()}_${studentExam.studentId}`,
          examId: exam.examId,
          studentId: studentExam.studentId,
          courseId: studentExam.courseId,
          subjectId: studentExam.subjectId,
          totalQuestions: parseInt(studentExam.totalQuestions),
          correctAnswers: parseInt(results.correctAnswers),
          wrongAnswers: parseInt(results.wrongAnswers),
          score: parseInt(results.totalScore),
          percentage: parseInt(results.percentage),
          timeTaken: parseInt(studentExam.timeTaken),
          startTime: studentExam.startTime,
          endTime: studentExam.endTime,
          status: 'pending',
          answers: studentExam.answers,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        await databases.createDocument(
          appwriteConfig.databaseId,
          'results',
          resultData
        );

        // Update exam assignment status to 'result_generated'
        await databases.updateDocument(
          appwriteConfig.databaseId,
          appwriteConfig.examAssignmentsCollectionId,
          studentExam.$id,
          { status: 'result_generated' }
        );
      }

      Alert.alert('Success', 'Results generated for all students');
      setShowGenerateModal(false);
      fetchPendingExams();
    } catch (error) {
      console.error('Error generating results:', error);
      Alert.alert('Error', 'Failed to generate results');
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
    fetchPendingExams();
    fetchGeneratedResults();
    setLoading(false);
  }, []);

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
                <Text style={styles.performanceValue}>
                  {selectedStudent?.answers ? calculateCorrectAnswers(selectedStudent.answers) : 0}
                </Text>
              </View>
              <View style={styles.performanceItem}>
                <Text style={styles.performanceLabel}>Wrong Answers:</Text>
                <Text style={styles.performanceValue}>
                  {selectedStudent?.answers ? calculateWrongAnswers(selectedStudent.answers) : 0}
                </Text>
              </View>
              <View style={styles.performanceItem}>
                <Text style={styles.performanceLabel}>Score:</Text>
                <Text style={styles.performanceValue}>
                  {selectedStudent?.answers ? calculateScore(selectedStudent.answers) : 0}
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const calculateCorrectAnswers = (answers) => {
    // Implementation for calculating correct answers
    return 0; // Placeholder
  };

  const calculateWrongAnswers = (answers) => {
    // Implementation for calculating wrong answers
    return 0; // Placeholder
  };

  const calculateScore = (answers) => {
    // Implementation for calculating score
    return 0; // Placeholder
  };

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
      <View style={styles.container}>
        <AdminSidebar isVisible={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
        
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setIsMenuOpen(true)}>
            <Icon name="menu" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Results Analytics</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Pending Results</Text>
          <FlatList
            data={pendingExams}
            renderItem={renderPendingExamItem}
            keyExtractor={item => item.examId}
            contentContainerStyle={styles.resultsList}
            showsVerticalScrollIndicator={false}
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
});

export default ResultsAnalytics; 