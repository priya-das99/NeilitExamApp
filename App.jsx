import 'react-native-gesture-handler';
import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { View, ActivityIndicator, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { AppwriteProvider, AppwriteContext } from './src/utils/AppwriteContext';

// Screen imports
import SplashScreen from './src/screens/SplashScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';
import CandidateLoginScreen from './src/screens/CandidateLoginScreen';
import Home from './src/screens/Home';
import GetStarted from './src/screens/GetStarted';
import CandidateOtpVerification from './src/screens/CandidateOtpVerification';
import ControllerLogin from './src/screens/ControllerLoginScreen';
import ForgotPassword from './src/screens/ForgotPasswordScreen';
import CandidateSignup from './src/screens/CandidateSignupScreen';
import NextScreen from './src/screens/nextscreen';
import LanguageScreen from './src/screens/LanguageScreen';
import StudentDashboard from './src/screens/StudentDashboard';
import AdminDashboard from './src/screens/AdminDashboard';
import CreateExam from './src/screens/CreateExam';
import ManageExams from './src/screens/ManageExams';
import ManageStudents from './src/screens/ManageStudents';
import ResultsAnalytics from './src/screens/ResultsAnalytics';
import AdminProfile from './src/screens/AdminProfile';
import ExamAttemptScreen from './src/screens/ExamAttemptScreen';
import AssignExam from './src/screens/AssignExam';
import ManageQuestions from './src/screens/ManageQuestions';
import EditExam from './src/screens/EditExam';
import DrawerMain from './src/screens/DrawerMain';

const Stack = createStackNavigator();

// Fixed Header Component (handles undefined `name`)
const Header = ({ name = '' }) => {
  return (
    <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#000' }}>
      {name}
    </Text>
  );
};

// Updated `headerOptions` with safe props handling
const headerOptions = {
  headerTitle: (props) => {
    if (!props) return null; // Fallback if props is undefined
    const children = props.children || '';
    return <Header name={children} />;
  },
  headerRight: () => (
    <View style={{ marginRight: 15 }}>
      <MaterialCommunityIcons name="dots-vertical" size={28} color="#000" />
    </View>
  ),
  headerStyle: {
    height: 150,
    borderBottomLeftRadius: 50,
    backgroundColor: '#00e4d0',
    shadowColor: '#000',
    elevation: 25,
  },
  headerTitleAlign: 'center',
};

// AuthStack screens configuration
const authScreens = [
  { name: "Splash", component: SplashScreen },
  { name: "Welcome", component: WelcomeScreen },
  { name: "Language", component: LanguageScreen },
  { name: "GetStarted", component: GetStarted },
  { name: "CandidateLogin", component: CandidateLoginScreen },
  { name: "CandidateSignup", component: CandidateSignup },
  { name: "CandidateOtpVerification", component: CandidateOtpVerification },
  { name: "ForgotPassword", component: ForgotPassword },
  { name: "ControllerLogin", component: ControllerLogin }
];

const AdminStackScreens = () => (
  <Stack.Screen
    name="AdminDashboard"
    component={AdminDashboard}
    options={{ headerShown: false }}
  />
);

const StudentStack = createStackNavigator();

const StudentStackNavigator = () => (
  <StudentStack.Navigator screenOptions={{ headerShown: false }}>
    <StudentStack.Screen name="DrawerMain" component={DrawerMain} />
    <StudentStack.Screen name="UpcomingExams" component={require('./src/screens/UpcomingExams').default} />
    <StudentStack.Screen name="CandidateProfile" component={require('./src/screens/CandidateProfile').default} />
  </StudentStack.Navigator>
);

const AuthStackScreens = () => (
  <>
    <Stack.Screen
      name="Splash"
      component={SplashScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="Welcome"
      component={WelcomeScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="Language"
      component={LanguageScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="GetStarted"
      component={GetStarted}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="CandidateLogin"
      component={CandidateLoginScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="CandidateSignup"
      component={CandidateSignup}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="CandidateOtpVerification"
      component={CandidateOtpVerification}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="ForgotPassword"
      component={ForgotPassword}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="ControllerLogin"
      component={ControllerLogin}
      options={{ headerShown: false }}
    />
  </>
);

const defaultQuestion = {
  text: '',
  options: [
    { text: '', image: null },
    { text: '', image: null },
    { text: '', image: null },
    { text: '', image: null }
  ],
  correctAnswers: [],
  image: null,
  type: 'mcq',
  marks: 1,
  difficulty: 'easy',
  tags: ''
};

const defaultExamData = {
  title: '',
  description: '',
  duration: '',
  totalMarks: '',
  passingMarks: '',
  status: 'scheduled',
};

const AppNavigator = () => {
  const { isLoading, user } = useContext(AppwriteContext);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Safely get role with optional chaining
  const userRole = user?.preferences?.role;
  
  // For initial screen determination
  let initialScreen = "CandidateLogin";
  if (user) {
    if (userRole === 'admin') initialScreen = "AdminDashboard";
    else if (userRole === 'student') initialScreen = "StudentStack";
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false
      }}
      initialRouteName={initialScreen}
    >
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Language" component={LanguageScreen} />
      <Stack.Screen name="GetStarted" component={GetStarted} />
      <Stack.Screen name="CandidateLogin" component={CandidateLoginScreen} />
      <Stack.Screen name="CandidateSignup" component={CandidateSignup} />
      <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
      <Stack.Screen name="StudentStack" component={StudentStackNavigator} />
      <Stack.Screen name="ExamAttemptScreen" component={ExamAttemptScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ManageQuestions" component={ManageQuestions} />
      <Stack.Screen name="CreateExam" component={CreateExam} />
      <Stack.Screen name="ManageExams" component={ManageExams} />
      <Stack.Screen name="EditExam" component={EditExam} />
      <Stack.Screen name="ManageStudents" component={ManageStudents} />
      <Stack.Screen name="ResultsAnalytics" component={ResultsAnalytics} />
      <Stack.Screen name="AdminProfile" component={AdminProfile} />
    </Stack.Navigator>
  );
};

const App = () => {
  return (
    <AppwriteProvider>
      <SafeAreaProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </AppwriteProvider>
  );
};

export default App;