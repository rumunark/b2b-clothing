import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { styles } from '../theme/styles';
import Background from '../components/Background';
import UIButton from '../ui/Button';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function WelcomeScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  return (
    <Background>
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.brandTitle}>b2b clothing</Text>
        <View style={{ height: 24 }} />
        <UIButton onPress={() => navigation.navigate('Signup')} style={{ width: '50%' }}>Sign Up →</UIButton>
        <View style={{ height: 12 }} />
        <UIButton onPress={() => navigation.navigate('Login')} style={{ width: '50%' }}>Log In →</UIButton>
      </View>
    </Background>
  );
}

