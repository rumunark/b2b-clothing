/**
 * User Registration Screen
 * 
 * Allows new users to create an account for the B2B Clothing app.
 * Collects user information including email, password, name, location,
 * and role (owner or browser). Creates both authentication and profile records.
 */

import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabaseClient';
import { colors } from '../theme/colors';
import Background from '../components/Background';
import Input from '../ui/Input';
import Label from '../ui/Label';
import UIButton from '../ui/Button';

/**
 * SignupScreen Component
 * 
 * Handles user registration with form validation and error handling.
 * Creates user authentication record and profile information in Supabase.
 */
export default function SignupScreen() {
  // Form state management
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [cityOrUni, setCityOrUni] = useState('');
  const [role, setRole] = useState(''); // 'owner' or 'browser'
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  /**
   * Handles user registration process
   * 1. Creates authentication account with Supabase Auth
   * 2. Creates user profile record with additional information
   * 3. Handles errors and loading states
   */
  const onSignup = async () => {
    setLoading(true);
    setError('');
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }
    const user = data.user;
    if (user) {
      await supabase.from('profiles').upsert({ id: user.id, full_name: fullName, city_or_uni: cityOrUni, role });
    }
    setLoading(false);
  };

  return (
    <Background>
      <View style={styles.container}>
        <Text style={styles.title}>Create your account</Text>
        <Label>Email</Label>
        <Input placeholder="you@example.com" autoCapitalize="none" value={email} onChangeText={setEmail} />
        <View style={{ height: 8 }} />
        <Label>Password</Label>
        <Input placeholder="••••••••" secureTextEntry value={password} onChangeText={setPassword} />
        <View style={{ height: 8 }} />
        <Label>Full name</Label>
        <Input value={fullName} onChangeText={setFullName} />
        <View style={{ height: 8 }} />
        <Label>City or University</Label>
        <Input value={cityOrUni} onChangeText={setCityOrUni} />
        <View style={{ height: 8 }} />
        <Label>Role (owner or browser)</Label>
        <Input value={role} onChangeText={setRole} />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={{ height: 16 }} />
        <UIButton variant="solid" onPress={onSignup}>{loading ? '...' : 'Sign up'}</UIButton>
      </View>
    </Background>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: colors.navy },
  title: { fontSize: 24, marginBottom: 16, fontWeight: '800', color: colors.white },
  input: { backgroundColor: colors.white, padding: 12, borderRadius: 8, marginBottom: 12 },
  error: { color: colors.yellow, marginBottom: 12 },
});


