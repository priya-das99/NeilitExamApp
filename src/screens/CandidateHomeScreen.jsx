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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import ColorPickerModal from '../app_drawer/ColorPickerModal';

// Fallback dummy exam data
const fallbackExams = [
  { 
    id: '1', 
    title: 'GATE 2025', 
    description: 'Graduate Aptitude Test in Engineering', 
    logo: require('../../../assets/images/gate.png'), 
    banner: require('../../../assets/images/getbg.jpg'), 
    isLive: true 
  },
  { 
    id: '2', 
    title: 'JEE Main 2024', 
    description: 'Joint Entrance Examination', 
    logo: require('../../../assets/images/jee.png'), 
    banner: require('../../../assets/images/jee-banner.jpg'), 
    isLive: false 
  },
];

const CandidateHomeScreen = ({ themeColor = '#003399', onThemeColorChange }) => {
  const navigation = useNavigation();
  const [exams, setExams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedColor, setSelectedColor] = useState(themeColor);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  const fetchExams = useCallback(async () => {
    try {
      setErrorMessage(null);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setExams(fallbackExams);
    } catch (error) {
      setErrorMessage('Failed to fetch exams. Using fallback data.');
      setExams(fallbackExams);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

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

  const handleColorSelect = useCallback((color) => {
    setSelectedColor(color);
    if (onThemeColorChange) {
      onThemeColorChange(color);
    }
    setShowColorPicker(false);
  }, [onThemeColorChange]);

  const handleExamClick = useCallback((exam) => {
    if (exam.isLive) {
      Alert.alert(
        'Exam Rules',
        'You\'re about to enter a live exam. By proceeding, you accept the exam rules and guidelines. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Agree', onPress: () => navigation.navigate('FaceVerificationScreen', { exam }) },
        ]
      );
    }
  }, [navigation]);

  const renderExamCard = useCallback(({ item }) => {
    const buttonColor = item.isLive ? selectedColor : '#cccccc';
    const badgeColor = item.isLive ? '#28a745' : '#dc3545';
    const badgeText = item.isLive ? 'Live' : 'Inactive';

    return (
      <View style={[styles.examCard, styles.shadow]}>
        <Image source={item.banner} style={styles.examBanner} resizeMode="cover" />
        <View style={styles.examContent}>
          <Image source={item.logo} style={styles.examLogo} resizeMode="contain" />
          <Text style={styles.examTitle}>{item.title}</Text>
          <Text style={styles.examDescription}>{item.description}</Text>
          <View style={[styles.liveBadge, { backgroundColor: badgeColor }]}>
            <Text style={styles.liveText}>{badgeText}</Text>
          </View>
          <TouchableOpacity
            style={[styles.goToExamButton, { backgroundColor: buttonColor }]}
            disabled={!item.isLive}
            onPress={() => handleExamClick(item)}
          >
            <Text style={styles.goToExamText}>Go to Exam</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [selectedColor, handleExamClick]);

  const bottomNavRoutes = [
    { name: 'home', label: 'Home', route: 'CandidateHomeScreen', isActive: true },
    { name: 'leaderboard', label: 'Rank', route: 'Rank', isActive: false },
    { name: 'school', label: 'Result', route: 'Result', isActive: false },
    { name: 'person', label: 'Profile', route: 'CandidateProfile', isActive: false },
  ];

  // Check if openDrawer is available, otherwise show a fallback action
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

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: selectedColor }]}>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor={selectedColor} 
        translucent={true}
      />
      <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <View style={[styles.topNav, { backgroundColor: selectedColor }]}>
          <TouchableOpacity 
            onPress={handleOpenDrawer}
            style={styles.iconButton}
          >
            <Icon name="menu" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.screenTitle}>Home</Text>
          <View style={styles.topNavIcons}>
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
              source={require('../../../assets/images/user.png')} 
              style={styles.userAvatar} 
              resizeMode="cover" 
            />
            <Text style={styles.goodMorningText}>Good morning, Alex</Text>
            <Text style={styles.userMessage}>Let's Workout to Get Some Gains!</Text>
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
                {exams.map((exam) => (
                  <View key={exam.id} style={styles.examCardWrapper}>
                    {renderExamCard({ item: exam })}
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
        
        <View style={styles.bottomNav}>
          {bottomNavRoutes.map((navItem) => (
            <TouchableOpacity
              key={navItem.route}
              style={styles.navItem}
              onPress={() => navigation.navigate(navItem.route)}
            >
              <Icon 
                name={navItem.name} 
                size={28} 
                color={navItem.isActive ? selectedColor : '#666666'} 
              />
              <Text style={[styles.navText, { color: navItem.isActive ? selectedColor : '#666666' }]}>
                {navItem.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>

      <ColorPickerModal
        visible={showColorPicker}
        onClose={() => setShowColorPicker(false)}
        onSelectColor={handleColorSelect}
        currentColor={selectedColor}
      />
    </SafeAreaView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop: 40,
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
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 15,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  examBanner: {
    width: '100%',
    height: 120,
  },
  examContent: {
    padding: 15,
  },
  examLogo: {
    width: 50,
    height: 50,
    marginBottom: 12,
  },
  examTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
  },
  examDescription: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 12,
  },
  liveBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 15,
    marginBottom: 12,
  },
  liveText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  goToExamButton: {
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  goToExamText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 15,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  navItem: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  navText: {
    fontSize: 14,
    marginTop: 4,
    fontWeight: '600',
  },
});

export default CandidateHomeScreen;