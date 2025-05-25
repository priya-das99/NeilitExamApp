import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import StudentDashboard from './StudentDashboard';
import CandidateHistory from './CandidateHistory';
import CandidateProfile from './CandidateProfile';
import { useAppwrite } from '../utils/AppwriteContext';
import { useNavigation } from '@react-navigation/native';
import { databases, appwriteConfig } from '../utils/appwriteConfig';
import { Query } from 'appwrite';

// Placeholder screens
const Rank = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Rank Screen</Text>
  </View>
);

const Result = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Result Screen</Text>
  </View>
);

const Drawer = createDrawerNavigator();

const CustomDrawerContent = ({ navigation, themeColor, onThemeColorChange, setShouldLogout }) => {
  const { handleLogout, user } = useAppwrite();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudent = async () => {
      if (!user || !user.email) return;
      try {
        const res = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.studentsCollectionId,
          [
            // Query student by email
            Query.equal('email', user.email)
          ]
        );
        if (res.documents.length > 0) {
          setStudent(res.documents[0]);
        }
      } catch (err) {
        setStudent(null);
      } finally {
        setLoading(false);
      }
    };
    fetchStudent();
  }, [user]);

  const doLogout = async () => {
    try {
      await handleLogout();
    } catch (error) {
      Alert.alert('Logout Failed', error.message || 'Failed to logout.');
    } finally {
      setShouldLogout(true);
    }
  };

  const handleLogoutPress = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: doLogout,
        },
      ]
    );
  };

  const drawerItems = [
    { name: 'Home', icon: 'home', route: 'DrawerMain' },
    { name: 'History', icon: 'history', route: 'CandidateHistory' },
    { name: 'Result', icon: 'school', route: 'Result' },
    { name: 'Profile', icon: 'person', route: 'CandidateProfile' },
  ];

  return (
    <View style={[styles.drawerContainer, { backgroundColor: themeColor, flex: 1 }]}> 
      <View style={styles.drawerHeader}>
        <Image
          source={
            student && student.profileImage
              ? { uri: student.profileImage }
              : require('../../assets/images/user.png')
          }
          style={styles.drawerAvatar}
          resizeMode="cover"
        />
        <Text style={styles.drawerUserName}>
          {loading ? 'Loading...' : student?.name || 'Student'}
        </Text>
        <Text style={styles.drawerUserEmail}>
          {loading ? '' : student?.email || ''}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.drawerItemsContainer}>
          {drawerItems.map((item) => (
            <TouchableOpacity
              key={item.name}
              style={styles.drawerItem}
              onPress={() => navigation.navigate(item.route)}
            >
              <Icon name={item.icon} size={24} color="#ffffff" style={styles.drawerIcon} />
              <Text style={styles.drawerItemText}>{item.name}</Text>
            </TouchableOpacity>
          ))}
          
          <View style={styles.divider} />
          
          <TouchableOpacity
            style={[styles.drawerItem, styles.logoutItem]}
            onPress={handleLogoutPress}
          >
            <Icon name="logout" size={24} color="#ffffff" style={styles.drawerIcon} />
            <Text style={styles.drawerItemText}>Logout</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </View>
  );
};

const DrawerMain = () => {
  const [themeColor, setThemeColor] = useState('#003399');
  const [shouldLogout, setShouldLogout] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    if (shouldLogout) {
      navigation.reset({ index: 0, routes: [{ name: 'CandidateLogin' }] });
      setShouldLogout(false);
    }
  }, [shouldLogout, navigation]);

  useEffect(() => {
    const loadThemeColor = async () => {
      try {
        const savedColor = await AsyncStorage.getItem('themeColor');
        if (savedColor) {
          setThemeColor(savedColor);
        }
      } catch (error) {
        console.error('Failed to load theme color:', error);
      }
    };
    loadThemeColor();
  }, []);

  const handleThemeColorChange = async (color) => {
    setThemeColor(color);
    try {
      await AsyncStorage.setItem('themeColor', color);
    } catch (error) {
      console.error('Failed to save theme color:', error);
    }
  };

  return (
    <Drawer.Navigator
      drawerContent={(props) => (
        <CustomDrawerContent
          {...props}
          themeColor={themeColor}
          onThemeColorChange={handleThemeColorChange}
          setShouldLogout={setShouldLogout}
        />
      )}
      screenOptions={{
        headerShown: false,
        drawerStyle: { width: 280, backgroundColor: '#ffffff' },
        drawerActiveTintColor: themeColor,
      }}
    >
      <Drawer.Screen name="DrawerMain">
        {(props) => (
          <StudentDashboard
            {...props}
            themeColor={themeColor}
            onThemeColorChange={handleThemeColorChange}
          />
        )}
      </Drawer.Screen>
      <Drawer.Screen name="Rank" component={Rank} />
      <Drawer.Screen name="Result" component={Result} />
      <Drawer.Screen name="CandidateProfile" component={CandidateProfile} />
      <Drawer.Screen name="CandidateHistory" component={CandidateHistory} />
    </Drawer.Navigator>
  );
};

const styles = StyleSheet.create({
  drawerContainer: {
    flex: 1,
  },
  drawerHeader: {
    padding: 20,
    paddingTop: 40,
    alignItems: 'center',
  },
  drawerAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  drawerUserName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 5,
  },
  drawerUserEmail: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.8,
  },
  drawerItemsContainer: {
    paddingHorizontal: 10,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 5,
  },
  drawerIcon: {
    marginRight: 15,
  },
  drawerItemText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginVertical: 15,
    marginHorizontal: 10,
  },
  logoutItem: {
    marginTop: 10,
  },
});

export default DrawerMain;