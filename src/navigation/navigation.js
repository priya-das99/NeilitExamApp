import React, { useEffect, useState } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import CandidateLoginScreen from '../screens/CandidateLoginScreen';
import CandidateSignupScreen from '../screens/CandidateSignupScreen';
import Home from '../screens/Home';
import { getUser } from '../utils/authService';

const Stack = createStackNavigator();

const Navigation = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const user = await getUser();
      setIsAuthenticated(!!user);
    };
    checkUser();
  }, []);

  return (
    <NavigationContainer>
    <Stack.Navigator>
          {isAuthenticated ? (
          <Stack.Screen
            name="Home"
            component={Home}
            // options={{ headerShown: false }}
          />
        ) : (
          <>
            <Stack.Screen
              name="CandidateLoginScreen"
              component={CandidateLoginScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="CandidateSignupScreen"
              component={CandidateSignupScreen}
              options={{ headerShown: false }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
export default Navigation;
