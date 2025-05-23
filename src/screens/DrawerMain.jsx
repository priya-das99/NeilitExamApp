import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import StudentDashboard from './StudentDashboard';
import { useAppwrite } from '../utils/AppwriteContext';
import { useNavigation } from '@react-navigation/native';


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

const CandidateProfile = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Candidate Profile Screen</Text>
  </View>
);

const Notifications = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Notifications Screen</Text>
  </View>
);

const CandidateHistory = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Candidate History Screen</Text>
  </View>
);

const Setting = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Setting Screen</Text>
  </View>
);

const Chat = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Chat Screen</Text>
  </View>
);

const FAQ = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>FAQ Screen</Text>
  </View>
);

const AppReviews = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>App Reviews Screen</Text>
  </View>
);

const Help = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Help Screen</Text>
  </View>
);

const CandidateLogout = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Candidate Logout Screen</Text>
  </View>
);

const FaceVerificationScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Face Verification Screen</Text>
  </View>
);

const VoiceVerificationScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Face Verification Screen</Text>
  </View>
);

const Drawer = createDrawerNavigator();

const CustomDrawerContent = ({ navigation, themeColor, onThemeColorChange, setShouldLogout }) => {
  const { handleLogout } = useAppwrite();

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
    { name: 'Rank', icon: 'leaderboard', route: 'Rank' },
    { name: 'Result', icon: 'school', route: 'Result' },
    { name: 'Profile', icon: 'person', route: 'CandidateProfile' },
    { name: 'History', icon: 'history', route: 'CandidateHistory' },
    { name: 'Settings', icon: 'settings', route: 'Setting' },
    { name: 'Chat', icon: 'chat', route: 'Chat' },
    { name: 'FAQ', icon: 'help-outline', route: 'FAQ' },
    { name: 'App Reviews', icon: 'star', route: 'AppReviews' },
    { name: 'Notifications', icon: 'notifications', route: 'Notifications' },
    { name: 'Help', icon: 'support', route: 'Help' },
  ];
  return (
    <View style={[styles.drawerContainer, { backgroundColor: themeColor, flex: 1 }]}> 
      <View style={styles.drawerHeader}>
        <Image
          source={require('../../assets/images/user.png')}
          style={styles.drawerAvatar}
          resizeMode="cover"
        />
        <Text style={styles.drawerUserName}>Alex</Text>
        <Text style={styles.drawerUserEmail}>alex@example.com</Text>
      </View>
      <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.drawerItemsContainer}>
          {drawerItems.map((item) => (
            <TouchableOpacity
              key={item.name}
              style={styles.drawerItem}
              onPress={item.route === 'logout' ? handleLogoutPress : () => navigation.navigate(item.route)}
            >
              <Icon name={item.icon} size={24} color="#ffffff" style={styles.drawerIcon} />
              <Text style={styles.drawerItemText}>{item.name}</Text>
            </TouchableOpacity>
          ))}
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
      <Drawer.Screen name="Notifications" component={Notifications} />
      <Drawer.Screen name="CandidateHistory" component={CandidateHistory} />
      <Drawer.Screen name="Setting" component={Setting} />
      <Drawer.Screen name="Chat" component={Chat} />
      <Drawer.Screen name="FAQ" component={FAQ} />
      <Drawer.Screen name="AppReviews" component={AppReviews} />
      <Drawer.Screen name="Help" component={Help} />
      <Drawer.Screen name="CandidateLogout" component={CandidateLogout} />
      <Drawer.Screen name="FaceVerificationScreen" component={FaceVerificationScreen} />
      <Drawer.Screen name="VoiceVerificationScreen" component={VoiceVerificationScreen} />
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
});

export default DrawerMain;