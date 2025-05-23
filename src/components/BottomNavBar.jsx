import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation, useRoute } from '@react-navigation/native';

const navItems = [
  { name: 'home', label: 'Home', route: 'DrawerMain' },
  { name: 'school', label: 'Result', route: 'Result' },
  { name: 'person', label: 'Profile', route: 'CandidateProfile' },
];

export default function BottomNavBar() {
  const navigation = useNavigation();
  const route = useRoute();

  return (
    <View style={styles.bottomNav}>
      {navItems.map((item) => {
        const isActive = route.name === item.route;
        return (
          <TouchableOpacity
            key={item.route}
            style={styles.navItem}
            onPress={() => navigation.navigate(item.route)}
          >
            <Icon
              name={item.name}
              size={28}
              color={isActive ? '#003399' : '#666666'}
            />
            <Text style={[styles.navText, { color: isActive ? '#003399' : '#666666' }]}> 
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
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