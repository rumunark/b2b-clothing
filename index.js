/**
 * Entry point for the B2B Clothing mobile application
 * 
 * This file serves as the main entry point that registers the root App component
 * with Expo's runtime. It ensures the app works both in Expo Go and native builds.
 */

import 'react-native-get-random-values';

import { registerRootComponent } from 'expo';
import App from './App';

// Register the main App component as the root component
// This handles the app registration for both Expo Go and native builds
registerRootComponent(App);
