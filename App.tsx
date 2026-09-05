import * as React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ToastProvider } from './android/app/src/components/Toast';
import { COLORS } from './android/app/src/utils/theme';
import LandingScreen from './android/app/src/Screens/Common/LandingScreen';
import LoginScreen from './android/app/src/Screens/Auth/Login';
import CustomerScreen from './android/app/src/Screens/Customer/CustomerHomeScreen';
import AddCustomerScreen from './android/app/src/Screens/Customer/AddCustomerScreen';
import CustomerDetails from './android/app/src/Screens/Customer/CustomerDetails';
import GenerateBill from './android/app/src/Screens/Customer/GenerateBill';
import HistoryScreen from './android/app/src/Screens/History/HistoryScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    // SafeAreaProvider was already a dependency but unused, so content could sit
    // under the status bar and the gesture area on newer devices.
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <SafeAreaView
        style={{ flex: 1, backgroundColor: COLORS.background }}
        edges={['top']}
      >
        {/* One feedback surface for the whole app. */}
        <ToastProvider>
          <NavigationContainer>
            <Stack.Navigator
              initialRouteName="Landing"
              screenOptions={{ headerShown: false }}
            >
              <Stack.Screen name="Landing" component={LandingScreen} />
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Customer" component={CustomerScreen} />
              <Stack.Screen name="AddCustomerScreen" component={AddCustomerScreen} />
              <Stack.Screen name="CustomerDetails" component={CustomerDetails} />
              <Stack.Screen name="GenerateBill" component={GenerateBill} />
              <Stack.Screen name="History" component={HistoryScreen} />
            </Stack.Navigator>
          </NavigationContainer>
        </ToastProvider>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
