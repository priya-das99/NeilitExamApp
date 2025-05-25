import { useEffect, useState } from 'react';
import { useAppwrite } from '../utils/AppwriteContext';
import { useNavigation } from '@react-navigation/native';

export const useRole = () => {
  const { user } = useAppwrite();
  return user?.preferences?.role || null;
};

export const useRequireRole = (requiredRole) => {
  const navigation = useNavigation();
  const { user, isLoading } = useAppwrite();
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      const userRole = user?.preferences?.role;
      
      if (!userRole) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'CandidateLogin' }],
        });
        return;
      }

      if (userRole !== requiredRole) {
        // Redirect based on actual role
        if (userRole === 'admin') {
          navigation.reset({
            index: 0,
            routes: [{ name: 'AdminDashboard' }],
          });
        } else if (userRole === 'student') {
          navigation.reset({
            index: 0,
            routes: [{ name: 'StudentStack' }],
          });
        }
        return;
      }

      setHasAccess(true);
    }
  }, [user, isLoading, requiredRole, navigation]);

  return hasAccess;
};

export const useAdminRoute = () => {
  return useRequireRole('admin');
};

export const useStudentRoute = () => {
  return useRequireRole('student');
}; 