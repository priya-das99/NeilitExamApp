import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  TextInput,
  Modal,
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
import { logout } from '../utils/authService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Fallback images
const defaultBanner = require('../../assets/images/getbg.jpg');
const defaultLogo = require('../../assets/images/exam.jpg');
const defaultUserAvatar = require('../../assets/images/exam.jpg');

const Home = () => {
  const navigation = useNavigation();
  const [showExamForm, setShowExamForm] = useState(false);
  const [questions, setQuestions] = useState([{ text: '', options: ['', '', '', ''], correctAnswer: '' }]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isThemePickerVisible, setIsThemePickerVisible] = useState(false);
   const [themeColor, setThemeColor] = useState('#00e4d0');
  const [userAvatar, setUserAvatar] = useState(defaultUserAvatar);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  // Load saved profile picture on component mount
  useEffect(() => {
    const loadSavedProfilePicture = async () => {
      try {
        const savedAvatarUri = await AsyncStorage.getItem('userProfilePicture');
        if (savedAvatarUri) {
          setUserAvatar({ uri: savedAvatarUri });
        }
      } catch (error) {
        console.error('Error loading profile picture:', error);
      }
    };

    loadSavedProfilePicture();
  }, []);

  // Admin cards data
  const adminCards = [
    {
      id: '1',
      title: 'Create Exam',
      icon: require('../../assets/images/createexam.png'),
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

  const handleLogout = async () => {
    try {
      await logout();
      // Close the menu
      setIsMenuOpen(false);
      // Navigate to login screen
      navigation.replace('CandidateLogin');
    } catch (error) {
      console.error('Logout Error:', error);
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  const pickImage = async () => {
    try {
      // Android permission handling
      if (Platform.OS === 'android') {
        let granted;
        
        // For Android 13+ (API level 33+)
        if (Platform.Version >= 33) {
          const permissions = [
            PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
            PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO
          ];

          granted = await PermissionsAndroid.requestMultiple(permissions);
          
          if (
            granted['android.permission.READ_MEDIA_IMAGES'] !== PermissionsAndroid.RESULTS.GRANTED ||
            granted['android.permission.READ_MEDIA_VIDEO'] !== PermissionsAndroid.RESULTS.GRANTED
          ) {
            Alert.alert(
              'Permission Required',
              'Please grant access to your media to update your profile picture.',
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: 'Open Settings', 
                  onPress: () => {
                    Linking.openSettings();
                    return;
                  }
                }
              ]
            );
            return;
          }
        } else {
          // For Android 12 and below
          granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
            {
              title: 'Gallery Permission',
              message: 'This app needs access to your gallery to update your profile picture.',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            }
          );

          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            Alert.alert(
              'Permission Required',
              'Please grant access to your gallery to update your profile picture.',
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: 'Open Settings', 
                  onPress: () => {
                    Linking.openSettings();
                    return;
                  }
                }
              ]
            );
            return;
          }
        }
      }

      // Launch image picker
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 1,
        selectionLimit: 1,
      });

      if (result.didCancel) {
        console.log('User cancelled image picker');
      } else if (result.error) {
        Alert.alert('Error', 'An error occurred while picking the image');
        console.log('ImagePicker Error: ', result.error);
      } else if (result.assets && result.assets[0].uri) {
        // Save the new profile picture URI
        try {
          await AsyncStorage.setItem('userProfilePicture', result.assets[0].uri);
          setUserAvatar({ uri: result.assets[0].uri });
        } catch (error) {
          console.error('Error saving profile picture:', error);
          Alert.alert('Error', 'Failed to save profile picture');
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert(
        'Error',
        'Failed to access gallery. Please check your permissions and try again.'
      );
    }
  };

  const addQuestion = () => {
    setQuestions([...questions, { text: '', options: ['', '', '', ''], correctAnswer: '' }]);
  };

  const handleSubmit = () => {
    setShowExamForm(false);
    // Handle form submission
  };

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  }, []);

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

  // Theme color options
  const colorOptions = [
    { color: '#00e4d0', label: 'Teal' },
    { color: '#003399', label: 'Blue' },
    { color: '#1E88E5', label: 'Light Blue' },
    { color: '#28a745', label: 'Green' },
    { color: '#dc3545', label: 'Red' },
    { color: '#6200EA', label: 'Purple' }
  ];

  const renderAdminCard = ({ item }) => (
    <TouchableOpacity
      style={[styles.adminCard, { backgroundColor: item.color }]}
      onPress={item.onPress}
      activeOpacity={0.8}
    >
      {typeof item.icon === 'string' ? (
        <Icon name={item.icon} size={40} color="#fff" />
      ) : (
        <Image source={item.icon} style={styles.cardIcon} />
      )}
      <Text style={styles.adminCardText}>{item.title}</Text>
    </TouchableOpacity>
  );

  // Add this useEffect to hide the default header
  React.useEffect(() => {
    navigation.setOptions({
      headerShown: false
    });
  }, [navigation]);

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
                  <Text style={styles.menuText}>Setting</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.menuItem} 
                  onPress={() => {
                    setIsMenuOpen(false);
                    navigation.navigate('Chat');
                  }}
                >
                  <Icon name="chat" size={22} color="#4267B2" style={styles.menuIcon} />
                  <Text style={styles.menuText}>Chat</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.menuItem} 
                  onPress={() => {
                    setIsMenuOpen(false);
                    navigation.navigate('FAQ');
                  }}
                >
                  <Icon name="help" size={22} color="#4267B2" style={styles.menuIcon} />
                  <Text style={styles.menuText}>FAQ</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.menuItem} 
                  onPress={() => {
                    setIsMenuOpen(false);
                    navigation.navigate('Reviews');
                  }}
                >
                  <Icon name="star" size={22} color="#4267B2" style={styles.menuIcon} />
                  <Text style={styles.menuText}>Reviews</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.menuItem} 
                  onPress={() => {
                    setIsMenuOpen(false);
                    navigation.navigate('Notifications');
                  }}
                >
                  <Icon name="notifications" size={22} color="#4267B2" style={styles.menuIcon} />
                  <Text style={styles.menuText}>Notification</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.menuItem} 
                  onPress={() => {
                    setIsMenuOpen(false);
                    navigation.navigate('Profile');
                  }}
                >
                  <Icon name="person" size={22} color="#4267B2" style={styles.menuIcon} />
                  <Text style={styles.menuText}>Profile</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.menuItem} 
                  onPress={() => {
                    setIsMenuOpen(false);
                    navigation.navigate('Help');
                  }}
                >
                  <Icon name="help-center" size={22} color="#4267B2" style={styles.menuIcon} />
                  <Text style={styles.menuText}>Help</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.menuItem, styles.logoutItem]} 
                  onPress={handleLogout}
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
              {/* Navigation Menu Icon (Left) */}
              <TouchableOpacity 
                style={styles.iconButton} 
                onPress={() => setIsMenuOpen(!isMenuOpen)}
              >
                <Icon name={isMenuOpen ? "close" : "menu"} size={24} color="white" />
              </TouchableOpacity>
              
              {/* Screen Title */}
              <Text style={styles.screenTitle}>Admin Dashboard</Text>
              
              {/* Right Icons */}
              <View style={styles.topNavIcons}>
                <TouchableOpacity 
                  style={styles.iconButton}
                  onPress={() => setIsThemePickerVisible(true)}
                >
                  <Icon name="palette" size={24} color="white" />
                </TouchableOpacity>
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
              <Text style={styles.goodMorningText}>Hello, Admin</Text>
              <Text style={styles.userMessage}>Let's manage your exams!</Text>
            </View>

            {/* Main Content */}
            <View style={styles.content}>
              {/* Admin Cards Grid */}
              <View style={styles.adminCardsGrid}>
                {adminCards.map((item) => (
                  <View key={item.id} style={styles.adminCardWrapper}>
                    {renderAdminCard({ item })}
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

        {/* Create Exam Modal */}
        <Modal visible={showExamForm} animationType="slide">
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowExamForm(false)}>
                <Icon name="arrow-back" size={24} color="#000" />
              </TouchableOpacity>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={styles.modalTitle}>Create New Exam</Text>
              </View>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView
              style={styles.modalScrollView}
              contentContainerStyle={styles.modalScrollContent}
            >
              <TextInput style={styles.input} placeholder="Exam ID" />
              <TextInput style={styles.input} placeholder="Course Name" />
              <TextInput style={styles.input} placeholder="Subject Name" />
              
              {questions.map((question, index) => (
                <View key={index} style={styles.questionContainer}>
                  <Text style={styles.questionLabel}>Question {index + 1}</Text>
                  <TextInput 
                    style={styles.input} 
                    placeholder={`Question ${index + 1}`} 
                  />
                  {['A', 'B', 'C', 'D'].map((option, i) => (
                    <TextInput
                      key={i}
                      style={styles.input}
                      placeholder={`Option ${option}`}
                    />
                  ))}
                  <TextInput 
                    style={styles.input} 
                    placeholder="Correct Answer (A/B/C/D)" 
                  />
                </View>
              ))}
            </ScrollView>

            <View style={styles.buttonRow}>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={() => setShowExamForm(false)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.submitButton, { backgroundColor: themeColor }]} 
                onPress={handleSubmit}
              >
                <Text style={styles.buttonText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Theme Picker Modal */}
        <Modal
          visible={isThemePickerVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsThemePickerVisible(false)}
        >
          <View style={styles.themeModalContainer}>
            <View style={styles.themeModalContent}>
              <Text style={styles.modalTitle}>Choose Theme Color</Text>
              <View style={styles.colorPicker}>
                {colorOptions.map((option) => (
                  <TouchableOpacity
                    key={option.color}
                    style={[styles.colorOption, { backgroundColor: option.color }]}
                    onPress={() => {
                      setThemeColor(option.color);
                      setIsThemePickerVisible(false);
                    }}
                  />
                ))}
              </View>
              <TouchableOpacity
                style={[styles.modalCloseButton, { backgroundColor: themeColor }]}
                onPress={() => setIsThemePickerVisible(false)}
              >
                <Text style={styles.modalCloseText}>Close</Text>
              </TouchableOpacity>
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
    marginLeft: 32, // Add offset to center the title accounting for the menu icon
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
    paddingBottom: 60, // Height of bottom navigation
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
  // User Info
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
  // Content
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
  // Admin Cards
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
  // Bottom Navigation
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
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalScrollView: {
    flex: 1,
  },
  modalScrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
  },
  optionInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    marginLeft: 20,
  },
  questionContainer: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 15,
  },
  questionLabel: {
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  cancelButton: {
    backgroundColor: '#f44336',
    padding: 15,
    borderRadius: 8,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  submitButton: {
    padding: 15,
    borderRadius: 8,
    flex: 1,
    marginLeft: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  // Theme Picker Modal
  themeModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  themeModalContent: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  colorPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginVertical: 20,
  },
  colorOption: {
    width: 50,
    height: 50,
    borderRadius: 25,
    margin: 8,
    elevation: 3,
  },
  modalCloseButton: {
    padding: 12,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  modalCloseText: {
    color: '#fff',
    fontWeight: 'bold',
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
  cardIcon: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
  },
  bottomPadding: {
    height: 80, // Add padding at the bottom to account for the bottom navigation
  },
});

export default Home;