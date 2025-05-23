import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  StatusBar,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AdminSidebar from '../components/AdminSidebar';
import { databases, appwriteConfig, ID } from '../utils/appwriteConfig';
import { Query } from 'appwrite';
import { useRoute } from '@react-navigation/native';

const AssignExam = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const route = useRoute();
  const { examId, courseId } = route.params;

  useEffect(() => {
    fetchStudents();
  }, [courseId]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      console.log('Fetching students for course:', courseId);
      
      // First, let's check if we're getting the correct courseId
      if (!courseId) {
        console.error('No courseId provided');
        Alert.alert('Error', 'No course selected');
        return;
      }

      // Get all students for the course regardless of status
      const res = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.studentsCollectionId,
        [
          Query.equal('courseId', courseId)
        ]
      );
      
      // Detailed logging
      console.log('Query Parameters:', {
        databaseId: appwriteConfig.databaseId,
        collectionId: appwriteConfig.studentsCollectionId,
        courseId: courseId
      });
      
      console.log('Total students found:', res.documents.length);
      console.log('Students details:', res.documents.map(s => ({
        id: s.$id,
        name: s.name,
        email: s.email,
        status: s.status,
        courseId: s.courseId,
        createdAt: s.createdAt
      })));

      // Let's also check if there are any students with different courseIds
      const allStudents = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.studentsCollectionId
      );
      
      console.log('All students in database:', allStudents.documents.length);
      console.log('Students with different courseIds:', 
        allStudents.documents
          .filter(s => s.courseId !== courseId)
          .map(s => ({
            id: s.$id,
            name: s.name,
            courseId: s.courseId
          }))
      );

      setStudents(res.documents);
    } catch (err) {
      console.error('Failed to fetch students:', err);
      Alert.alert('Error', 'Failed to load students. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchStudents();
  }, []);

  const handleStudentSelect = (studentId, status) => {
    // Only allow selecting active students
    if (status !== 'active') {
      Alert.alert('Cannot Select', 'Only active students can be assigned exams');
      return;
    }

    setSelectedStudents(prev => {
      if (prev.includes(studentId)) {
        return prev.filter(id => id !== studentId);
      } else {
        return [...prev, studentId];
      }
    });
  };

  const handleAssignExam = async () => {
    if (selectedStudents.length === 0) {
      Alert.alert('Error', 'Please select at least one student');
      return;
    }

    try {
      setLoading(true);
      for (const studentId of selectedStudents) {
        await databases.createDocument(
          appwriteConfig.databaseId,
          appwriteConfig.examAssignmentsCollectionId,
          ID.unique(),
          {
            examId,
            studentId,
            status: 'pending',
            createdAt: new Date().toISOString()
          }
        );
      }
      Alert.alert('Success', 'Exam assigned successfully');
      setSelectedStudents([]);
      fetchStudents();
    } catch (err) {
      console.error('Failed to assign exam:', err);
      Alert.alert('Error', 'Failed to assign exam. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => setIsMenuOpen(true)}>
        <Icon name="menu" size={24} color="#333" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Assign Exam</Text>
      <TouchableOpacity
        style={styles.assignButton}
        onPress={handleAssignExam}
        disabled={selectedStudents.length === 0}
      >
        <Text style={styles.assignButtonText}>Assign</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStudentItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.studentCard,
        selectedStudents.includes(item.$id) && styles.selectedCard,
        item.status !== 'active' && styles.inactiveCard
      ]}
      onPress={() => handleStudentSelect(item.$id, item.status)}
    >
      <View style={styles.studentInfo}>
        <Text style={styles.studentName}>{item.name}</Text>
        <Text style={styles.studentEmail}>{item.email}</Text>
        <View style={[
          styles.statusBadge,
          { backgroundColor: item.status === 'active' ? '#4CAF50' : item.status === 'pending' ? '#FFC107' : '#F44336' }
        ]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      <Icon
        name={selectedStudents.includes(item.$id) ? 'check-box' : 'check-box-outline-blank'}
        size={24}
        color={selectedStudents.includes(item.$id) ? '#00e4d0' : '#666'}
      />
    </TouchableOpacity>
  );

  const renderFooter = () => (
    <View style={styles.footer}>
      <Text style={styles.footerText}>
        {selectedStudents.length} student{selectedStudents.length !== 1 ? 's' : ''} selected
      </Text>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00e4d0" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.container}>
        <AdminSidebar isVisible={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
        
        <FlatList
          data={students}
          renderItem={renderStudentItem}
          keyExtractor={item => item.$id}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#00e4d0']}
              tintColor="#00e4d0"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No students found for this course</Text>
            </View>
          }
        />
      </View>
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
  assignButton: {
    backgroundColor: '#00e4d0',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  assignButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  listContainer: {
    flexGrow: 1,
    padding: 15,
  },
  studentCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedCard: {
    borderColor: '#00e4d0',
    backgroundColor: '#f0f9f8',
  },
  inactiveCard: {
    opacity: 0.7,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  studentEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  footer: {
    padding: 15,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#666',
  },
});

export default AssignExam; 