import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAppwrite } from '../utils/AppwriteContext';

const AdminSidebar = ({ isVisible, onClose }) => {
  const navigation = useNavigation();
  const { handleLogout } = useAppwrite();

  const menuItems = [
    { title: 'Dashboard', icon: 'dashboard', screen: 'AdminDashboard', color: '#00e4d0' },
    { title: 'Create Exam', icon: 'add-circle', screen: 'CreateExam', color: '#4CAF50' },
    { title: 'Manage Exams', icon: 'edit', screen: 'ManageExams', color: '#2196F3' },
    { title: 'Manage Questions', icon: 'help', screen: 'ManageQuestions', color: '#FF5722' },
    { title: 'Manage Students', icon: 'people', screen: 'ManageStudents', color: '#FF9800' },
    { title: 'Results Analytics', icon: 'analytics', screen: 'ResultsAnalytics', color: '#9C27B0' },
    { title: 'Profile', icon: 'person', screen: 'AdminProfile', color: '#E91E63' },
  ];

  const handleLogoutPress = async () => {
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

  if (!isVisible) return null;

  return (
    <View style={styles.sidebarContainer}>
      <View style={styles.sidebar}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        <View style={styles.profileSection}>
          <Image
            source={require('../../assets/images/createexam.png')}
            style={styles.avatar}
          />
          <Text style={styles.name}>Admin User</Text>
          <Text style={styles.email}>admin@example.com</Text>
        </View>

        <ScrollView style={styles.menuContainer}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={() => {
                navigation.navigate(item.screen);
                onClose();
              }}
            >
              <Icon name={item.icon} size={24} color={item.color} />
              <Text style={styles.menuText}>{item.title}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogoutPress}>
          <Icon name="logout" size={24} color="#FF5252" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sidebarContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
    elevation: 1000,
  },
  sidebar: {
    width: 280,
    backgroundColor: '#fff',
    height: '100%',
    paddingTop: 20,
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  closeButton: {
    padding: 8,
  },
  profileSection: {
    alignItems: 'center',
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    marginBottom: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 10,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  email: {
    fontSize: 14,
    color: '#666',
  },
  menuContainer: {
    flex: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 15,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  logoutText: {
    fontSize: 16,
    color: '#FF5252',
    marginLeft: 15,
  },
});

export default AdminSidebar; 