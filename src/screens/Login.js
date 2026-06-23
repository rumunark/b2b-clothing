/**
 * User Login Screen
 * 
 * Provides authentication interface for existing users to sign into
 * their B2B Clothing accounts using email and password.
 */

import { useState } from 'react';
import { View, Text } from 'react-native';
import Background from '../components/Background';
import { Input, Label, Button } from '../ui';
import { supabase } from '../lib/supabaseClient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { styles } from '../theme/styles';
import { ensureUserKeys } from '../lib/keyManager';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();

  const onLogin = async () => {
    setLoading(true);
    setError('');
    const { data, error: signInError } =
      await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }
    if (data.user) {
      try {
        // The ONE place keys are checked. Password = passphrase.
        await ensureUserKeys(data.user.id, password);
      } catch (e) {
        console.error('Key setup failed:', e);
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
        <Button variant="gold" onPress={onLogin}>{loading ? 'Securing keys...' : 'Login'}</Button>
      </View>
    </Background>
  );
}