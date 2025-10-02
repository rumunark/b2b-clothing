/**
 * User Login Screen
 * 
 * Provides authentication interface for existing users to sign into
 * their B2B Clothing accounts using email and password.
 */

import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import Background from '../components/Background';
import Input from '../ui/Input';
import Label from '../ui/Label';
import UIButton from '../ui/Button';
import { supabase } from '../lib/supabaseClient';

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

  /**
   * Handles user login process
   * Authenticates user with Supabase Auth and manages loading/error states
   */
  const onLogin = async () => {
    setLoading(true);
    setError('');
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) setError(signInError.message);
    setLoading(false);
  };

  return (
    <Background>
      <View style={styles.container}>
        <Text style={styles.title}>Login</Text>
        <Label>Email</Label>
        <Input placeholder="you@example.com" autoCapitalize="none" value={email} onChangeText={setEmail} />
        <View style={{ height: 8 }} />
        <Label>Password</Label>
        <Input placeholder="••••••••" secureTextEntry value={password} onChangeText={setPassword} />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={{ height: 16 }} />
        <UIButton variant="solid" onPress={onLogin}>{loading ? '...' : 'Login'}</UIButton>
      </View>
    </Background>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: colors.navy },
  title: { fontSize: 28, marginBottom: 16, fontWeight: '800', color: colors.white },
  input: { backgroundColor: colors.white, padding: 12, borderRadius: 8, marginBottom: 12 },
  error: { color: colors.yellow, marginBottom: 12 },
});


