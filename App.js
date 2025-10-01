import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { supabase } from './src/lib/supabaseClient';
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

const AuthStack = createNativeStackNavigator();
const OnboardingStack = createNativeStackNavigator();
const AppStack = createNativeStackNavigator();

function AuthStackNavigator() {
  return (
    <AuthStack.Navigator initialRouteName="Welcome">
      <AuthStack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
      <AuthStack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      <AuthStack.Screen name="Signup" component={SignupScreen} options={{ headerShown: false }} />
    </AuthStack.Navigator>
  );
}

function OnboardingStackNavigator() {
  return (
    <OnboardingStack.Navigator>
      <OnboardingStack.Screen name="Onboarding" component={OnboardingScreen} options={{ headerShown: false }} />
    </OnboardingStack.Navigator>
  );
}

function AppStackNavigator() {
  return (
    <AppStack.Navigator initialRouteName="Tabs">
      <AppStack.Screen name="Tabs" component={AppTabs} options={{ headerShown: false }} />
      <AppStack.Screen name="ItemDetail" component={ItemDetailScreen} options={{ title: 'Item' }} />
      <AppStack.Screen name="EditProfile" component={OnboardingScreen} options={{ title: 'Edit profile' }} />
      <AppStack.Screen name="RentSelect" component={RentSelectScreen} options={{ title: 'Rent' }} />
      <AppStack.Screen name="Basket" component={BasketScreen} options={{ title: 'Basket' }} />
      <AppStack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
    </AppStack.Navigator>
  );
}

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [routeKey, setRouteKey] = useState('Auth'); // 'Auth' | 'Onboarding' | 'App'

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
          .select('full_name, city_or_uni, role')
          .eq('id', user.id)
          .maybeSingle();
        const needsOnboarding = !profile || !profile.full_name || !profile.city_or_uni || !profile.role;
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

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator />
        <StatusBar style="auto" />
      </View>
    );
  }

  return (
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
