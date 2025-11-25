import { View, Text } from 'react-native';
import Background from '../components/Background';
import { colors } from '../theme/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { styles } from '../theme/styles';

export default function Settings() {
  const insets = useSafeAreaInsets();
  return (
    <Background>
      <View style={[styles.containerBackground, { paddingBottom: insets.bottom }]}>
        <Text style={styles.body}>Coming soon.</Text>
      </View>
    </Background>
  );
}
