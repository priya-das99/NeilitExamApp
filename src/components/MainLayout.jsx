import React from 'react';
import { SafeAreaView, View, StyleSheet } from 'react-native';
import BottomNavBar from './BottomNavBar';

export default function MainLayout({ children }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>{children}</View>
      <BottomNavBar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
  },
}); 