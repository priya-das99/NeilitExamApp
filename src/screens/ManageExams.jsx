import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AdminSidebar from '../components/AdminSidebar';

// Mock data for exams
const mockExams = [
  {
    id: '1',
    title: 'Mathematics Final Exam',
    duration: 120,
    totalMarks: 100,
    passingMarks: 40,
    status: 'Active',
  },
  {
    id: '2',
    title: 'Science Midterm',
    duration: 90,
    totalMarks: 80,
    passingMarks: 32,
    status: 'Active',
  },
  {
    id: '3',
    title: 'History Quiz',
    duration: 45,
    totalMarks: 50,
    passingMarks: 20,
    status: 'Inactive',
  },
];

const ManageExams = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [exams, setExams] = useState(mockExams);

  const handleEditExam = (examId) => {
    // TODO: Implement edit functionality
    Alert.alert('Edit Exam', `Editing exam with ID: ${examId}`);
  };

  const handleDeleteExam = (examId) => {
    Alert.alert(
      'Delete Exam',
      'Are you sure you want to delete this exam?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          onPress: () => {
            setExams(prevExams => prevExams.filter(exam => exam.id !== examId));
            Alert.alert('Success', 'Exam deleted successfully');
          },
        },
      ],
    );
  };

  const handleToggleStatus = (examId) => {
    setExams(prevExams =>
      prevExams.map(exam =>
        exam.id === examId
          ? { ...exam, status: exam.status === 'Active' ? 'Inactive' : 'Active' }
          : exam
      )
    );
  };

  const renderExamItem = ({ item }) => (
    <View style={styles.examCard}>
      <View style={styles.examHeader}>
        <Text style={styles.examTitle}>{item.title}</Text>
        <View style={[
          styles.statusBadge,
          { backgroundColor: item.status === 'Active' ? '#4CAF50' : '#FF9800' }
        ]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>

      <View style={styles.examDetails}>
        <View style={styles.detailItem}>
          <Icon name="timer" size={16} color="#666" />
          <Text style={styles.detailText}>{item.duration} minutes</Text>
        </View>
        <View style={styles.detailItem}>
          <Icon name="star" size={16} color="#666" />
          <Text style={styles.detailText}>{item.totalMarks} marks</Text>
        </View>
        <View style={styles.detailItem}>
          <Icon name="check-circle" size={16} color="#666" />
          <Text style={styles.detailText}>Pass: {item.passingMarks}</Text>
        </View>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => handleEditExam(item.id)}
        >
          <Icon name="edit" size={20} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.toggleButton]}
          onPress={() => handleToggleStatus(item.id)}
        >
          <Icon
            name={item.status === 'Active' ? 'pause' : 'play-arrow'}
            size={20}
            color="#fff"
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteExam(item.id)}
        >
          <Icon name="delete" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <AdminSidebar isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setIsMenuOpen(true)}>
          <Icon name="menu" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Exams</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={exams}
        renderItem={renderExamItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
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
  listContainer: {
    padding: 15,
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
    marginBottom: 10,
  },
  examTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  examDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#2196F3',
  },
  toggleButton: {
    backgroundColor: '#FF9800',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
  },
});

export default ManageExams; 