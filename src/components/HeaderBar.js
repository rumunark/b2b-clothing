import { View, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { styles } from '../theme/styles';

export default function HeaderBar({ title, showBack, showIcons }) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top }]}>
      {/* Left Container */}
      <View style={styles.headerLeftContainer}>
        {showBack && (
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 12}}>
            <Ionicons name="arrow-back" size={24} color={colors.white} />
          </TouchableOpacity>
        )}
        {title && <Text style={styles.headerTitle}>{title}</Text>}
      </View>

      {/* EXPERIMENTAL: Do we want the logo always shown in header?? */}
      {/* <View style={styles.headerCenter}>
        <Text style={[styles.brandTitle, { fontSize: 24, color: colors.yellow }]}> b2b </Text>
      </View> */}
      
      {/* Right Container */}
      <View style={styles.headerRightContainer}>
        {showIcons && (
          <>
            <TouchableOpacity onPress={() => navigation.navigate('Basket')} style={{ marginRight: 16}}>
              <Ionicons name="cart-outline" size={24} color={colors.white} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={{ marginRight: 4}}>
              <Ionicons name="settings-outline" size={24} color={colors.white} />
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}