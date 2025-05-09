import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { databases, appwriteConfig, ID } from '../utils/appwriteConfig';
import AdminSidebar from '../components/AdminSidebar';
import { Picker } from '@react-native-picker/picker';
import { account } from '../utils/appwriteConfig';
import { Query } from 'appwrite';

const ManageStudents = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [newStudent, setNewStudent] = useState({
    name: '',
    email: '',
    courseId: '',
    status: 'active',
    password: '',
  });

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const res = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.studentsCollectionId,
        [
          Query.orderDesc('createdAt')
        ]
      );
      console.log('Fetched students:', res.documents);
      setStudents(res.documents);
    } catch (err) {
      console.error('Failed to fetch students:', err);
      Alert.alert('Error', 'Failed to load students. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setLoadingCourses(true);
      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.coursesCollectionId
      );
      setCourses(response.documents);
    } catch (error) {
      console.error('Error fetching courses:', error);
      Alert.alert('Error', 'Failed to load courses. Please try again.');
    } finally {
      setLoadingCourses(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchStudents();
  }, []);

  const handleStatusChange = async (studentId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.studentsCollectionId,
        studentId,
        { status: newStatus }
      );
      setStudents(prevStudents =>
        prevStudents.map(student =>
          student.studentId === studentId
            ? { ...student, status: newStatus }
            : student
        )
      );
      Alert.alert('Success', `Student status updated to ${newStatus}`);
    } catch (err) {
      console.error('Failed to update status:', err);
      Alert.alert('Error', 'Failed to update student status');
    }
  };

  const handleDeleteStudent = async (studentId) => {
    Alert.alert(
      'Delete Student',
      'Are you sure you want to delete this student?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await databases.deleteDocument(
                appwriteConfig.databaseId,
                appwriteConfig.studentsCollectionId,
                studentId
              );
              
              // Instead of just updating local state, refresh the entire list
              fetchStudents();
              
              Alert.alert('Success', 'Student deleted successfully');
            } catch (err) {
              console.error('Failed to delete student:', err);
              if (err.message.includes('not found')) {
                Alert.alert('Error', 'Student not found in the database');
                // Refresh the list if we get a not found error
                fetchStudents();
              } else {
                Alert.alert('Error', 'Failed to delete student. Please try again.');
              }
            }
          },
        },
      ]
    );
  };

  const handleAddStudent = async () => {
    if (!newStudent.name || !newStudent.email || !newStudent.courseId || !newStudent.password) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const studentId = ID.unique();
      
      // Create the student account first
      await account.create(studentId, newStudent.email, newStudent.password, newStudent.name);
      
      // Then create the student document without the password
      const { password, ...studentData } = newStudent;
      await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.studentsCollectionId,
        studentId,
        {
          ...studentData,
          studentId,
          createdAt: new Date().toISOString(),
          status: 'active'
        }
      );
      
      setShowAddModal(false);
      setNewStudent({
        name: '',
        email: '',
        courseId: '',
        status: 'active',
        password: '',
      });
      fetchStudents();
      Alert.alert('Success', 'Student added successfully');
    } catch (err) {
      console.error('Failed to add student:', err);
      Alert.alert('Error', 'Failed to add student');
    }
  };

  const renderStudentCard = ({ item }) => (
    <View style={styles.studentCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.name}>{item.name}</Text>
        <View style={[
          styles.statusBadge,
          { backgroundColor: item.status === 'active' ? '#4CAF50' : item.status === 'pending' ? '#FFC107' : '#F44336' }
        ]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <Icon name="email" size={16} color="#666" />
          <Text style={styles.infoText}>{item.email}</Text>
        </View>
        <View style={styles.infoRow}>
          <Icon name="school" size={16} color="#666" />
          <Text style={styles.infoText}>Course ID: {item.courseId}</Text>
        </View>
        <View style={styles.infoRow}>
          <Icon name="calendar-today" size={16} color="#666" />
          <Text style={styles.infoText}>
            Joined: {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>
      </View>
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.statusButton]}
          onPress={() => handleStatusChange(item.studentId, item.status)}
        >
          <Icon
            name={item.status === 'active' ? 'pause' : 'play-arrow'}
            size={20}
            color="#fff"
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteStudent(item.studentId)}
        >
          <Icon name="delete" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#00e4d0" />
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
          <Text style={styles.headerTitle}>Manage Students</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddModal(true)}
          >
            <Icon name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#00e4d0" />
          </View>
        ) : (
          <FlatList
            data={students}
            keyExtractor={item => item.studentId}
            renderItem={renderStudentCard}
            contentContainerStyle={styles.listContainer}
            refreshing={refreshing}
            onRefresh={onRefresh}
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
                <Icon name="people" size={50} color="#ccc" />
                <Text style={styles.emptyText}>No students found</Text>
              </View>
            }
          />
        )}

        <Modal
          visible={showAddModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowAddModal(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add New Student</Text>
                <TouchableOpacity onPress={() => setShowAddModal(false)}>
                  <Icon name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalBody}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Name *</Text>
                  <TextInput
                    style={styles.input}
                    value={newStudent.name}
                    onChangeText={text => setNewStudent(prev => ({ ...prev, name: text }))}
                    placeholder="Enter student name"
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email *</Text>
                  <TextInput
                    style={styles.input}
                    value={newStudent.email}
                    onChangeText={text => setNewStudent(prev => ({ ...prev, email: text }))}
                    placeholder="Enter student email"
                    keyboardType="email-address"
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Password *</Text>
                  <TextInput
                    style={styles.input}
                    value={newStudent.password}
                    onChangeText={text => setNewStudent(prev => ({ ...prev, password: text }))}
                    placeholder="Enter password"
                    secureTextEntry
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Course *</Text>
                  {loadingCourses ? (
                    <Text style={styles.loadingText}>Loading courses...</Text>
                  ) : courses.length === 0 ? (
                    <Text style={styles.errorText}>No courses available.</Text>
                  ) : (
                    <View style={{ borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8 }}>
                      <Picker
                        selectedValue={newStudent.courseId}
                        onValueChange={(itemValue) => setNewStudent(prev => ({ ...prev, courseId: itemValue }))}
                        style={{ height: 50 }}
                      >
                        <Picker.Item label="Select a course..." value="" />
                        {courses.map(course => (
                          <Picker.Item key={course.$id} label={course.name} value={course.$id} />
                        ))}
                      </Picker>
                    </View>
                  )}
                </View>
              </ScrollView>
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowAddModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleAddStudent}
                >
                  <Text style={styles.saveButtonText}>Add Student</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
  addButton: {
    backgroundColor: '#00e4d0',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
  },
  studentCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  cardBody: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    color: '#666',
    fontSize: 14,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusButton: {
    backgroundColor: '#FF9800',
  },
  deleteButton: {
    backgroundColor: '#F44336',
  },
  centered: {
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
    marginTop: 10,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 8,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalBody: {
    padding: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 8,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 4,
    padding: 8,
    fontSize: 16,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    backgroundColor: '#e0e0e0',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: 'bold',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    backgroundColor: '#00e4d0',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  loadingText: {
    color: '#666',
    fontSize: 14,
  },
  errorText: {
    color: '#F44336',
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ManageStudents; 