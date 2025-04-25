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
  Linking
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { launchImageLibrary } from 'react-native-image-picker';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppwrite } from '../utils/AppwriteContext';
import { AuthService } from '../utils/authService';

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

  // Verify admin access and handle role-based redirection
  useEffect(() => {
    const checkUserRole = async () => {
      try {
        if (!isLoggedIn) {
          navigation.navigate('CandidateLogin');
          return;
        }

        // Get user role from preferences
        const userRole = await AsyncStorage.getItem('user_role');
        
        if (userRole === 'student') {
          navigation.replace('StudentDashboard');
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

  // Admin cards data
  const adminCards = [
    {
      id: '1',
      title: 'Create Exam',
      icon: 'assignment',
      color: '#ffdbac',
      onPress: () => navigation.navigate('CreateExam')
    },
    {
      id: '2',
      title: 'Manage Exams',
      icon: 'list-alt',
      color: '#2196F3',
      onPress: () => navigation.navigate('Exams')
    },
    {
      id: '3',
      title: 'Students',
      icon: 'people',
      color: '#FF9800',
      onPress: () => navigation.navigate('Students')
    },
    {
      id: '4',
      title: 'Reports',
      icon: 'analytics',
      color: '#9C27B0',
      onPress: () => navigation.navigate('Reports')
    }
  ];

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
      // Refresh user session
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
        {/* Side Menu and Backdrop */}
        {isMenuOpen && (
          <>
            <TouchableOpacity 
              style={styles.backdrop}
              activeOpacity={1} 
              onPress={() => setIsMenuOpen(false)}
            />
            <Animated.View style={[styles.sideMenu]}>
              <ScrollView style={styles.menuScrollView}>
                <TouchableOpacity 
                  style={styles.menuItem} 
                  onPress={() => {
                    setIsMenuOpen(false);
                    navigation.navigate('Home');
                  }}
                >
                  <Icon name="home" size={22} color="#4267B2" style={styles.menuIcon} />
                  <Text style={styles.menuText}>Home</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.menuItem} 
                  onPress={() => {
                    setIsMenuOpen(false);
                    navigation.navigate('Leaderboard');
                  }}
                >
                  <Icon name="emoji-events" size={22} color="#4267B2" style={styles.menuIcon} />
                  <Text style={styles.menuText}>Leaderboard</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.menuItem} 
                  onPress={() => {
                    setIsMenuOpen(false);
                    navigation.navigate('History');
                  }}
                >
                  <Icon name="history" size={22} color="#4267B2" style={styles.menuIcon} />
                  <Text style={styles.menuText}>History</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.menuItem} 
                  onPress={() => {
                    setIsMenuOpen(false);
                    navigation.navigate('Settings');
                  }}
                >
                  <Icon name="settings" size={22} color="#4267B2" style={styles.menuIcon} />
                  <Text style={styles.menuText}>Settings</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.menuItem, styles.logoutItem]} 
                  onPress={onLogout}
                >
                  <Icon name="logout" size={22} color="#4267B2" style={styles.menuIcon} />
                  <Text style={styles.menuText}>Logout</Text>
                </TouchableOpacity>
              </ScrollView>
            </Animated.View>
          </>
        )}

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
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
            {/* Enhanced Header Section */}
            <View style={[styles.topNav, { backgroundColor: themeColor }]}>
              <TouchableOpacity 
                style={styles.iconButton} 
                onPress={() => setIsMenuOpen(!isMenuOpen)}
              >
                <Icon name={isMenuOpen ? "close" : "menu"} size={24} color="white" />
              </TouchableOpacity>
              
              <Text style={styles.screenTitle}>Admin Dashboard</Text>
              
              <View style={styles.topNavIcons}>
                <TouchableOpacity style={styles.iconButton}>
                  <Icon name="notifications" size={24} color="white" />
                  <View style={styles.notificationBadge} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Enhanced User Profile Section */}
            <View style={[styles.userInfo, { backgroundColor: themeColor }]}>
              <View style={styles.avatarContainer}>
                <Image source={userAvatar} style={styles.userAvatar} />
                <TouchableOpacity 
                  style={styles.cameraIconContainer}
                  onPress={pickImage}
                >
                  <Icon name="camera-alt" size={20} color="white" />
                </TouchableOpacity>
              </View>
              <Text style={styles.goodMorningText}>Hello, {user?.name || 'Admin'}</Text>
              <Text style={styles.userMessage}>Let's manage your exams!</Text>
            </View>

            {/* Main Content */}
            <View style={styles.content}>
              {/* Admin Cards Grid */}
              <View style={styles.adminCardsGrid}>
                {adminCards.map((item) => (
                  <View key={item.id} style={styles.adminCardWrapper}>
                    <TouchableOpacity
                      style={[styles.adminCard, { backgroundColor: item.color }]}
                      onPress={item.onPress}
                      activeOpacity={0.8}
                    >
                      <Icon name={item.icon} size={40} color="#fff" />
                      <Text style={styles.adminCardText}>{item.title}</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>

            {/* Add padding at the bottom */}
            <View style={styles.bottomPadding} />
          </Animated.View>
        </ScrollView>

        {/* Bottom Navigation */}
        <View style={styles.bottomNav}>
          <TouchableOpacity style={styles.navItem}>
            <Icon name="home" size={24} color={themeColor} />
            <Text style={[styles.navText, { color: themeColor }]}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <Icon name="school" size={24} color="#888" />
            <Text style={styles.navText}>Exams</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <Icon name="people" size={24} color="#888" />
            <Text style={styles.navText}>Students</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <Icon name="settings" size={24} color="#888" />
            <Text style={styles.navText}>Settings</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#00e4d0',
  },
  mainContainer: {
    flex: 1,
    position: 'relative',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 5 : 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 10,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    flex: 1,
    textAlign: 'center',
    marginLeft: 32,
  },
  topNavIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    padding: 8,
  },
  notificationBadge: {
    position: 'absolute',
    right: 6,
    top: 6,
    backgroundColor: '#FF3B30',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sideMenu: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: 'white',
    width: '80%',
    bottom: 0,
    zIndex: 20,
  },
  menuScrollView: {
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    paddingBottom: 60,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  menuIcon: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText: {
    marginLeft: 20,
    fontSize: 16,
    color: '#333',
    fontWeight: '400',
  },
  logoutItem: {
    marginTop: 20,
    borderTopWidth: 0.5,
    borderTopColor: '#e0e0e0',
    paddingTop: 20,
    marginBottom: 20,
  },
  userInfo: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingBottom: 30,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 10,
  },
  userAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#ffffff',
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
    borderColor: '#ffffff',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  goodMorningText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  userMessage: {
    fontSize: 16,
    color: '#ffffff',
    opacity: 0.9,
  },
  content: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
    paddingTop: 20,
    paddingHorizontal: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  adminCardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  adminCardWrapper: {
    width: '48%',
    marginBottom: 16,
  },
  adminCard: {
    aspectRatio: 1,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    padding: 20,
  },
  adminCardText: {
    color: '#ffffff',
    marginTop: 15,
    fontWeight: 'bold',
    fontSize: 16,
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  navItem: {
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  navText: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 15,
  },
  bottomPadding: {
    height: 80,
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