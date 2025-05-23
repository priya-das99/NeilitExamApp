import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

const BottomNavigation = ({ activeTab, onTabChange, themeColor }) => {
  const navigation = useNavigation();

  // Function to handle navigation
  const handleNavigation = (screen) => {
    onTabChange(screen);
    
    // In a real app with actual screens, you would navigate to them
    if (screen !== 'Home') {
      // This is a placeholder - in a real app you would navigate to the actual screen
      console.log(`Navigating to ${screen}`);
      // navigation.navigate(screen);
    }
  };

  return (
    <View style={styles.bottomNav}>
      <TouchableOpacity 
        style={[styles.navItem, activeTab === 'Home' && styles.activeNavItem]} 
        onPress={() => handleNavigation('Home')}
      >
        <Text style={styles.navIcon}>🏠</Text>
        <Text style={[
          styles.navText, 
          activeTab === 'Home' && [styles.activeNavText, { color: themeColor }]
        ]}>Home</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.navItem, activeTab === 'Leaderboard' && styles.activeNavItem]} 
        onPress={() => handleNavigation('Leaderboard')}
      >
        <Text style={styles.navIcon}>🏆</Text>
        <Text style={[
          styles.navText, 
          activeTab === 'Leaderboard' && [styles.activeNavText, { color: themeColor }]
        ]}>Leaderboard</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.navItem, activeTab === 'History' && styles.activeNavItem]} 
        onPress={() => handleNavigation('History')}
      >
        <Text style={styles.navIcon}>⏱️</Text>
        <Text style={[
          styles.navText, 
          activeTab === 'History' && [styles.activeNavText, { color: themeColor }]
        ]}>History</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.navItem, activeTab === 'Profile' && styles.activeNavItem]} 
        onPress={() => handleNavigation('Profile')}
      >
        <Text style={styles.navIcon}>👤</Text>
        <Text style={[
          styles.navText, 
          activeTab === 'Profile' && [styles.activeNavText, { color: themeColor }]
        ]}>Profile</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  activeNavItem: {
    borderTopWidth: 2,
  },
  navIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  navText: {
    fontSize: 12,
    color: '#999',
  },
  activeNavText: {
    fontWeight: 'bold',
  },
});

export default BottomNavigation;
