/**
 * Main App Tab Navigation
 * 
 * Defines the bottom tab navigation for the main application flow.
 * Includes five main sections: Home, Rent, List, Wishlist, and Profile.
 * Uses Ionicons for tab icons with focused/unfocused states.
 */

import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import HeaderBar from '../components/HeaderBar';

// Screen imports for each tab
import LandingScreen from '../screens/LandingScreen';
import RentListScreen from '../screens/RentListScreen';
import ListScreen from '../screens/ListScreen';
import ProfileScreen from '../screens/ProfileScreen';
import WishlistScreen from '../screens/WishlistScreen';

// Create the bottom tab navigator
const Tab = createBottomTabNavigator();

/**
 * AppTabs Component
 * Creates the main tab navigation with 5 tabs:
 * - Home: Browse available items
 * - Rent: View rental listings
 * - List: Create new item listings
 * - Wishlist: Saved/favorited items
 * - Profile: User profile and settings
 */
export default function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: true,
        header: ({ route, options }) => <HeaderBar title={options.title || route.name} showIcons={true} />,
        tabBarStyle: { 
          backgroundColor: colors.navy, // Navy background for tab bar
          borderTopColor: colors.navy // Remove default border
        },
        tabBarActiveTintColor: colors.yellow, // Yellow for active tab
        tabBarInactiveTintColor: colors.white, // White for inactive tabs
        tabBarIcon: ({ color, size, focused }) => {
          // Determine which icon to show based on route and focus state
          let iconName = 'ellipse-outline'; // Default fallback icon
          
          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Rent') {
            iconName = focused ? 'repeat' : 'repeat-outline';
          } else if (route.name === 'List') {
            iconName = focused ? 'add-circle' : 'add-circle-outline';
          } else if (route.name === 'Wishlist') {
            iconName = focused ? 'heart' : 'heart-outline';
          }
          else if (route.name === 'Profile') {
            iconName = focused ? 'person-circle' : 'person-circle-outline';
          }
          
          return <Ionicons name={iconName} size={size ?? 22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={LandingScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="Rent" component={RentListScreen} options={{ title: 'Rent' }} />
      <Tab.Screen name="List" component={ListScreen} options={{ title: 'List an item' }} />
      <Tab.Screen name="Wishlist" component={WishlistScreen} options={{ title: 'Wishlist' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}


