import { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, Image, FlatList, TouchableOpacity, Linking, AppState } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import Background from '../components/Background';
import { supabase } from '../lib/supabaseClient';
import { Button, Card, Label } from '../ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { styles } from '../theme/styles';
import {
  createOrGetStripeAccount,
  createAccountOnboardingLink,
  getStripeAccountStatus,
} from '../lib/stripe';

export default function ProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [age, setAge] = useState(null);
  const [verified, setVerified] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [numListed, setNumListed] = useState(0);
  const [numRented, setNumRented] = useState(0);
  const [items, setItems] = useState([]);
  const [stripeStatus, setStripeStatus] = useState({ connected: false, onboarding_complete: false });
  const [stripeLoading, setStripeLoading] = useState(false);

  const awaitingStripeReturn = useRef(false);

  const loadProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setEmail(user?.email ?? '');
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, city, birthday, avatar_url, is_verified, stripe_account_id, stripe_onboarding_complete')
      .eq('id', user.id)
      .maybeSingle();

    setFullName(profile?.full_name ?? '');
    setVerified(!!profile?.is_verified);

    const rawDob = profile?.birthday ?? '';
    if (rawDob) {
      const d = new Date(rawDob);
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      setDob(`${dd}/${mm}/${yyyy}`);

      const today = new Date();
      let years = today.getFullYear() - d.getFullYear();
      const m = today.getMonth() - d.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < d.getDate())) years--;
      setAge(years);
    } else {
      setDob('');
      setAge(null);
    }

    setAvatarUrl(profile?.avatar_url ?? '');

    setStripeStatus({
      connected: !!profile?.stripe_account_id,
      onboarding_complete: !!profile?.stripe_onboarding_complete,
    });

    const { data: myItems, count: listedCount } = await supabase
      .from('items')
      .select('id, title, description, image_url, images, price_per_day, size, owner_id, cleaning_price', { count: 'exact' })
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });
    setNumListed(listedCount ?? 0);
    setItems(myItems || []);

    const { count: rentedCount } = await supabase
      .from('rentals')
      .select('id', { count: 'exact', head: true })
      .eq('renter_id', user.id);
    setNumRented(rentedCount ?? 0);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
      if (awaitingStripeReturn.current) {
        awaitingStripeReturn.current = false;
        refreshStripeStatus();
      }
    }, [loadProfile])
  );

  const refreshStripeStatus = useCallback(async () => {
    const status = await getStripeAccountStatus();
    setStripeStatus(status);
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && awaitingStripeReturn.current) {
        awaitingStripeReturn.current = false;
        refreshStripeStatus();
      }
    });
    return () => subscription.remove();
  }, [refreshStripeStatus]);

  const handleConnectStripe = async () => {
    setStripeLoading(true);
    try {
      await createOrGetStripeAccount();
      const url = await createAccountOnboardingLink();
      awaitingStripeReturn.current = true;
      await Linking.openURL(url);
    } catch (err) {
      console.error('Stripe connect error:', err.message);
    } finally {
      setStripeLoading(false);
    }
  };

  const renderListing = ({ item }) => {
    const thumbnail = item.image_url || (Array.isArray(item.images) && item.images[0]) || null;

    return (
      <TouchableOpacity
        style={styles.listItemContainer}
        onPress={() => navigation.navigate('ItemDetail', { id: item.id, showRent: false })}
      >
        {thumbnail ? (
          <Image source={{ uri: thumbnail }} style={styles.listItemImage} />
        ) : (
          <View style={styles.listItemImage} />
        )}
        <View style={styles.listItemContent}>
          <Text numberOfLines={1} style={styles.listItemTitle}>{item.title}</Text>
          {item.size ? <Text style={[styles.body, { fontSize: 12, color: colors.gray500 }]}>Size: {item.size}</Text> : null}
          <Text style={[styles.price, { fontSize: 14, marginTop: 4 }]}>
            £{Number(item.price_per_day).toFixed(2)}/day
            {item.cleaning_price ? ` • Cleaning £${Number(item.cleaning_price).toFixed(2)}` : ''}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const ProfileHeader = (
    <>
      <View 
        style={styles.headerPanel}>
        {/* Profile Info Row */}
        <View style={[styles.row, { alignItems: 'center' }]}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <Ionicons name="person-circle-outline" size={72} color={colors.white} />
          )}
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={styles.label}>{fullName || 'Your profile'}</Text>
            <Text style={[styles.body, { color: colors.gray100 }]}>{email}</Text>
            {verified ? (
              <View style={[styles.row, { alignItems: 'center', marginTop: 4 }]}>
                <Ionicons name="checkmark-circle" size={16} color={colors.pink} />
                <Text style={[styles.body, { color: colors.gray100, marginLeft: 4 }]}>Verified</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Stats Row */}
        <View style={[styles.row, { marginTop: 16, width: '100%' }]}>
          <View style={[styles.chip, { flex: 1, alignItems: 'center' }]}>
            <Text style={styles.chipText}>{numListed}</Text>
            <Text style={[styles.chipText, { fontSize: 11 }]}>Listed</Text>
          </View>
          <View style={[styles.chip, { flex: 1, alignItems: 'center' }]}>
            <Text style={styles.chipText}>{numRented}</Text>
            <Text style={[styles.chipText, { fontSize: 11 }]}>Rented</Text>
          </View>
        </View>

        <View style={[styles.row, { marginTop: 16}]}>
            <Button onPress={() => navigation.navigate('EditProfile')} size="md" style={{ flex: 1 }}>
              Edit profile
            </Button>
            <Button onPress={stripeStatus.onboarding_complete ? () => {} : handleConnectStripe} size="md" style={{ flex: 1 }}>
              {stripeStatus.onboarding_complete 
                ? 'Stripe Connected' 
                : stripeStatus.connected 
                ? 'Stripe Incomplete' 
                : 'Connect Stripe'}
            </Button>
        </View>
      </View>


    </>
  );

  return (
    <Background>
      {ProfileHeader}
      <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderListing}
        contentContainerStyle={{ paddingBottom: insets.bottom * 2 }}
        ListHeaderComponent={
          <Text style={[styles.screenTitle, { marginBottom : 8}]}>
            Your Listings
          </Text>
        }
        ListEmptyComponent={
          <Text style={[styles.body, { textAlign: 'center', marginTop: 16, marginHorizontal: 16 }]}>
            You haven't listed any items yet.
          </Text>
        }
        ListFooterComponent={
          <View style={{ marginTop: 24, marginBottom: 24, alignItems: 'center' }}>
            <Text onPress={() => supabase.auth.signOut()} style={styles.body}>Sign out</Text>
          </View>
        }
      />
      </View>
    </Background>
  );
}