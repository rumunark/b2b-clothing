/**
 * User Login Screen
 * 
 * Provides authentication interface for existing users to sign into
 * their B2B Clothing accounts using email and password.
 */

import { useState } from 'react';
import { View, Text } from 'react-native';
import { colors } from '../theme/colors';
import Background from '../components/Background';
import Input from '../ui/Input';
import Label from '../ui/Label';
import UIButton from '../ui/Button';
import { supabase } from '../lib/supabaseClient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { styles } from '../theme/styles';
import { generateAndStoreKeys, getPublicKey } from '../lib/encryption';

/**
 * LoginScreen Component
 * 
 * Handles user authentication with email/password validation,
 * error handling, and loading states during sign-in process.
 */
export default function LoginScreen() {
  // Form state management
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();

  /**
   * Handles user login process
   * Authenticates user with Supabase Auth and manages loading/error states
   */
  const onLogin = async () => {
    setLoading(true);
    setError('');
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    const user = data.user;
    if (user) {
      const publicKey = await getPublicKey(user.id);
      if (!publicKey) {
        console.log(`User ${user.id} is missing public key. Generating...`);
        await generateAndStoreKeys(user.id);
      }
    }
    setLoading(false);
  };

  return (
    <Background>
      <View style={[styles.containerBackground, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <Text style={styles.screenTitle}>Login</Text>
        <Label>Email</Label>
        <Input placeholder="you@example.com" autoCapitalize="none" value={email} onChangeText={setEmail} />
        <Label>Password</Label>
        <Input placeholder="••••••••" secureTextEntry value={password} onChangeText={setPassword} />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={{ height: 16 }} />
        <UIButton variant="gold" onPress={onLogin}>{loading ? '...' : 'Login'}</UIButton>
      </View>
    </Background>
  );
}
