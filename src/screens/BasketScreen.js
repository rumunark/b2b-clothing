import { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Image, Alert, TouchableOpacity } from 'react-native';
import Background from '../components/Background';
import { colors } from '../theme/colors';
import { supabase } from '../lib/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { Alert.alert('Not signed in', 'Please sign in first.'); return; }
      if (!rows.length) { Alert.alert('Basket empty', 'Add an item to your basket first.'); return; }

      let sent = 0;
      for (const r of rows) {
        const ownerId = r.items?.owner_id;
        if (!ownerId) continue;
        const content = `Rental request for ${r.items?.title || 'item'}\nStart: ${r.start_date}\nNights: ${r.nights}\nTotal: £${Number(r.total || 0).toFixed(2)}\n\nAccept?`;
        const { error } = await supabase
          .from('messages')
          .insert([{ sender_id: user.id, receiver_id: ownerId, content }]);
        if (!error) sent += 1;
      }
      if (sent > 0) Alert.alert('Request sent', `Sent ${sent} request(s) to lender(s).`);
      else Alert.alert('Nothing sent', 'Could not find a lender to message for these items.');
    } catch (e) {
      Alert.alert('Send error', e.message || String(e));
    }
  };

  return (
    <Background>
      <View style={[styles.container, { paddingBottom: insets.bottom }]}>
        <FlatList
          data={rows}
          keyExtractor={(r) => String(r.id)}
          renderItem={({ item }) => (
            <View style={styles.row}>
              {item.items?.image_url ? (
                <Image source={{ uri: item.items.image_url }} style={styles.thumb} />
              ) : null}
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{item.items?.title || 'Item'}</Text>
                <Text style={styles.meta}>Start {item.start_date} • {item.nights} night(s)</Text>
                <Text style={styles.price}>£{Number(item.total || 0).toFixed(2)}</Text>
              </View>
              <View style={styles.actions}>
                <TouchableOpacity onPress={() => handleEdit(item)} style={styles.iconBtn}>
                  <Ionicons name="pencil" size={18} color={colors.white} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.iconBtn}>
                  <Ionicons name="trash" size={18} color={colors.white} />
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>{loading ? 'Loading…' : 'Basket is empty.'}</Text>}
        />
        <TouchableOpacity style={styles.sendBtn} onPress={handleSendRequest}>
          <Text style={styles.sendText}>Send request</Text>
        </TouchableOpacity>
      </View>
    </Background>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  row: { flexDirection: 'row', gap: 12, marginBottom: 12, alignItems: 'center' },
  thumb: { width: 72, height: 72, borderRadius: 8 },
  itemTitle: { color: colors.white, fontWeight: '700' },
  meta: { color: colors.white },
  price: { color: colors.yellow, fontWeight: '900' },
  actions: { flexDirection: 'row', gap: 8 },
  iconBtn: { padding: 6, borderWidth: 1, borderColor: '#334', borderRadius: 8 },
  empty: { color: colors.white, textAlign: 'center', marginTop: 40 },
  sendBtn: { marginTop: 8, paddingVertical: 14, borderRadius: 10, backgroundColor: colors.yellow, alignItems: 'center' },
  sendText: { color: '#000', fontWeight: '900' },
});


