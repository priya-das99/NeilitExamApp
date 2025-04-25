import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, ActivityIndicator, Image } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAppwrite } from '../utils/AppwriteContext';
import { useAuthNavigation } from '../hooks/useAuthNavigation';
import { useNavigation } from '@react-navigation/native';

const StudentDashboard = () => {
  const { user, isLoading, handleLogout } = useAppwrite();
  const navigation = useNavigation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [upcomingExams, setUpcomingExams] = useState([]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (!user) {
          // If no user is found, redirect to login
          navigation.reset({
            index: 0,
            routes: [{ name: 'CandidateLogin' }],
          });
          return;
        }

        if (user.preferences?.role !== 'student') {
          // If user is not a student, show error and logout
          Alert.alert(
            'Access Denied',
            'You do not have permission to access this dashboard.',
            [
              {
                text: 'OK',
                onPress: async () => {
                  await handleLogout();
                  navigation.reset({
                    index: 0,
                    routes: [{ name: 'CandidateLogin' }],
                  });
                },
              },
            ]
          );
          return;
        }

        // If everything is valid, set authenticated state
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Auth check error:', error);
        Alert.alert(
          'Error',
          'An error occurred while checking authentication.',
          [
            {
              text: 'OK',
              onPress: async () => {
                await handleLogout();
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'CandidateLogin' }],
                });
              },
            },
          ]
        );
      }
    };

    checkAuth();
  }, [user, navigation, handleLogout]);

  useEffect(() => {
    loadStudentData();
  }, []);

  const loadStudentData = async () => {
    try {
      // Simulated API calls - replace with actual data fetching
      const mockCourses = [
        { id: 1, name: 'Mathematics', progress: 65 },
        { id: 2, name: 'Physics', progress: 45 },
        { id: 3, name: 'Chemistry', progress: 30 },
      ];
      
      const mockExams = [
        { id: 1, course: 'Mathematics', date: '2024-03-15', duration: '2 Hours' },
        { id: 2, course: 'Physics', date: '2024-03-20', duration: '1.5 Hours' },
      ];

      setCourses(mockCourses);
      setUpcomingExams(mockExams);
    } catch (error) {
      Alert.alert('Error', 'Failed to load student data');
    } finally {
      setLoadingCourses(false);
    }
  };

  const handleLogoutClick = async () => {
    try {
      // Show loading state
      setLoadingCourses(true);
      
      // Call handleLogout from Appwrite context
      await handleLogout();
      
      // Reset navigation to login screen
      navigation.reset({
        index: 0,
        routes: [{ name: 'CandidateLogin' }],
      });
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert(
        'Logout Failed',
        'Unable to logout. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoadingCourses(false);
    }
  };

  const renderCourseProgress = (course) => (
    <View key={course.id} style={styles.courseCard}>
      <View style={styles.courseHeader}>
        <Text style={styles.courseName}>{course.name}</Text>
        <Text style={styles.progressText}>{course.progress}%</Text>
      </View>
      <View style={styles.progressBar}>
        <View 
          style={[
            styles.progressFill,
            { width: `${course.progress}%` }
          ]}
        />
      </View>
    </View>
  );

  const renderUpcomingExam = (exam) => (
    <View key={exam.id} style={styles.examCard}>
      <Icon name="assignment" size={24} color="#666" />
      <View style={styles.examDetails}>
        <Text style={styles.examCourse}>{exam.course}</Text>
        <Text style={styles.examDate}>{exam.date}</Text>
      </View>
      <Text style={styles.examDuration}>{exam.duration}</Text>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <Image
          source={require('../../assets/images/createexam.png')}
          style={styles.avatar}
        />
        <View style={styles.headerText}>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.userName}>{user?.name || 'Student'}</Text>
        </View>
      </View>

      {/* Academic Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Academic Summary</Text>
        <View style={styles.summaryCards}>
          <View style={[styles.summaryCard, { backgroundColor: '#e3f2fd' }]}>
            <Text style={styles.summaryNumber}>3</Text>
            <Text style={styles.summaryLabel}>Active Courses</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: '#f0f4c3' }]}>
            <Text style={styles.summaryNumber}>82%</Text>
            <Text style={styles.summaryLabel}>Average Score</Text>
          </View>
        </View>
      </View>

      {/* Course Progress */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Course Progress</Text>
        {loadingCourses ? (
          <ActivityIndicator size="small" color="#0066cc" />
        ) : (
          courses.map(renderCourseProgress)
        )}
      </View>

      {/* Upcoming Exams */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Upcoming Exams</Text>
        {upcomingExams.map(renderUpcomingExam)}
      </View>

      {/* Logout Button */}
      <TouchableOpacity 
        style={styles.logoutButton} 
        onPress={handleLogoutClick}
        disabled={loadingCourses}
      >
        {loadingCourses ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <>
            <Icon name="exit-to-app" size={20} color="#fff" />
            <Text style={styles.logoutButtonText}>Logout</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
  },
  headerText: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 16,
    color: '#666',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  summaryCards: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  summaryCard: {
    width: '48%',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  courseCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  courseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  courseName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  progressText: {
    fontSize: 14,
    color: '#666',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#eee',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#0066cc',
    borderRadius: 4,
  },
  examCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  examDetails: {
    flex: 1,
    marginLeft: 15,
  },
  examCourse: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  examDate: {
    fontSize: 14,
    color: '#666',
  },
  examDuration: {
    fontSize: 14,
    color: '#666',
  },
  logoutButton: {
    flexDirection: 'row',
    backgroundColor: '#0066cc',
    padding: 15,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    gap: 10,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default StudentDashboard;