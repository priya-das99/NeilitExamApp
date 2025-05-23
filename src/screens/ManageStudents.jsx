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
  Image,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { databases, appwriteConfig, ID, storage } from '../utils/appwriteConfig';
import AdminSidebar from '../components/AdminSidebar';
import { Picker } from '@react-native-picker/picker';
import { account } from '../utils/appwriteConfig';
import { Query } from 'appwrite';
import * as ImagePicker from 'react-native-image-picker';
import RNFetchBlob from 'rn-fetch-blob';

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
    studentImage: null,
  });
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [courseNames, setCourseNames] = useState({});

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

  const fetchCourseNames = async () => {
    try {
      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.coursesCollectionId
      );
      const courseMap = {};
      response.documents.forEach(course => {
        courseMap[course.$id] = course.name;
      });
      setCourseNames(courseMap);
    } catch (error) {
      console.error('Error fetching course names:', error);
    }
  };

  useEffect(() => {
    fetchCourseNames();
  }, []);

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

  const handleImagePick = async () => {
    try {
      const result = await ImagePicker.launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        includeBase64: false,
        includeExtra: true,
      });

      if (result.assets && result.assets[0]) {
        const selectedImage = result.assets[0];
        setNewStudent(prev => ({
          ...prev,
          studentImage: {
            uri: selectedImage.uri,
            type: selectedImage.type || 'image/jpeg',
            fileName: selectedImage.fileName || 'student-image.jpg',
            fileSize: selectedImage.fileSize,
          }
        }));
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleAddStudent = async () => {
    if (!newStudent.name || !newStudent.email || !newStudent.courseId || !newStudent.password) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const studentId = ID.unique();
      let imageUrl = null;

      // Upload image if selected
      if (newStudent.studentImage) {
        try {
          const fileId = ID.unique();
          const response = await RNFetchBlob.fetch(
            'POST',
            `https://cloud.appwrite.io/v1/storage/buckets/${appwriteConfig.bucketId}/files`,
            {
              'Content-Type': 'multipart/form-data',
              'X-Appwrite-Project': appwriteConfig.projectId,
            },
            [
              { name: 'fileId', data: fileId },
              {
                name: 'file',
                filename: newStudent.studentImage.fileName || 'photo.jpg',
                type: newStudent.studentImage.type || 'image/jpeg',
                data: RNFetchBlob.wrap(newStudent.studentImage.uri),
              },
            ]
          );

          const data = JSON.parse(response.data);
          if (response.respInfo.status !== 201) {
            throw new Error(data.message || 'Upload failed');
          }
          
          // Get the file URL
          imageUrl = storage.getFileView(
            '680f5c59001ad28a1efe',
            data.$id
          ).toString();
        } catch (uploadError) {
          console.error('Error uploading image:', uploadError);
          Alert.alert('Error', 'Failed to upload student image. Please try again.');
          return;
        }
      }

      // Create the student account
      try {
        await account.create(
          studentId,
          newStudent.email,
          newStudent.password,
          newStudent.name
        );
      } catch (accountError) {
        console.error('Error creating account:', accountError);
        Alert.alert('Error', 'Failed to create student account. Please try again.');
        return;
      }
      
      // Create the student document
      try {
        const { password, studentImage, ...studentData } = newStudent;
        await databases.createDocument(
          appwriteConfig.databaseId,
          appwriteConfig.studentsCollectionId,
          studentId,
          {
            ...studentData,
            studentId,
            studentImage: imageUrl, // Store the URI as a string
            createdAt: new Date().toISOString(),
            status: 'active',
            isVerified: false,
            verificationStatus: 'pending',
            verificationAttempts: 0,
            isExamActive: false,
            micPermission: false
          }
        );
        
        setShowAddModal(false);
        setNewStudent({
          name: '',
          email: '',
          courseId: '',
          status: 'active',
          password: '',
          studentImage: null,
        });
        fetchStudents();
        Alert.alert('Success', 'Student added successfully');
      } catch (documentError) {
        console.error('Error creating student document:', documentError);
        Alert.alert('Error', 'Failed to create student record. Please try again.');
        // Clean up the account if document creation fails
        try {
          await account.deleteSession('current');
        } catch (cleanupError) {
          console.error('Error cleaning up:', cleanupError);
        }
      }
    } catch (err) {
      console.error('Failed to add student:', err);
      Alert.alert('Error', 'Failed to add student. Please try again.');
    }
  };

  const handleUpdateImage = async (studentId, newImage) => {
    try {
      const fileId = ID.unique();
      const response = await RNFetchBlob.fetch(
        'POST',
        `https://cloud.appwrite.io/v1/storage/buckets/${appwriteConfig.bucketId}/files`,
        {
          'Content-Type': 'multipart/form-data',
          'X-Appwrite-Project': appwriteConfig.projectId,
        },
        [
          { name: 'fileId', data: fileId },
          {
            name: 'file',
            filename: newImage.fileName || 'photo.jpg',
            type: newImage.type || 'image/jpeg',
            data: RNFetchBlob.wrap(newImage.uri),
          },
        ]
      );

      const data = JSON.parse(response.data);
      if (response.respInfo.status !== 201) {
        throw new Error(data.message || 'Upload failed');
      }

      const imageUrl = storage.getFileView(
        '680f5c59001ad28a1efe',
        data.$id
      ).toString();

      await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.studentsCollectionId,
        studentId,
        { studentImage: imageUrl }
      );

      fetchStudents();
      setShowImageModal(false);
      Alert.alert('Success', 'Student image updated successfully');
    } catch (error) {
      console.error('Error updating image:', error);
      Alert.alert('Error', 'Failed to update student image');
    }
  };

  const renderStudentCard = ({ item }) => (
    <View style={styles.studentCard}>
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          {item.studentImage && (
            <TouchableOpacity 
              style={styles.imagePreview}
              onPress={() => {
                setSelectedStudent(item);
                setShowImageModal(true);
              }}
            >
              <Image 
                source={{ uri: item.studentImage }} 
                style={styles.thumbnailImage} 
              />
            </TouchableOpacity>
          )}
          <View style={styles.studentInfo}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.email}>{item.email}</Text>
            <View style={styles.infoRow}>
              <Icon name="school" size={16} color="#666" />
              <Text style={styles.infoText}>Course: {courseNames[item.courseId] || 'Loading...'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Icon name="calendar-today" size={16} color="#666" />
              <Text style={styles.infoText}>
                Joined: {new Date(item.createdAt).toLocaleDateString()}
              </Text>
            </View>
          </View>
        </View>
        <View style={[
          styles.statusBadge,
          { backgroundColor: item.status === 'active' ? '#4CAF50' : item.status === 'pending' ? '#FFC107' : '#F44336' }
        ]}>
          <Text style={styles.statusText}>{item.status}</Text>
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

  const renderImageModal = () => (
    <Modal
      visible={showImageModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowImageModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Student Image</Text>
            <TouchableOpacity onPress={() => setShowImageModal(false)}>
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          <View style={styles.modalBody}>
            {selectedStudent && (
              <>
                <Image 
                  source={{ uri: selectedStudent.studentImage }} 
                  style={styles.fullImage} 
                />
                <TouchableOpacity 
                  style={styles.updateImageButton}
                  onPress={async () => {
                    try {
                      const result = await ImagePicker.launchImageLibrary({
                        mediaType: 'photo',
                        quality: 0.8,
                        includeBase64: false,
                        includeExtra: true,
                      });

                      if (result.assets && result.assets[0]) {
                        const selectedImage = result.assets[0];
                        await handleUpdateImage(selectedStudent.studentId, {
                          uri: selectedImage.uri,
                          type: selectedImage.type || 'image/jpeg',
                          fileName: selectedImage.fileName || 'student-image.jpg',
                        });
                      }
                    } catch (error) {
                      console.error('Error picking image:', error);
                      Alert.alert('Error', 'Failed to pick image');
                    }
                  }}
                >
                  <Text style={styles.updateImageButtonText}>Update Image</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
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
                  <Text style={styles.label}>Student Image</Text>
                  <TouchableOpacity 
                    style={styles.imagePickerButton}
                    onPress={handleImagePick}
                  >
                    {newStudent.studentImage ? (
                      <Image 
                        source={{ uri: newStudent.studentImage.uri }} 
                        style={styles.previewImage} 
                      />
                    ) : (
                      <View style={styles.imagePlaceholder}>
                        <Icon name="add-a-photo" size={24} color="#666" />
                        <Text style={styles.imagePlaceholderText}>Add Photo</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
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
      {renderImageModal()}
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
    padding: 12,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  studentInfo: {
    flex: 1,
    marginLeft: 8,
  },
  name: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
  },
  email: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
    marginBottom: 3,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  infoText: {
    color: '#666',
    fontSize: 13,
    marginLeft: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginLeft: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 6,
    marginTop: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
  imagePickerButton: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 4,
  },
  previewImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  imagePlaceholderText: {
    color: '#666',
    marginTop: 8,
  },
  imagePreview: {
    marginRight: 8,
  },
  thumbnailImage: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  fullImage: {
    width: '100%',
    height: 300,
    resizeMode: 'contain',
    marginBottom: 16,
  },
  updateImageButton: {
    backgroundColor: '#00e4d0',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  updateImageButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ManageStudents; 