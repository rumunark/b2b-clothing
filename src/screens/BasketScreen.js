import { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity } from 'react-native';
import Background from '../components/Background';
import Button from '../ui/Button';
import Alert from '../ui/Alert';
import { colors } from '../theme/colors';
import { supabase } from '../lib/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { styles } from '../theme/styles';

export default function BasketScreen() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setRows([]); return; }
      // Try with join to items if a FK exists
      let { data, error } = await supabase
        .from('basket')
        .select(`id, item_id, start_date, nights, price_per_day, cleaning_price, total, created_at,
          items: item_id ( id, title, image_url, owner_id )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) {
        // fallback: fetch basket then items by id
        const fb = await supabase
          .from('basket')
          .select('id, item_id, start_date, nights, price_per_day, cleaning_price, total, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        if (fb.error) throw fb.error;
        const ids = (fb.data || []).map(r => r.item_id).filter(Boolean);
        let byId = new Map();
        if (ids.length) {
          const it = await supabase.from('items').select('id, title, image_url, owner_id').in('id', ids);
          if (it.error) throw it.error;
          byId = new Map((it.data || []).map(x => [x.id, x]));
        }
        data = (fb.data || []).map(r => ({ ...r, items: byId.get(r.item_id) || null }));
      }
      setRows(data || []);
    } catch (e) {
      Alert.alert('Basket error', e.message || String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (rowId) => {
    try {
      const { error } = await supabase.from('basket').delete().eq('id', rowId);
      if (error) throw error;
      setRows((prev) => prev.filter(r => r.id !== rowId));
    } catch (e) {
      Alert.alert('Delete error', e.message || String(e));
    }
  };

  const handleEdit = (row) => {
    navigation.navigate('RentSelect', {
      id: row.item_id,
      startDate: row.start_date,
      nights: row.nights,
    });
  };

  const handleSendRequest = async () => {
    for (const basketItem of rows) {
      try {
        setSending(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          Alert.alert('Not signed in', 'Please sign in first.');
          return;
        }

        if (!item || !item.owner_id) {
          Alert.alert('Error', 'Item details not loaded or missing owner.');
          return;
        }

        const effectiveNights = Number(customNights || nights || 1);
        const totalPrice = (Number(item.price_per_day || 0) * effectiveNights + Number(item.cleaning_price || 0));

        const { error } = await supabase
          .from('requests')
          .insert([{
            buyer_id: user.id,
            seller_id: item.owner_id,
            item_id: item.id,
            start_date: startDate,
            nights: effectiveNights,
            total_price: totalPrice.toFixed(2),
            status: 'pending'
          }]);

      } catch (e) {
        Alert.alert('Send error', e.message || String(e));
      } finally {
        setSending(false);
      }
    }
    Alert({ title: 'Requests sent for:', message: '${rows.title}' });
  };

  return (
    <Background>
      <View style={[styles.container, { paddingBottom: insets.bottom * 2, flex: 1 }]}>
        <FlatList
          data={rows}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingTop: 12 }}
          keyExtractor={(r) => String(r.id)}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.listItemContainer}
              onPress={() => handleEdit(item)}
            >
              {item.items?.image_url ? (
                <Image source={{ uri: item.items.image_url }} style={styles.listItemImage} />
              ) : (
                  <View style={styles.listItemImage} />
              )}
              <View style={styles.listItemContent}>
                <Text style={styles.listItemTitle}>{item.items?.title || 'Item'}</Text>
                <Text style={styles.body}>
                  Start {item.start_date} • {item.nights} {item.nights === 1 ? 'night' : 'nights'}
                </Text>
                <Text style={styles.price}>£{Number(item.total || 0).toFixed(2)}</Text>
              </View>
              <View style={styles.listItemActions}>
                <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.iconButtonTransparent}>
                  <Ionicons name="trash" size={18} color={colors.white} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={styles.body}>
              {loading ? 'Loading…' : 'Basket is empty.'}
            </Text>
          }
        />
        {rows.length > 0 && (
          <Button onPress={handleSendRequest} variant="gold">Send request for all</Button>
        )}
      </View>
    </Background>
  );
}