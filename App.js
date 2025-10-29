/**
 * Main App Component for B2B Clothing Mobile Application
 *
 * This is the root component that handles:
 * - Push notification registration and handling
 * - Authentication state management
 * - Navigation between different app sections (Auth, Onboarding, Main App)
 * - User profile validation and routing
 * - Loading states during authentication checks
 */

import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Button, Platform, ActivityIndicator } from 'react-native';
import { NavigationContainer, getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect, useState, useRef } from 'react';
import { supabase } from './src/lib/supabaseClient';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { styles } from './src/theme/styles';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

// Screen imports for different app sections
import LoginScreen from './src/screens/LoginScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';
import SignupScreen from './src/screens/SignupScreen';
import AppTabs from './src/navigation/AppTabs';
import ItemDetailScreen from './src/screens/ItemDetailScreen';
import BasketScreen from './src/screens/BasketScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import RentSelectScreen from './src/screens/RentSelectScreen';
import HeaderBar from './src/components/HeaderBar';

// Notification function imports
import { usePushNotifications, sendPushNotification } from './UsePushNotifications';

// Create stack navigators for different app sections
const AuthStack = createNativeStackNavigator();
const OnboardingStack = createNativeStackNavigator();
const AppStack = createNativeStackNavigator();

function AuthStackNavigator() {
  return (
    <AuthStack.Navigator initialRouteName="Welcome">
      <AuthStack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
      <AuthStack.Screen name="Login" component={LoginScreen} options={{ headerShown: true, header: () => <HeaderBar title="" showBack={true} showIcons={false} />  }} />
      <AuthStack.Screen name="Signup" component={SignupScreen} options={{ headerShown: true, header: () => <HeaderBar title="" showBack={true} showIcons={false} />  }} />
    </AuthStack.Navigator>
  );
}

function OnboardingStackNavigator() {
  return (
    <OnboardingStack.Navigator>
      <OnboardingStack.Screen name="Onboarding" component={OnboardingScreen} options={{ headerShown: true, header: () => <HeaderBar title="Complete Onboarding" showBack={false} showIcons={false} /> }} />
    </OnboardingStack.Navigator>
  );
}

function AppStackNavigator() {
  return (
    <AppStack.Navigator initialRouteName="Tabs">
      <AppStack.Screen name="Tabs" component={AppTabs} options={{headerShown: false,}}/>
      <AppStack.Screen name="ItemDetail" component={ItemDetailScreen} options={({ route }) => ({headerShown: true, header: () => <HeaderBar title="Details" showBack={true} showIcons={false} /> })}/>
      <AppStack.Screen name="EditProfile" component={OnboardingScreen} options={{ headerShown: true, header: () => <HeaderBar title="Edit profile" showBack={true} showIcons={false} /> }} />
      <AppStack.Screen name="RentSelect" component={RentSelectScreen} options={{ headerShown: true, header: () => <HeaderBar title="Rent" showBack={true} showIcons={false} /> }} />
      <AppStack.Screen name="Basket" component={BasketScreen} options={{ headerShown: true, header: () => <HeaderBar title="Your Basket" showBack={true} showIcons={false} /> }} />
      <AppStack.Screen name="Settings" component={SettingsScreen} options={{ headerShown: true, header: () => <HeaderBar title="Settings" showBack={true} showIcons={false} /> }} />
    </AppStack.Navigator>
  );
}

export default function App() {
  // State from main app logic
  const [isLoading, setIsLoading] = useState(true);
  const [routeKey, setRouteKey] = useState('Auth');
  // Push notification handler
  const { expoPushToken, notification } = usePushNotifications();

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'space-around' }}>
      <Text>Your Expo push token: {expoPushToken}</Text>
      
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Text>Title: {notification?.request.content.title || 'None'}</Text>
        <Text>Body: {notification?.request.content.body || 'None'}</Text>
        <Text>Data: {notification ? JSON.stringify(notification.request.content.data) : 'None'}</Text>
      </View>
      
      <Button
        title="Press to Send Notification"
        onPress={async () => {
          if (expoPushToken) {
            await sendPushNotification(expoPushToken);
          }
        }}
      />
    </View>
  );

  // State from push notification logic
  const [expoPushToken, setExpoPushToken] = useState('');
  const [notification, setNotification] = useState(undefined);
  const notificationListener = useRef();
  const responseListener = useRef();


  // useEffect for Push Notifications (from the first App function)
  useEffect(() => {
    registerForPushNotificationsAsync()
      .then(token => {
        setExpoPushToken(token ?? '');
        // **TODO**: Save this token to your backend (e.g., user's profile in Supabase)
        // so you can send notifications to this user later.
      })
      .catch((error) => console.error(error));

    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification Response:', response);
      // You can add navigation logic here based on the notification response
    });

    return () => {
    };
  }, []);

  // useEffect for Authentication and Routing
  useEffect(() => {

    const refreshRoute = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setRouteKey('Auth');
          setIsLoading(false);
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, city')
          .eq('id', user.id)
          .maybeSingle();

        const needsOnboarding = !profile || !profile.full_name || !profile.city;
        setRouteKey(needsOnboarding ? 'Onboarding' : 'App');
      } catch (e) {
        setRouteKey('Auth');
      } finally {
        setIsLoading(false);
      }
    };

    refreshRoute();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      setIsLoading(true);
      refreshRoute();
    });

    return () => {
      sub.subscription?.unsubscribe?.();
    };
  }, []);

  // Show loading screen
  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator />
        <StatusBar style="auto" />
      </View>
    );
  }

  // Render the appropriate navigation stack
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        {routeKey === 'Auth' ? (
          <AuthStackNavigator />
        ) : routeKey === 'Onboarding' ? (
          <OnboardingStackNavigator />
        ) : (
          <AppStackNavigator />
        )}
        <StatusBar style="auto" />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
