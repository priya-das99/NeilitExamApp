import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  SafeAreaView,
  ScrollView,
  Animated,
  RefreshControl,
  ActivityIndicator,
  Platform,
  PermissionsAndroid,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { launchImageLibrary } from 'react-native-image-picker';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppwrite } from '../utils/AppwriteContext';
import { AuthService } from '../utils/authService';
import AdminSidebar from '../components/AdminSidebar';
import { databases, appwriteConfig } from '../utils/appwriteConfig';

const defaultUserAvatar = require('../../assets/images/exam.jpg');

const AdminDashboard = () => {
  const navigation = useNavigation();
  const { user, isLoggedIn, handleLogout } = useAppwrite();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [themeColor, setThemeColor] = useState('#00e4d0');
  const [userAvatar, setUserAvatar] = useState(defaultUserAvatar);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const [examCount, setExamCount] = useState(null);
  const [studentCount, setStudentCount] = useState(null);
  const [courseCount, setCourseCount] = useState(null);

  // Admin cards data
  const adminCards = [
    {
      id: '1',
      title: 'Create Exam',
      subtitle: 'Create MCQ/MSQ with images',
      icon: 'add-task',
      color: '#4CAF50',
      onPress: () => navigation.navigate('CreateExam')
    },
    {
      id: '2',
      title: 'Manage Exams',
      subtitle: 'View, edit, delete exams',
      icon: 'assignment',
      color: '#2196F3',
      onPress: () => navigation.navigate('ManageExams')
    },
    {
      id: '3',
      title: 'Manage Students',
      subtitle: 'Add, remove, assign courses',
      icon: 'people',
      color: '#FF9800',
      onPress: () => navigation.navigate('ManageStudents')
    },
    {
      id: '4',
      title: 'Results Analytics',
      subtitle: 'View performance reports',
      icon: 'analytics',
      color: '#9C27B0',
      onPress: () => navigation.navigate('ResultsAnalytics')
    },
    {
      id: '5',
      title: 'Manage Questions',
      subtitle: 'View, add, edit, delete questions',
      icon: 'quiz',
      color: '#00BCD4',
      onPress: () => navigation.navigate('ManageQuestions')
    }
  ];

  // Verify admin access and handle role-based redirection
  useEffect(() => {
    const checkUserRole = async () => {
      try {
        if (!isLoggedIn) {
          navigation.navigate('CandidateLogin');
          return;
        }

        const userRole = await AsyncStorage.getItem('user_role');
        
        if (userRole === 'student') {
          navigation.replace('DrawerMain');
          return;
        }

        if (userRole !== 'admin') {
          Alert.alert(
            'Access Denied',
            'Admin privileges required',
            [{ text: 'OK', onPress: () => navigation.navigate('CandidateLogin') }]
          );
        }
      } catch (error) {
        console.error('Role check error:', error);
        navigation.navigate('CandidateLogin');
      }
    };

    checkUserRole();
  }, [isLoggedIn, navigation]);

  // Load admin profile picture
  useEffect(() => {
    const loadAdminProfile = async () => {
      try {
        if (user?.$id) {
          const savedAvatar = await AsyncStorage.getItem(`admin_avatar_${user.$id}`);
          if (savedAvatar) setUserAvatar({ uri: savedAvatar });
        }
      } catch (error) {
        console.error('Profile load error:', error);
      }
    };
    loadAdminProfile();
  }, [user]);

  useEffect(() => {
    let intervalId;
    const fetchCounts = async () => {
      try {
        const examsRes = await databases.listDocuments(appwriteConfig.databaseId, appwriteConfig.examsCollectionId, [ ]);
        setExamCount(examsRes.total);
        const studentsRes = await databases.listDocuments(appwriteConfig.databaseId, appwriteConfig.studentsCollectionId, [ ]);
        setStudentCount(studentsRes.total);
        const coursesRes = await databases.listDocuments(appwriteConfig.databaseId, appwriteConfig.coursesCollectionId, [ ]);
        setCourseCount(coursesRes.total);
      } catch (err) {
        setExamCount(0);
        setStudentCount(0);
        setCourseCount(0);
      }
    };
    fetchCounts();
    intervalId = setInterval(fetchCounts, 30000); // Refresh every 30 seconds
    return () => clearInterval(intervalId);
  }, []);

  const onLogout = async () => {
    try {
      await handleLogout();
      navigation.navigate('CandidateLogin');
    } catch (error) {
      Alert.alert('Logout Failed', error.message);
    }
  };

  const pickImage = async () => {
    if (!user?.$id) return;

    try {
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        const permissions = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO
        ]);
        
        if (Object.values(permissions).some(status => status !== 'granted')) {
          Alert.alert('Permission Required', 'Need media access to update profile');
          return;
        }
      }

      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
      });

      if (result.assets?.[0]?.uri) {
        await AsyncStorage.setItem(`admin_avatar_${user.$id}`, result.assets[0].uri);
        setUserAvatar({ uri: result.assets[0].uri });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile picture');
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (AuthService && typeof AuthService.getAuthenticatedUser === 'function') {
        const currentUser = await AuthService.getAuthenticatedUser();
        if (!currentUser || currentUser?.preferences?.role !== 'admin') {
          await handleLogout();
          navigation.navigate('CandidateLogin');
        }
      } else {
        console.warn('AuthService.getCurrentUser method not found');
      }
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Animation for component mount
  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  if (!isLoggedIn) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={themeColor} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColor }]}>
      <StatusBar barStyle="light-content" backgroundColor={themeColor} />
      <View style={styles.mainContainer}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: themeColor }]}>
          <TouchableOpacity onPress={() => setIsMenuOpen(true)}>
            <Icon name="menu" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
          <TouchableOpacity onPress={onLogout}>
            <Icon name="logout" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Admin Sidebar */}
        <AdminSidebar 
          isVisible={isMenuOpen} 
          onClose={() => setIsMenuOpen(false)} 
        />

        {/* Profile Section */}
        <View style={[styles.profileSection, { backgroundColor: themeColor }]}>
          <View style={styles.avatarContainer}>
            <Image source={userAvatar} style={styles.profileImage} />
            <TouchableOpacity 
              style={styles.cameraIconContainer}
              onPress={pickImage}
            >
              <Icon name="camera-alt" size={20} color="white" />
            </TouchableOpacity>
          </View>
          <View style={styles.profileTextContainer}>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text style={styles.adminName}>{user?.name || 'Admin'}</Text>
          </View>
        </View>

        {/* Main Content */}
        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={[themeColor]}
              tintColor={themeColor}
            />
          }
        >
          <Animated.View
            style={[
              styles.container,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            {/* Quick Stats */}
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{examCount === null ? <ActivityIndicator size="small" color="#00e4d0" /> : examCount}</Text>
                <Text style={styles.statLabel}>Active Exams</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{studentCount === null ? <ActivityIndicator size="small" color="#00e4d0" /> : studentCount}</Text>
                <Text style={styles.statLabel}>Students</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{courseCount === null ? <ActivityIndicator size="small" color="#00e4d0" /> : courseCount}</Text>
                <Text style={styles.statLabel}>Courses</Text>
              </View>
            </View>

            {/* Admin Cards */}
            <View style={styles.cardsContainer}>
              {adminCards.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.adminCard, { backgroundColor: item.color }]}
                  onPress={item.onPress}
                  activeOpacity={0.8}
                >
                  <View style={styles.cardContent}>
                    <Icon name={item.icon} size={32} color="#FFFFFF" />
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  mainContainer: {
    flex: 1,
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 5 : 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  cameraIconContainer: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: '#4267B2',
    borderRadius: 20,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  profileTextContainer: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  adminName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 8,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#666666',
  },
  cardsContainer: {
    marginBottom: 20,
  },
  adminCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 16,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  cardContent: {
    flex: 1,
    gap: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 20,
    color: '#666',
  },
});

export default AdminDashboard;