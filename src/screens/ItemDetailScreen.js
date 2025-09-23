import { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, ScrollView } from 'react-native';
import { colors } from '../theme/colors';
import Background from '../components/Background';
import { useRoute } from '@react-navigation/native';
import { supabase } from '../lib/supabaseClient';

export default function ItemDetailScreen() {
  const route = useRoute();
  const { id } = route.params ?? {};
  const [item, setItem] = useState(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('items')
        .select('id, title, description, image_url, price_per_day')
        .eq('id', id)
        .maybeSingle();
      setItem(data ?? null);
    };
    if (id) load();
  }, [id]);

  if (!item) {
    return (
      <Background>
        <View style={styles.center}> 
          <Text style={{ color: colors.white }}>Loading...</Text>
        </View>
      </Background>
    );
  }

  return (
    <Background>
      <ScrollView contentContainerStyle={styles.container}>
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.image} />
        ) : null}
        <Text style={styles.title}>{item.title}</Text>
        {item.description ? <Text style={styles.desc}>{item.description}</Text> : null}
        {item.price_per_day != null ? (
          <Text style={styles.price}>rent from £{Number(item.price_per_day).toFixed(2)}</Text>
        ) : null}
      </ScrollView>
    </Background>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.navy },
  container: { padding: 16, backgroundColor: colors.navy, minHeight: '100%' },
  image: { width: '100%', aspectRatio: 1, borderRadius: 8, backgroundColor: '#f0f0f0' },
  title: { marginTop: 12, fontSize: 20, fontWeight: '800', color: colors.white },
  desc: { marginTop: 6, color: colors.gray100 },
  price: { marginTop: 8, fontSize: 16, fontWeight: '700', color: colors.yellow },
});


