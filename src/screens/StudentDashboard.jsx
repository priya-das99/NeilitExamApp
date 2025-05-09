import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, ActivityIndicator, Image, RefreshControl } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAppwrite } from '../utils/AppwriteContext';
import { useAuthNavigation } from '../hooks/useAuthNavigation';
import { useNavigation } from '@react-navigation/native';
import { databases, appwriteConfig } from '../utils/appwriteConfig';
import { Query } from 'appwrite';

const StudentDashboard = () => {
  const { user, isLoading, handleLogout } = useAppwrite();
  const navigation = useNavigation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [upcomingExams, setUpcomingExams] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      setLoadingCourses(true);
      console.log('Starting data fetch for student:', user.$id);
      console.log('Database ID:', appwriteConfig.databaseId);
      console.log('Students Collection ID:', appwriteConfig.studentsCollectionId);

      // First get the student's courseId
      try {
        const studentRes = await databases.getDocument(
          appwriteConfig.databaseId,
          appwriteConfig.studentsCollectionId,
          user.$id
        );
        console.log('Student data fetched successfully:', studentRes);
        console.log('Student courseId:', studentRes.courseId);

        if (!studentRes.courseId) {
          console.error('Student has no course assigned');
          Alert.alert('Error', 'You are not assigned to any course. Please contact administrator.');
          return;
        }

        // Fetch student's course
        try {
          const courseRes = await databases.getDocument(
            appwriteConfig.databaseId,
            appwriteConfig.coursesCollectionId,
            studentRes.courseId
          );
          console.log('Course data fetched successfully:', courseRes);
          setCourses([courseRes]);

          // Fetch upcoming exam assignments
          try {
            console.log('Fetching exam assignments for student:', user.$id);
            console.log('Exam Assignments Collection ID:', appwriteConfig.examAssignmentsCollectionId);
            
            // First, let's check if there are any assignments without status filter
            const allAssignmentsRes = await databases.listDocuments(
              appwriteConfig.databaseId,
              appwriteConfig.examAssignmentsCollectionId,
              [Query.equal('studentId', user.$id)]
            );
            console.log('All assignments found:', allAssignmentsRes.documents.length);
            console.log('All assignments data:', allAssignmentsRes.documents);

            // Now fetch pending assignments
            const assignmentsRes = await databases.listDocuments(
              appwriteConfig.databaseId,
              appwriteConfig.examAssignmentsCollectionId,
              [
                Query.equal('studentId', user.$id),
                Query.equal('status', 'pending')
              ]
            );
            console.log('Pending assignments found:', assignmentsRes.documents.length);
            console.log('Pending assignments data:', assignmentsRes.documents);

            // Fetch exam details for each assignment with error handling
            const examDetailsPromises = assignmentsRes.documents.map(async (assignment) => {
              try {
                console.log('Fetching exam details for assignment:', assignment.examId);
                console.log('Assignment data:', assignment);
                
                const examRes = await databases.getDocument(
                  appwriteConfig.databaseId,
                  appwriteConfig.examsCollectionId,
                  assignment.examId
                );
                console.log('Exam details fetched successfully:', examRes);

                // Validate exam data
                if (!examRes || !examRes.title || !examRes.duration || !examRes.startTime) {
                  console.error('Invalid exam data:', examRes);
                  return {
                    ...assignment,
                    examDetails: null,
                    error: 'Invalid exam data'
                  };
                }

                // Check if exam is scheduled for future
                const examStartTime = new Date(examRes.startTime);
                const now = new Date();
                if (examStartTime < now) {
                  console.log('Exam has already started:', examRes.title);
                  return {
                    ...assignment,
                    examDetails: null,
                    error: 'Exam has already started'
                  };
                }

                return {
                  ...assignment,
                  examDetails: examRes
                };
              } catch (err) {
                console.error('Failed to fetch exam details for assignment:', assignment.examId, err);
                console.error('Assignment data:', assignment);
                return {
                  ...assignment,
                  examDetails: null,
                  error: 'Exam not found'
                };
              }
            });

            const examDetails = await Promise.all(examDetailsPromises);
            
            // Filter out invalid exams and sort by start time
            const validExams = examDetails
              .filter(exam => exam.examDetails !== null)
              .sort((a, b) => {
                const timeA = new Date(a.examDetails.startTime).getTime();
                const timeB = new Date(b.examDetails.startTime).getTime();
                return timeA - timeB;
              });
            
            const invalidExams = examDetails.filter(exam => exam.examDetails === null);
            
            if (invalidExams.length > 0) {
              console.warn('Some exams could not be loaded:', invalidExams.length);
              // Update assignment status for invalid exams
              for (const invalidExam of invalidExams) {
                try {
                  await databases.updateDocument(
                    appwriteConfig.databaseId,
                    appwriteConfig.examAssignmentsCollectionId,
                    invalidExam.$id,
                    {
                      status: 'error'
                    }
                  );
                } catch (updateErr) {
                  console.error('Failed to update assignment status:', updateErr);
                }
              }
            }
            
            console.log('Valid exams found:', validExams.length);
            setUpcomingExams(validExams);
          } catch (assignmentsErr) {
            console.error('Failed to fetch assignments:', assignmentsErr);
            throw assignmentsErr;
          }
        } catch (courseErr) {
          console.error('Failed to fetch course:', courseErr);
          throw courseErr;
        }
      } catch (studentErr) {
        console.error('Failed to fetch student data:', studentErr);
        throw studentErr;
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
      Alert.alert('Error', 'Failed to load data. Please try again.');
    } finally {
      setLoadingCourses(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (!user) {
          navigation.reset({
            index: 0,
            routes: [{ name: 'CandidateLogin' }],
          });
          return;
        }

        if (user.preferences?.role !== 'student') {
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

        setIsAuthenticated(true);
        fetchData();
      } catch (error) {
        console.error('Auth check error:', error);
        navigation.navigate('CandidateLogin');
      }
    };

    checkAuth();
  }, [user]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  const handleLogoutClick = async () => {
    try {
      await handleLogout();
      navigation.reset({
        index: 0,
        routes: [{ name: 'Welcome' }],
      });
    } catch (error) {
      console.error('Logout error:', error);
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
    <View key={exam.$id} style={styles.examCardRow}>
      <View style={styles.examInfo}>
        <Text style={styles.examTitle}>
          {exam.examDetails?.title || 'Exam Details Unavailable'}
        </Text>
        <Text style={styles.examMeta}>
          {exam.examDetails ? (
            `${new Date(exam.examDetails?.startTime).toLocaleDateString()} | 
            Duration: ${exam.examDetails?.duration} minutes`
          ) : (
            'Exam details not available'
          )}
        </Text>
      </View>
      {exam.examDetails ? (
        <TouchableOpacity
          style={styles.startExamButton}
          onPress={() => navigation.navigate('ExamAttemptScreen', { 
            examId: exam.examId,
            assignmentId: exam.$id
          })}
        >
          <Icon name="play-arrow" size={20} color="#fff" />
          <Text style={styles.startExamButtonText}>Start Exam</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.startExamButton, { backgroundColor: '#ccc' }]}
          disabled={true}
        >
          <Icon name="error" size={20} color="#fff" />
          <Text style={styles.startExamButtonText}>Unavailable</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (isLoading || !isAuthenticated) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <ScrollView 
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#00e4d0']}
          tintColor="#00e4d0"
        />
      }
    >
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
          upcomingExams.map((exam, idx) => 
            renderUpcomingExam(exam)
          )
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