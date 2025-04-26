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
      <View style={styles.headerRow}>
        <View style={styles.logoBrand}>
          <Image
            source={require('../../assets/images/exam.jpg')}
            style={styles.logo}
          />
          <Text style={styles.brandName}>Exam Portal</Text>
        </View>
        <View style={styles.profileSection}>
          <Text style={styles.studentName}>{user?.name || 'Student'}</Text>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogoutClick} disabled={loadingCourses}>
            <Icon name="exit-to-app" size={20} color="#fff" />
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Dashboard Cards */}
      <View style={styles.dashboardCardsRow}>
        <View style={[styles.dashboardCard, { backgroundColor: '#e3f2fd' }]}> 
          <Icon name="assignment" size={32} color="#1976d2" />
          <Text style={styles.dashboardCardTitle}>Assigned Exams</Text>
          <Text style={styles.dashboardCardValue}>{upcomingExams.length}</Text>
        </View>
        <View style={[styles.dashboardCard, { backgroundColor: '#f0f4c3' }]}> 
          <Icon name="check-circle" size={32} color="#689f38" />
          <Text style={styles.dashboardCardTitle}>Completed Exams</Text>
          <Text style={styles.dashboardCardValue}>0</Text>
        </View>
        <View style={[styles.dashboardCard, { backgroundColor: '#ffe0b2' }]}> 
          <Icon name="bar-chart" size={32} color="#f57c00" />
          <Text style={styles.dashboardCardTitle}>Results</Text>
          <Text style={styles.dashboardCardValue}>0</Text>
        </View>
      </View>

      {/* Assigned Exams Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Assigned Exams</Text>
        {upcomingExams.length === 0 ? (
          <Text style={styles.emptyText}>No assigned exams.</Text>
        ) : (
          upcomingExams.map((exam, idx) => (
            <View key={exam.id} style={styles.examCardRow}>
              <View style={styles.examInfo}>
                <Text style={styles.examTitle}>{exam.course}</Text>
                <Text style={styles.examMeta}>{exam.date} | {exam.duration}</Text>
              </View>
              <TouchableOpacity
                style={styles.startExamButton}
                onPress={() => navigation.navigate('ExamAttemptScreen')}
              >
                <Icon name="play-arrow" size={20} color="#fff" />
                <Text style={styles.startExamButtonText}>Start Exam</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

      {/* Completed Exams Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Completed Exams</Text>
        <Text style={styles.emptyText}>No completed exams yet.</Text>
      </View>

      {/* Results/Reports Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Results / Reports</Text>
        <Text style={styles.emptyText}>No results available yet.</Text>
      </View>
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  logoBrand: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 10,
  },
  brandName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  profileSection: {
    alignItems: 'flex-end',
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  dashboardCardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  dashboardCard: {
    flex: 1,
    marginHorizontal: 5,
    borderRadius: 12,
    alignItems: 'center',
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  dashboardCardTitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    marginBottom: 2,
  },
  dashboardCardValue: {
    fontSize: 22,
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
  examCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  examInfo: {
    flex: 1,
  },
  examTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976d2',
  },
  examMeta: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  startExamButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1976d2',
    borderRadius: 6,
    paddingVertical: 7,
    paddingHorizontal: 14,
    marginLeft: 10,
  },
  startExamButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 5,
  },
  emptyText: {
    color: '#aaa',
    fontSize: 15,
    textAlign: 'center',
    marginVertical: 10,
  },
});

export default StudentDashboard;