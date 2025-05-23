import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAppwrite } from '../utils/AppwriteContext';
import { databases, appwriteConfig } from '../utils/appwriteConfig';
import { Query } from 'appwrite';

const UpcomingExams = () => {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedExam, setSelectedExam] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const { user } = useAppwrite();
  const [studentId, setStudentId] = useState(null);

  // Fetch studentId from students collection using email
  useEffect(() => {
    const fetchStudentId = async () => {
      if (!user || !user.email) return;
      try {
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
  }, [user]);

  useEffect(() => {
    if (!studentId) {
      setExams([]);
      setLoading(false);
      return;
    }
    fetchUpcomingExams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  const fetchUpcomingExams = async () => {
    try {
      setLoading(true);
      console.log('Current studentId for upcoming exams:', studentId);
      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.examAssignmentsCollectionId,
        [
          Query.equal('studentId', studentId),
          Query.orderAsc('submittedAt')
        ]
      );
      console.log('Assignments fetched for upcoming exams:', response.documents);
      // Fetch exam details for each assignment, filter by exam status
      const examsWithDetails = (await Promise.all(
        response.documents.map(async (assignment) => {
          const examResponse = await databases.getDocument(
            appwriteConfig.databaseId,
            appwriteConfig.examsCollectionId,
            assignment.examId
          );
          console.log('Assignment:', assignment, 'Exam status:', examResponse.status);
          if (examResponse.status !== 'scheduled') return null;
          const now = new Date();
          const start = new Date(examResponse.startTime);
          if (now >= start) return null; // Only include future scheduled exams
          const subjectResponse = await databases.getDocument(
            appwriteConfig.databaseId,
            appwriteConfig.subjectsCollectionId,
            examResponse.subjectId
          );
          return {
            ...assignment,
            examDetails: {
              ...examResponse,
              subjectName: subjectResponse.subjectName
            }
          };
        })
      )).filter(Boolean);
      setExams(examsWithDetails);
    } catch (error) {
      console.error('Error fetching upcoming exams:', error);
      setExams([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const renderExamCard = (exam) => (
    <TouchableOpacity
      key={exam.$id}
      style={styles.examCard}
      onPress={() => {
        setSelectedExam(exam);
        setShowModal(true);
      }}
    >
      <View style={styles.examCardContent}>
        <View style={styles.examHeader}>
          <Text style={styles.examName}>{exam.examDetails.title}</Text>
          <Icon name="chevron-right" size={28} color="#003399" />
        </View>
        <Text style={styles.examDate}>
          {formatDate(exam.examDetails.startTime)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderExamDetailsModal = () => (
    <Modal
      visible={showModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Exam Details</Text>
            <TouchableOpacity
              onPress={() => setShowModal(false)}
              style={styles.closeButton}
            >
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {/* Exam Details Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Exam Information</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Exam Name:</Text>
                <Text style={styles.detailValue}>{selectedExam?.examDetails.title}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Subject:</Text>
                <Text style={styles.detailValue}>{selectedExam?.examDetails.subjectName}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Total Marks:</Text>
                <Text style={styles.detailValue}>{selectedExam?.examDetails.totalMarks}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Passing Marks:</Text>
                <Text style={styles.detailValue}>{selectedExam?.examDetails.passingMarks}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Duration:</Text>
                <Text style={styles.detailValue}>{selectedExam?.examDetails.duration} minutes</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Date:</Text>
                <Text style={styles.detailValue}>{formatDate(selectedExam?.examDetails.startTime)}</Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Upcoming Exams</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#003399" />
          <Text style={styles.loadingText}>Loading upcoming exams...</Text>
        </View>
      ) : exams.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="event" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No upcoming exams scheduled</Text>
        </View>
      ) : (
        <ScrollView style={styles.content}>
          {exams.map(renderExamCard)}
        </ScrollView>
      )}

      {renderExamDetailsModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingTop: 36,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: '#003399',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  examCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  examCardContent: {
    padding: 16,
  },
  examHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  examName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  examDate: {
    fontSize: 14,
    color: '#666',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 16,
    color: '#666',
    flex: 1,
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
});

export default UpcomingExams; 