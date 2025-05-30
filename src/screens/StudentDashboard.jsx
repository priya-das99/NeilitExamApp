import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
  TextInput,
  StatusBar,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { useAppwrite } from '../utils/AppwriteContext';
import { databases, appwriteConfig } from '../utils/appwriteConfig';
import { Query } from 'appwrite';
import ColorPickerModal from './ColorPickerModal';
import LinearGradient from 'react-native-linear-gradient';
import theme from '../styles/theme';
import MainLayout from '../components/MainLayout';

const StudentDashboard = ({ onThemeColorChange }) => {
  const { user, handleLogout } = useAppwrite();
  const navigation = useNavigation();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#003399');
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [selectedExam, setSelectedExam] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [instructionsAccepted, setInstructionsAccepted] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const [exams, setExams] = useState([]);
  const [studentId, setStudentId] = useState(null);
  const [student, setStudent] = useState(null);
  const [studentLoading, setStudentLoading] = useState(true);

  // Exam Instructions Modal State
  const [showInstructions, setShowInstructions] = useState(false);
  const [instructionsTimer, setInstructionsTimer] = useState(600); // 10 minutes in seconds
  const instructionsTimerRef = useRef(null);

  const fetchExams = useCallback(async () => {
    try {
      setErrorMessage(null);
      // 1. Fetch all exams
      const examsRes = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.examsCollectionId,
        [Query.orderDesc('createdAt'), Query.limit(100)]
      );
      // 2. Fetch assignments for the current student
      let assignments = [];
      if (studentId) {
        const assignmentsRes = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.examAssignmentsCollectionId,
          [Query.equal('studentId', studentId)]
        );
        assignments = assignmentsRes.documents;
      }
      // 3. Attach subjectName, banner, and assignment info to each exam
      const examsWithDetails = await Promise.all(
        examsRes.documents.map(async (exam) => {
          let subjectName = 'Unknown Subject';
          if (exam.subjectId) {
            try {
              const subjectResponse = await databases.getDocument(
                appwriteConfig.databaseId,
                appwriteConfig.subjectsCollectionId,
                exam.subjectId
              );
              if (subjectResponse && subjectResponse.subjectName) {
                subjectName = subjectResponse.subjectName;
              }
            } catch (error) {}
          }
          // Find assignment for this exam and student
          const assignment = assignments.find(a => a.examId === exam.$id);
          return {
            ...exam,
            subjectName,
            banner: require('../../assets/images/getbg.jpg'),
            assignment // may be undefined if not assigned
          };
        })
      );
      // Filter to only show the next scheduled or live exam (not over)
      const now = new Date();
      const notOverExams = examsWithDetails.filter(exam => {
        if (!exam.assignment) return false;
        if (!exam.startTime || !exam.duration) return false;
        const start = new Date(exam.startTime);
        const end = new Date(start.getTime() + exam.duration * 60000);
        return now < end;
      });
      // Sort by start time ascending
      notOverExams.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
      // Only show the next one (if any)
      setExams(notOverExams.length > 0 ? [notOverExams[0]] : []);
    } catch (error) {
      setErrorMessage('Failed to fetch exams. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [studentId]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchExams();
  }, [fetchExams]);

  useEffect(() => {
    fetchExams();
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, scaleAnim, fetchExams]);

  // Timer effect
  useEffect(() => {
    let timer;
    if (showGuidelines && selectedExam) {
      const startTime = new Date(selectedExam.startTime).getTime();
      const now = Date.now();
      const initialTimeRemaining = Math.max(0, startTime - now);
      setTimeRemaining(initialTimeRemaining);

      timer = setInterval(() => {
        const currentTime = Date.now();
        const remaining = Math.max(0, startTime - currentTime);
        setTimeRemaining(remaining);

        if (remaining === 0) {
          clearInterval(timer);
        }
      }, 1000);
    }

    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [showGuidelines, selectedExam]);

  const formatTime = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleColorSelect = useCallback((color) => {
    setSelectedColor(color);
    if (onThemeColorChange) {
      onThemeColorChange(color);
    }
    setShowColorPicker(false);
  }, [onThemeColorChange]);

  const handleExamClick = useCallback((exam) => {
    setSelectedExam(exam);
    setShowGuidelines(true);
  }, []);

  // Show instructions modal after guidelines
  const handleProceedToInstructions = () => {
    setShowGuidelines(false);
    setInstructionsAccepted(false);
    // Calculate time until exam start (if in the future)
    if (selectedExam && selectedExam.startTime) {
      const now = Date.now();
      const start = new Date(selectedExam.startTime).getTime();
      const diff = Math.max(0, Math.floor((start - now) / 1000));
      setInstructionsTimer(Math.min(600, diff)); // 10 min or less
    } else {
      setInstructionsTimer(600);
    }
    setShowInstructions(true);
  };

  // Timer effect for instructions modal
  useEffect(() => {
    if (!showInstructions) return;
    if (instructionsTimer === 0) return;
    instructionsTimerRef.current = setInterval(() => {
      setInstructionsTimer((prev) => {
        if (prev <= 1) {
          clearInterval(instructionsTimerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(instructionsTimerRef.current);
  }, [showInstructions]);

  // Format timer as mm:ss
  const formatInstructionsTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Start Exam handler
  const handleStartExamFromInstructions = () => {
    setShowInstructions(false);
    navigation.navigate('ExamAttemptScreen', {
      examId: selectedExam.$id,
      assignmentId: selectedExam.assignmentId || selectedExam.$id
    });
  };

  // Go to Exam handler (direct navigation, bypass modals)
  const handleGoToExam = (exam) => {
    navigation.navigate('ExamAttemptScreen', {
      examId: exam.examId || exam.$id,
      assignmentId: exam.assignmentId || exam.examId || exam.$id
    });
  };

  const ExamCard = ({ item }) => {
    const [isLive, setIsLive] = useState(false);
    const assignment = item.assignment;
    useEffect(() => {
      if (assignment && item.startTime && item.duration) {
        const start = new Date(item.startTime);
        const end = new Date(start.getTime() + item.duration * 60000); // duration in minutes
        const now = new Date();
        const preLiveWindow = 10 * 60000; // 10 minutes in ms
        if (now >= (start.getTime() - preLiveWindow) && now < end) {
          setIsLive(true);
        } else {
          setIsLive(false);
        }
      } else {
        setIsLive(false);
      }
    }, [assignment, item.startTime, item.duration]);
    // If not assigned, show 'No exam scheduled' card
    if (!assignment) {
      return (
        <View style={[styles.examCard, styles.shadow]}>
          <Image
            source={require('../../assets/images/getbg.jpg')}
            style={styles.examBanner}
            resizeMode="cover"
          />
          <View style={styles.examContentNew}>
            <View style={styles.noExamContainer}>
              <Image
                source={require('../../assets/images/logo.png')}
                style={styles.logoImageNew}
              />
              <Text style={styles.noExamText}>No exam scheduled</Text>
              <View style={{ flex: 1 }} />
              <TouchableOpacity
                style={[styles.goToExamButtonNew, { backgroundColor: '#cccccc' }]}
                disabled={true}
              >
                <Text style={styles.goToExamTextNew}>Go to Exam</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    }
    // Determine exam status
    const now = new Date();
    const start = item.startTime ? new Date(item.startTime) : null;
    const end = (start && item.duration) ? new Date(start.getTime() + item.duration * 60000) : null;
    const isUpcoming = start && now < start;
    const isPast = end && now >= end;

    if (isPast) {
      // Exam is over
      return (
        <View style={[styles.examCard, styles.shadow]}>
          <Image
            source={require('../../assets/images/getbg.jpg')}
            style={styles.examBanner}
            resizeMode="cover"
          />
          <View style={styles.examContentNew}>
            <View style={styles.noExamContainer}>
              <Image 
                source={require('../../assets/images/logo.png')} 
                style={styles.logoImageNew} 
              />
              <Text style={styles.noExamText}>Exam is over</Text>
              <TouchableOpacity
                style={[styles.goToExamButtonNew, { backgroundColor: '#cccccc' }]}
                disabled={true}
              >
                <Text style={styles.goToExamTextNew}>Go to Exam</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    }

    if (isLive) {
      // Exam is live (10 min before start until end)
      return (
        <View style={[styles.examCard, styles.shadow]}>
          <Image
            source={require('../../assets/images/getbg.jpg')}
            style={styles.examBanner}
            resizeMode="cover"
          />
          <View style={styles.examContentNew}>
            <View style={styles.liveExamInfoContainer}>
              <View style={styles.leftContent}>
                <Image 
                  source={require('../../assets/images/logo.png')} 
                  style={styles.logoImageLive} 
                />
                <Text style={styles.subjectNameLive} numberOfLines={1}>
                  {item.subjectName}
                </Text>
              </View>
              <View style={styles.rightContent}>
                <Text style={styles.examTitleLive} numberOfLines={2}>
                  {item.title}
                </Text>
                <View style={[styles.statusBadgeLive, { backgroundColor: '#27ae60' }]}>
                  <Text style={styles.statusBadgeTextLive}>
                    Live
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.bottomSection}>
              <Text style={styles.examDateText}>
                {start.toLocaleDateString('en-US', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </Text>
              <TouchableOpacity
                style={[styles.goToExamButtonNew, { backgroundColor: selectedColor }]}
                onPress={() => handleExamClick(item)}
              >
                <Text style={styles.goToExamTextNew}>
                  Go to Exam
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    }

    // Not live yet (scheduled exam)
    return (
      <View style={[styles.examCard, styles.shadow]}>
        <Image
          source={require('../../assets/images/getbg.jpg')}
          style={styles.examBanner}
          resizeMode="cover"
        />
        <View style={styles.examContentNew}>
          <View style={styles.noExamContainer}>
            <Image 
              source={require('../../assets/images/logo.png')} 
              style={styles.logoImageNew} 
            />
            <Text style={styles.noExamText}>Exam will be live soon</Text>
            <TouchableOpacity
              style={[styles.goToExamButtonNew, { backgroundColor: '#cccccc' }]}
              disabled={true}
            >
              <Text style={styles.goToExamTextNew}>Go to Exam</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  // Update renderExamCard to use ExamCard
  const renderExamCard = useCallback(({ item }) => (
    <ExamCard 
      item={item} 
    />
  ), []);

  // Add UpcomingExamsCard component
  const UpcomingExamsCard = () => (
    <View style={[styles.examCard, styles.shadow, { minHeight: 315 }]}>
      <Image source={require('../../assets/images/jee-banner.jpg')} style={styles.examBanner} resizeMode="cover" />
      <View style={styles.examContentNew}>
        <View style={styles.noExamContainer}>
          <Image 
            source={require('../../assets/images/up.png')} 
            style={[styles.logoImageNew, { alignSelf: 'flex-end', marginRight: 25, marginTop: 20,  }]} 
          />
        </View>
        <View style={{ flex: 1, justifyContent: 'flex-end', width: '100%' }}>
          <TouchableOpacity
            style={[styles.goToExamButtonNew, { backgroundColor: '#003399', marginBottom: 20, marginTop: 20 }]}
            onPress={() => navigation.navigate('UpcomingExams')}
          >
            <Text style={styles.goToExamTextNew}>Upcoming Exams</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const bottomNavRoutes = [
    { name: 'home', label: 'Home', route: 'StudentStack', isActive: true },
    { name: 'school', label: 'Result', route: 'Result', isActive: false },
    { name: 'person', label: 'Profile', route: 'CandidateProfile', isActive: false },
  ];

  const handleOpenDrawer = () => {
    if (navigation.openDrawer) {
      navigation.openDrawer();
    } else {
      Alert.alert(
        'Navigation Error',
        'Drawer navigation is not available. Please check your navigation setup.',
        [{ text: 'OK', style: 'cancel' }]
      );
    }
  };

  // Add the guidelines modal function
  const renderGuidelinesModal = () => (
    <Modal visible={showGuidelines} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Exam Guidelines</Text>
          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalText}>
              1. Read all instructions carefully before starting the exam.{"\n\n"}
              2. Ensure you have a stable internet connection.{"\n\n"}
              3. Do not refresh or close the browser during the exam.{"\n\n"}
              4. All answers must be submitted before the time expires.{"\n\n"}
              5. Any form of cheating will result in immediate disqualification.
            </Text>
          </ScrollView>
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setShowGuidelines(false)}
            >
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.proceedButton]}
              onPress={handleProceedToInstructions}
            >
              <Text style={styles.modalButtonText}>Proceed</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Exam Instructions Modal
  const renderInstructionsModal = () => (
    <Modal visible={showInstructions} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Exam Instructions</Text>
            <TouchableOpacity onPress={() => setShowInstructions(false)}>
              <Icon name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalText}>
              • Read each question carefully before answering.{"\n\n"}
              • You can navigate between questions using Previous/Next buttons.{"\n\n"}
              • Use "Mark for Review" to flag questions you want to revisit.{"\n\n"}
              • Your answers are automatically saved every 30 seconds.{"\n\n"}
              • You cannot leave the exam once started.{"\n\n"}
              • Ensure stable internet connection throughout the exam.
            </Text>
          </ScrollView>
          <View style={styles.instructionsTimerContainer}>
            <Text style={styles.instructionsTimerText}>Exam starts in: {formatInstructionsTime(instructionsTimer)}</Text>
          </View>
          <View style={styles.instructionsCheckboxContainer}>
            <TouchableOpacity
              style={styles.instructionsCheckbox}
              onPress={() => setInstructionsAccepted((prev) => !prev)}
            >
              {instructionsAccepted && <Icon name="check" size={20} color="#1976d2" />}
            </TouchableOpacity>
            <Text style={styles.instructionsCheckboxLabel}>I have read and agree to the instructions</Text>
          </View>
          <TouchableOpacity
            style={[
              styles.instructionsStartButton,
              (instructionsTimer > 0 || !instructionsAccepted) && styles.instructionsStartButtonDisabled
            ]}
            disabled={instructionsTimer > 0 || !instructionsAccepted}
            onPress={handleStartExamFromInstructions}
          >
            <Text style={styles.instructionsStartButtonText}>Start Exam</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // Fetch studentId from students collection using email (if not already present)
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
    const fetchStudent = async () => {
      if (!user || !user.email) return;
      try {
        const res = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.studentsCollectionId,
          [Query.equal('email', user.email)]
        );
        if (res.documents.length > 0) {
          setStudent(res.documents[0]);
        }
      } catch (err) {
        setStudent(null);
      } finally {
        setStudentLoading(false);
      }
    };
    fetchStudent();
  }, [user]);

  return (
    <MainLayout>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: selectedColor }]}>
        <StatusBar 
          barStyle="light-content" 
          backgroundColor={selectedColor} 
          translucent={true}
        />
        <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          <View style={[styles.topNav, { backgroundColor: selectedColor }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <TouchableOpacity 
                onPress={handleOpenDrawer}
                style={[styles.iconButton, { marginLeft: -8 }]}
              >
                <Icon name="menu" size={24} color="#ffffff" />
              </TouchableOpacity>
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', marginLeft: 24 }}>
                <Text style={styles.screenTitle}>Home</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity 
                  onPress={() => navigation.navigate('Notifications')}
                  style={styles.iconButton}
                >
                  <Icon name="notifications" size={24} color="#ffffff" />
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => setShowColorPicker(true)}
                  style={styles.iconButton}
                >
                  <Icon name="palette" size={24} color="#ffffff" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
          
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl 
                refreshing={isRefreshing} 
                onRefresh={onRefresh} 
                colors={[selectedColor]} 
                tintColor={selectedColor} 
              />
            }
          >
            <View style={[styles.userInfo, { backgroundColor: selectedColor }]}>
              <Image
                source={
                  student && student.profileImage
                    ? { uri: student.profileImage }
                    : require('../../assets/images/user.png')
                }
                style={styles.userAvatar}
                resizeMode="cover"
              />
              <Text style={styles.goodMorningText}>
                Good morning, {studentLoading ? '...' : student?.name || 'Student'}
              </Text>
              <Text style={styles.userMessage}>
                {studentLoading ? '' : student?.email || ''}
              </Text>
            </View>
            
            <View style={styles.content}>
              <View style={styles.searchBarContainer}>
                <View style={styles.searchBar}>
                  <Icon name="search" size={24} color="#999999" />
                  <TextInput 
                    style={styles.searchInput} 
                    placeholder="Search..." 
                    placeholderTextColor="#999999" 
                  />
                </View>
              </View>
              
              {errorMessage && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              )}
              
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={selectedColor} />
                  <Text style={styles.loadingText}>Loading exams...</Text>
                </View>
              ) : (
                <View style={styles.examListContainer}>
                  <>
                    {exams.length === 0 ? (
                      <View style={styles.examCardWrapper}>
                        <ExamCard item={{}} />
                      </View>
                    ) : (
                      exams.map((exam) => (
                        <View key={exam.examId} style={styles.examCardWrapper}>
                          {renderExamCard({ item: exam })}
                        </View>
                      ))
                    )}
                    <View style={styles.examCardWrapper}>
                      <UpcomingExamsCard />
                    </View>
                  </>
                </View>
              )}
            </View>
          </ScrollView>
        </Animated.View>

        <ColorPickerModal
          visible={showColorPicker}
          onClose={() => setShowColorPicker(false)}
          onSelectColor={handleColorSelect}
          currentColor={selectedColor}
        />

        {renderGuidelinesModal()}
        {renderInstructionsModal()}
      </SafeAreaView>
    </MainLayout>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop: 40,
    position: 'relative',
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 1,
  },
  topNavIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconButton: {
    padding: 10,
  },
  userInfo: {
    alignItems: 'center',
    padding: 20,
    paddingBottom: 40,
  },
  userAvatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  goodMorningText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  userMessage: {
    fontSize: 18,
    color: '#ffffff',
    opacity: 0.9,
    textAlign: 'center',
    fontWeight: '400',
  },
  content: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
    paddingTop: 10,
    flex: 1,
  },
  searchBarContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 30,
    paddingHorizontal: 15,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#333333',
  },
  errorContainer: {
    padding: 10,
    backgroundColor: '#ffeeee',
    marginHorizontal: 16,
    borderRadius: 8,
    marginBottom: 10,
  },
  errorText: {
    color: '#dc3545',
    fontSize: 14,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
    marginTop: 10,
  },
  examListContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  examCardWrapper: {
    width: '48%',
    marginBottom: 20,
  },
  examCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f0f0f0',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 280,
  },
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  examContentNew: {
    padding: 15,
    paddingTop: 12,
    backgroundColor: '#fff',
    flex: 1,
    justifyContent: 'space-between',
  },
  liveExamInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
  },
  notLiveExamInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
  },
  leftContent: {
    flexDirection: 'column',
    alignItems: 'center',
    width: '30%',
    justifyContent: 'center',
  },
  rightContent: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    width: '65%',
    flexGrow: 1,
  },
  logoImageLive: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    marginBottom: 8,
    resizeMode: 'contain',
  },
  logoImageNew: {
    width: 100,
    height: 45,
    borderRadius: 22.5,
    marginBottom: 8,
    resizeMode: 'contain',
  },
  examTitleLive: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 8,
    textAlign: 'right',
    flexWrap: 'wrap',
  },
  subjectNameLive: {
    fontSize: 14,
    color: '#444',
    fontWeight: '500',
    textAlign: 'center',
  },
  statusBadgeLive: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
  },
  statusBadgeTextLive: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
    textAlign: 'center',
  },
  examSoonText: {
    color: '#888',
    fontWeight: 'bold',
    fontSize: 14,
    textAlign: 'right',
  },
  bottomSection: {
    marginTop: 'auto',
    alignItems: 'center',
  },
  examDateText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  goToExamButtonNew: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  goToExamTextNew: {
    fontSize: 15,
    color: '#fff',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxHeight: '80%',
    alignItems: 'stretch',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#222',
  },
  modalContent: {
    maxHeight: 260,
    marginBottom: 20,
  },
  modalText: {
    fontSize: 16,
    color: '#444',
    lineHeight: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  cancelButton: {
    backgroundColor: '#E0E0E0',
  },
  proceedButton: {
    backgroundColor: '#1976d2',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  instructionsTimerContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  instructionsTimerText: {
    fontSize: 18,
    color: '#1976d2',
    fontWeight: 'bold',
  },
  instructionsCheckboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  instructionsCheckbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#1976d2',
    borderRadius: 4,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  instructionsCheckboxLabel: {
    fontSize: 16,
    color: '#444',
  },
  instructionsStartButton: {
    backgroundColor: '#1976d2',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  instructionsStartButtonDisabled: {
    backgroundColor: '#cccccc',
  },
  instructionsStartButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  examBanner: {
    width: '100%',
    height: 130,
    resizeMode: 'cover',
  },
});

export default StudentDashboard;