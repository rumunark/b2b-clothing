import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Background from '../components/Background';
import { colors } from '../theme/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CategoryGateScreen({ navigation }) {
  const go = (cat) => navigation.navigate('Tabs', { screen: 'Rent', params: { category: cat } });
  const insets = useSafeAreaInsets();
  return (
    <Background>
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <Text style={styles.title}>Choose a category</Text>
        <TouchableOpacity style={styles.btn} onPress={() => go('formalwear')}>
          <Text style={styles.btnText}>Formalwear</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={() => go('fancy dress')}>
          <Text style={styles.btnText}>Fancy Dress</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={() => go('rave/festival')}>
          <Text style={styles.btnText}>Festival Fits</Text>
        </TouchableOpacity>
      </View>
    </Background>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { color: colors.white, fontSize: 22, fontWeight: '800', marginBottom: 16 },
  btn: { borderWidth: 2, borderColor: colors.white, paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, marginTop: 10 },
  btnText: { color: colors.white, fontWeight: '800' },
});


