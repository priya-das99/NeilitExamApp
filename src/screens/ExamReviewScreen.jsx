import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Modal, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { databases, appwriteConfig } from '../utils/appwriteConfig';
import { Query } from 'appwrite';

const ExamReviewScreen = ({ route, navigation }) => {
  const { exam } = route.params;
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [questionMappings, setQuestionMappings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [studentResult, setStudentResult] = useState(null);
  const [loadingResult, setLoadingResult] = useState(false);

  // Utility function to calculate exam score
  const calculateExamScore = (score = 0, totalMarks = 0) => {
    const percentage = totalMarks ? Math.round((score / totalMarks) * 100) : 0;
    return {
      score,
      percentage,
      status: percentage >= 30 ? 'pass' : 'fail'
    };
  };

  // Add utility function to format answers
  const formatAnswersString = (answersStr) => {
    if (!answersStr) return '';
    // Take only the first few answer pairs to fit within 45 chars
    const pairs = answersStr.split(';');
    let formattedStr = '';
    for (const pair of pairs) {
      if ((formattedStr + pair + ';').length <= 44) { // 44 to leave room for last semicolon
        formattedStr += pair + ';';
      } else {
        break;
      }
    }
    return formattedStr.slice(0, 45); // Ensure it's within 45 chars
  };

  useEffect(() => {
    const fetchQuestionMappings = async () => {
      try {
        // Fetch mappings from exam_questions collection
        const examQuestionsRes = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.examQuestionsCollectionId,
          [Query.equal('examId', exam.examId)]
        );
        setQuestionMappings(examQuestionsRes.documents || []);
      } catch (error) {
        console.error('Error fetching exam questions:', error);
        setQuestionMappings([]);
      } finally {
        setLoading(false);
      }
    };
    fetchQuestionMappings();
  }, [exam.examId]);

  const handleStudentPress = (student) => {
    setSelectedStudent(student);
    setShowStudentModal(true);
  };

  const closeModal = () => {
    setShowStudentModal(false);
    setSelectedStudent(null);
  };

  const calculateStats = (student) => {
    const totalQuestions = questionMappings.length;
    const answersArr = student.answers ? student.answers.split(';').filter(a => a.trim() !== '') : [];
    const attemptedQuestions = answersArr.length;
    const unattemptedQuestions = Math.max(0, totalQuestions - attemptedQuestions);
    const score = student.score || 0;
    return { totalQuestions, attemptedQuestions, unattemptedQuestions, score };
  };

  const handleGenerateResult = async () => {
    setGenerating(true);
    try {
      // Fetch assignments from exam_assignment collection
      const assignmentQuery = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.examAssignmentsCollectionId,
        [
          Query.equal('examId', exam.examId),
          Query.equal('status', 'completed')
        ]
      );

      if (!assignmentQuery.documents.length) {
        Alert.alert('No Data', 'No completed assignments found for this exam');
        setGenerating(false);
        return;
      }

      let processedCount = 0;
      let failedCount = 0;

      for (const assignment of assignmentQuery.documents) {
        try {
          // Calculate result using the score from assignment
          const { score, percentage, status } = calculateExamScore(
            assignment.score || 0,
            exam.totalMarks || 0
          );

          // Format answers string to fit within 45 chars
          const formattedAnswers = formatAnswersString(assignment.answers);

          // Create result document
          const resultData = {
            examId: exam.examId,
            studentId: assignment.studentId,
            courseId: assignment.courseId || exam.courseId,
            subjectId: exam.subjectId,
            totalQuestions: parseInt(assignment.totalQuestions || 0),
            score,
            percentage,
            timeTaken: assignment.timeTaken || 0,
            startTime: assignment.startTime || '',
            endTime: assignment.endTime || '',
            status,
            answers: formattedAnswers, // Use formatted answers string
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          await databases.createDocument(
            appwriteConfig.databaseId,
            'results',
            'unique()',
            resultData
          );

          processedCount++;
        } catch (error) {
          console.error('Error processing assignment:', {
            assignmentId: assignment.$id,
            error: error.message
          });
          failedCount++;
        }
      }

      if (failedCount > 0) {
        Alert.alert(
          'Partial Success',
          `Generated ${processedCount} results. Failed to generate ${failedCount} results.`
        );
      } else {
        Alert.alert('Success', 'Results generated for all students!');
      }
    } catch (error) {
      console.error('Error generating results:', error);
      Alert.alert('Error', 'Failed to generate results');
    }
    setGenerating(false);
  };

  const handleReleaseResult = async () => {
    setReleasing(true);
    try {
      // Fetch all results for this exam
      const resultsRes = await databases.listDocuments(
        appwriteConfig.databaseId,
        'results',
        [Query.equal('examId', exam.examId)]
      );
      const results = resultsRes.documents || [];
      // Update each result's status to 'released'
      for (const result of results) {
        await databases.updateDocument(
          appwriteConfig.databaseId,
          'results',
          result.$id,
          { status: 'released', updatedAt: new Date().toISOString() }
        );
      }
      Alert.alert('Success', 'Results released for all students!');
    } catch (error) {
      console.error('Error releasing results:', error);
      Alert.alert('Error', 'Failed to release results');
    }
    setReleasing(false);
  };

  const handleViewResult = async () => {
    if (!selectedStudent) return;
    setLoadingResult(true);
    try {
      const res = await databases.listDocuments(
        appwriteConfig.databaseId,
        'results',
        [
          Query.equal('examId', exam.examId),
          Query.equal('studentId', selectedStudent.studentId)
        ]
      );
      if (res.documents && res.documents.length > 0) {
        setStudentResult(res.documents[0]);
      } else {
        setStudentResult(null);
      }
    } catch (error) {
      console.error('Error fetching result:', error);
      setStudentResult(null);
    }
    setLoadingResult(false);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#003399" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Exam Review</Text>
        <View style={{ width: 24 }} />
      </View>
      <View style={styles.examDetails}>
        <Text style={styles.examTitle}>{exam.title}</Text>
        <Text style={styles.examSubject}>Subject: {exam.subjectName}</Text>
        <Text style={styles.examDate}>Date: {new Date(exam.date).toLocaleDateString()}</Text>
        <Text style={styles.examInfo}>Duration: {exam.duration} min | Total Marks: {exam.totalMarks}</Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#1976d2' }]}
            onPress={handleGenerateResult}
            disabled={generating}
          >
            <Text style={styles.buttonText}>{generating ? 'Generating...' : 'Generate Result'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#00b894' }]}
            onPress={handleReleaseResult}
            disabled={generating || releasing}
          >
            <Text style={styles.buttonText}>{releasing ? 'Releasing...' : 'Release Result'}</Text>
          </TouchableOpacity>
        </View>
      </View>
      <Text style={styles.sectionTitle}>Assigned Students</Text>
      <FlatList
        data={exam.students}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.studentCard} onPress={() => handleStudentPress(item)}>
            <Text style={styles.studentName}>Student ID: {item.studentId}</Text>
            <Icon name="chevron-right" size={20} color="#666" />
          </TouchableOpacity>
        )}
        keyExtractor={item => item.$id}
        contentContainerStyle={styles.studentsList}
      />
      {/* Student Performance Modal */}
      <Modal
        visible={showStudentModal}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Student Performance</Text>
              <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            {selectedStudent && (
              <ScrollView style={styles.performanceDetails}>
                {Object.entries(calculateStats(selectedStudent)).map(([label, value]) => (
                  <View style={styles.performanceItem} key={label}>
                    <Text style={styles.performanceLabel}>{label.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:</Text>
                    <Text style={styles.performanceValue}>{value}</Text>
                  </View>
                ))}
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#1976d2', marginTop: 20 }]}
                  onPress={handleViewResult}
                  disabled={loadingResult}
                >
                  <Text style={styles.buttonText}>{loadingResult ? 'Loading...' : 'View Result'}</Text>
                </TouchableOpacity>
                {studentResult && (
                  <View style={styles.resultBox}>
                    <Text style={styles.resultTitle}>Result</Text>
                    <Text style={styles.resultText}>Score: {studentResult.score}</Text>
                    <Text style={styles.resultText}>Percentage: {studentResult.percentage}%</Text>
                    <Text style={styles.resultText}>Status: {studentResult.status === 'pass' ? 'Pass' : studentResult.status === 'fail' ? 'Fail' : studentResult.status}</Text>
                  </View>
                )}
                {studentResult === null && !loadingResult && (
                  <Text style={styles.resultText}>Result not found for this student.</Text>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#e0e0e0', justifyContent: 'space-between' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  examDetails: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  examTitle: { fontSize: 18, fontWeight: '600', color: '#333' },
  examSubject: { fontSize: 14, color: '#666', marginTop: 5 },
  examDate: { fontSize: 14, color: '#666', marginTop: 5 },
  examInfo: { fontSize: 14, color: '#666', marginTop: 5 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#333', margin: 20 },
  studentsList: { paddingHorizontal: 20 },
  studentCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8f9fa', borderRadius: 8, padding: 15, marginBottom: 10 },
  studentName: { fontSize: 16, color: '#333' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', borderRadius: 12, padding: 20, width: '90%', maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#e0e0e0', paddingBottom: 10 },
  modalTitle: { fontSize: 20, fontWeight: '600', color: '#333' },
  closeButton: { padding: 5 },
  performanceDetails: { padding: 15 },
  performanceItem: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  performanceLabel: { fontSize: 16, color: '#666' },
  performanceValue: { fontSize: 16, fontWeight: '600', color: '#333' },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    marginBottom: 8,
  },
  actionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  resultBox: {
    marginTop: 24,
    backgroundColor: '#f1f8e9',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#388e3c',
    marginBottom: 8,
  },
  resultText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
});

export default ExamReviewScreen; 