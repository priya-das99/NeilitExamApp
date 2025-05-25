import { useNavigation } from '@react-navigation/native';

export const useAuthNavigation = () => {
  const navigation = useNavigation();

  const navigateByRole = (role) => {
    if (role === 'admin') {
      navigation.reset({
        index: 0,
        routes: [{ name: 'AdminDashboard' }],
      });
    } else if (role === 'student') {
      navigation.reset({
        index: 0,
        routes: [{ name: 'StudentStack' }],
      });
    }
  };

  const navigateToLogin = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'CandidateLogin' }],
    });
  };

  const navigateToWelcome = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Welcome' }],
    });
  };

  return {
    navigateByRole,
    navigateToLogin,
    navigateToWelcome
  };
}; 