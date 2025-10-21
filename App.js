/**
 * Main App Component for B2B Clothing Mobile Application
 * 
 * This is the root component that handles:
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
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

// Screen imports for different app sections
import LoginScreen from './src/screens/LoginScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import LandingScreen from './src/screens/LandingScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';
import SignupScreen from './src/screens/SignupScreen';
import AppTabs from './src/navigation/AppTabs';
import ItemDetailScreen from './src/screens/ItemDetailScreen';
import BasketScreen from './src/screens/BasketScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import RentListScreen from './src/screens/RentListScreen';
import RentSelectScreen from './src/screens/RentSelectScreen';
import HeaderBar from './src/components/HeaderBar';

// Create stack navigators for different app sections
const AuthStack = createNativeStackNavigator();
const OnboardingStack = createNativeStackNavigator();
const AppStack = createNativeStackNavigator();



Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});



async function sendPushNotification(expoPushToken) {
  const message = {
    to: expoPushToken,
    sound: 'default',
    title: 'Original Title',
    body: 'And here is the body!',
    data: { someData: 'goes here' },
  };

  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });
}


function handleRegistrationError(errorMessage) {
  alert(errorMessage);
  throw new Error(errorMessage);
}

async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      handleRegistrationError('Permission not granted to get push token for push notification!');
      return;
    }
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
    if (!projectId) {
      handleRegistrationError('Project ID not found');
    }
    try {
      const pushTokenString = (
        await Notifications.getExpoPushTokenAsync({
          projectId,
        })
      ).data;
      console.log(pushTokenString);
      return pushTokenString;
    } catch (e) {
      handleRegistrationError(`${e}`);
    }
  } else {
    handleRegistrationError('Must use physical device for push notifications');
  }
}

export default function App() {
  const [expoPushToken, setExpoPushToken] = useState('');
  const [notification, setNotification] = useState<Notifications.Notification | undefined>(
    undefined
  );

  useEffect(() => {
    registerForPushNotificationsAsync()
      .then(token => setExpoPushToken(token ?? ''))
      .catch((error) => setExpoPushToken(`${error}`));

    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
    });

    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log(response);
    });

    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, []);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'space-around' }}>
      <Text>Your Expo push token: {expoPushToken}</Text>
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Text>Title: {notification && notification.request.content.title} </Text>
        <Text>Body: {notification && notification.request.content.body}</Text>
        <Text>Data: {notification && JSON.stringify(notification.request.content.data)}</Text>
      </View>
      <Button
        title="Press to Send Notification"
        onPress={async () => {
          await sendPushNotification(expoPushToken);
        }}
      />
    </View>
  );
}


/**
 * Authentication Stack Navigator
 * Handles the flow for unauthenticated users including:
 * - Welcome screen (landing page)
 * - Login screen
 * - Signup screen
 */
function AuthStackNavigator() {
  return (
    <AuthStack.Navigator initialRouteName="Welcome">
      <AuthStack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
      <AuthStack.Screen name="Login" component={LoginScreen} options={{ headerShown: true, header: () => <HeaderBar title="" showBack={true} showIcons={false} />  }} />
      <AuthStack.Screen name="Signup" component={SignupScreen} options={{ headerShown: true, header: () => <HeaderBar title="" showBack={true} showIcons={false} />  }} />
    </AuthStack.Navigator>
  );
}

/**
 * Onboarding Stack Navigator
 * Handles the user profile setup flow for authenticated users
 * who haven't completed their profile information
 */
function OnboardingStackNavigator() {
  return (
    <OnboardingStack.Navigator>
      <OnboardingStack.Screen name="Onboarding" component={OnboardingScreen} options={{ headerShown: true, header: () => <HeaderBar title="Complete Onboarding" showBack={false} showIcons={false} /> }} />
    </OnboardingStack.Navigator>
  );
}

/**
 * Main App Stack Navigator
 * Handles the main application flow for fully authenticated and onboarded users
 * Includes tab navigation and modal screens like item details, basket, etc.
 */
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

/**
 * Main App Component
 * Manages the overall application state and routing logic
 */
export default function App() {
  // State to track loading status during authentication checks
  const [isLoading, setIsLoading] = useState(true);
  // State to determine which navigation stack to show: 'Auth' | 'Onboarding' | 'App'
  const [routeKey, setRouteKey] = useState('Auth');

  useEffect(() => {
    /**
     * Determines which navigation stack to show based on user authentication
     * and profile completion status
     */
    const refreshRoute = async () => {
      try {
        // Check if user is authenticated
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          // User not authenticated - show auth stack
          setRouteKey('Auth');
          setIsLoading(false);
          return;
        }

        // User is authenticated - check if profile is complete
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, city')
          .eq('id', user.id)
          .maybeSingle();

        // Check if user needs to complete onboarding
        const needsOnboarding = !profile || !profile.full_name || !profile.city;
        setRouteKey(needsOnboarding ? 'Onboarding' : 'App');
      } catch (e) {
        // Error occurred - default to auth stack
        setRouteKey('Auth');
      } finally {
        setIsLoading(false);
      }
    };

    // Initial route determination
    refreshRoute();

    // Listen for authentication state changes and refresh route accordingly
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      setIsLoading(true);
      refreshRoute();
    });

    // Cleanup subscription on component unmount
    return () => {
      sub.subscription?.unsubscribe?.();
    };
  }, []);

  // Show loading screen while determining authentication state
  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator />
        <StatusBar style="auto" />
      </View>
    );
  }

  // Render the appropriate navigation stack based on user state
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

// Styles for the loading screen
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
