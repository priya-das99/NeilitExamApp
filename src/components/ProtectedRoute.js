import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useAppwrite } from '../utils/AppwriteContext';
import { useNavigation } from '@react-navigation/native';

const ProtectedRoute = ({ children, requiredRole }) => {
  const { isLoggedIn, user, isLoading } = useAppwrite();
  const navigation = useNavigation();

  React.useEffect(() => {
    if (!isLoading) {
      if (!isLoggedIn) {
        // Not logged in, redirect to login
        navigation.navigate('CandidateLogin');
      } else if (user?.preferences?.role !== requiredRole) {
        // Logged in but wrong role, redirect to appropriate dashboard
        if (user?.preferences?.role === 'admin') {
          navigation.navigate('AdminDashboard');
        } else if (user?.preferences?.role === 'student') {
          navigation.navigate('DrawerMain');
        } else {
          // Fallback if no valid role
          navigation.navigate('CandidateLogin');
        }
      }
    }
  }, [isLoggedIn, user, isLoading, requiredRole, navigation]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#00e4d0" />
      </View>
    );
  }

  if (!isLoggedIn || user?.preferences?.role !== requiredRole) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="small" color="#00e4d0" />
      </View>
    );
  }

  // Make sure children is valid before rendering
  if (!children) {
    console.error('No valid children provided to ProtectedRoute');
    return null;
  }

  return <>{children}</>;
};

export default ProtectedRoute; 