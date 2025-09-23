import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import Background from '../components/Background';
import OutlineCtaButton from '../components/OutlineCtaButton';

export default function WelcomeScreen() {
  const navigation = useNavigation();
  return (
    <Background>
      <View style={styles.container}>
        <Text style={styles.title}>b2b clothing</Text>
        <View style={{ height: 24 }} />
        <OutlineCtaButton title="Sign up" onPress={() => navigation.navigate('Signup')} />
        <View style={{ height: 12 }} />
        <OutlineCtaButton title="Log in" onPress={() => navigation.navigate('Login')} />
      </View>
    </Background>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  container: { flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 40, fontStyle: 'italic', fontWeight: '800', color: colors.white },
  btn: { },
  btnPrimary: { },
  btnPrimaryText: { },
  btnSecondary: { },
  btnSecondaryText: { },
});


