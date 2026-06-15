import { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, Image, Linking, AppState } from 'react-native';
import { colors } from '../theme/colors';
import Background from '../components/Background';
import { supabase } from '../lib/supabaseClient';
import { Button } from '../ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { styles } from '../theme/styles';
import { Ionicons } from '@expo/vector-icons';
import {
  createOrGetStripeAccount,
  createAccountOnboardingLink,
  getStripeAccountStatus,
} from '../lib/stripe';

export default function ProfileScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [userId, setUserId] = useState('');
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
  const insets = useSafeAreaInsets();

  // Tracks whether we sent the user off to Stripe, so we know to
  // refresh status when they come back to the app.
  const awaitingStripeReturn = useRef(false);

  const loadProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setEmail(user?.email ?? '');
    setUserId(user?.id ?? '');
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
      .eq('owner_id', user.id);
    setNumListed(listedCount ?? 0);
    setItems(myItems || []);

    const { count: rentedCount } = await supabase
      .from('rentals')
      .select('id', { count: 'exact', head: true })
      .eq('renter_id', user.id);
    setNumRented(rentedCount ?? 0);
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const refreshStripeStatus = useCallback(async () => {
    const status = await getStripeAccountStatus();
    setStripeStatus(status);
  }, []);

  // Refresh when the screen regains focus (e.g. coming back from browser on Android)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (awaitingStripeReturn.current) {
        awaitingStripeReturn.current = false;
        refreshStripeStatus();
      }
    });
    return unsubscribe;
  }, [navigation, refreshStripeStatus]);

  // Refresh when the app comes back to the foreground (covers iOS too)
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

  return (
    <Background>
      <View style={[styles.container, styles.centered]}>
        <View style={styles.column}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <Ionicons name="person-circle-outline" size={96} color={colors.white} />
          )}
          <Text style={styles.label}>{fullName}</Text>
        </View>

        <Text style={styles.body}>Email: {email}</Text>
        {dob ? <Text style={styles.body}>DOB: {dob}</Text> : null}
        {age != null ? <Text style={styles.body}>Age: {age}</Text> : null}
        <Text style={styles.body}>Verified: {verified ? 'Yes' : 'No'}</Text>
        <Text style={styles.body}>Items listed: {numListed}</Text>
        <Text style={styles.body}>Items rented: {numRented}</Text>

        <View style={styles.column}>
          <Text style={styles.body}>
            Payouts:{' '}
            {stripeStatus.onboarding_complete
              ? 'Connected ✅'
              : stripeStatus.connected
              ? 'Setup incomplete ⚠️'
              : 'Not connected'}
          </Text>

          {!stripeStatus.onboarding_complete && (
            <Button onPress={handleConnectStripe} loading={stripeLoading}>
              {stripeStatus.connected ? 'Finish Stripe setup' : 'Connect Stripe account'}
            </Button>
          )}

          {stripeStatus.connected && !stripeStatus.onboarding_complete && (
            <Button onPress={refreshStripeStatus}>Refresh status</Button>
          )}
        </View>

        <Button onPress={() => navigation.navigate('EditProfile')}>Edit profile</Button>

        {items.map(item => (
          <View key={item.id}>
            <Text style={styles.body}>{item.title}</Text>
            <Text style={styles.body}>£{item.price_per_day}/day • Cleaning £{item.cleaning_price}</Text>
          </View>
        ))}

        <Button onPress={() => supabase.auth.signOut()}>Sign Out</Button>
      </View>
    </Background>
  );
}