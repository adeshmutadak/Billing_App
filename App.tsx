import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LandingScreen from './android/app/src/Screens/Common/LandingScreen';
import LoginScreen from './android/app/src/Screens/Auth/Login';
import CustomerScreen from './android/app/src/Screens/Customer/CustomerHomeScreen';
import AddCustomerScreen from './android/app/src/Screens/Customer/AddCustomerScreen';
const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Landing">
        <Stack.Screen name="Landing" component={LandingScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Customer" component={CustomerScreen} options={{ headerShown: false }} />
          <Stack.Screen name="AddCustomerScreen" component={AddCustomerScreen} options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
