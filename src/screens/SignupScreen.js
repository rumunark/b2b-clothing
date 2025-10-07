/**
 * User Registration Screen
 * 
 * Allows new users to create an account for the B2B Clothing app.
 * Collects user information including email, password, name, and location.
 * Creates both authentication and profile records.
 */

import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabaseClient';
import { colors } from '../theme/colors';
import Background from '../components/Background';
import Input from '../ui/Input';
import Label from '../ui/Label';
import UIButton from '../ui/Button';
import UIAlert from '../ui/Alert';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Alert state for email verification notification
  const [showEmailAlert, setShowEmailAlert] = useState(false);
  const insets = useSafeAreaInsets();

  /**
   * Handles user registration process
   * 1. Creates authentication account with Supabase Auth
   * 2. Creates user profile record with additional information
   * 3. Handles errors and loading states
   */
  const onSignup = async () => {
    setLoading(true);
    setError('');
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: 'b2b-clothing://auth/callback',
      },
    });
    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }
    const user = data.user;
    if (user) {
      await supabase.from('profiles').upsert({ id: user.id, full_name: fullName, city_or_uni: cityOrUni });
      // Show email verification alert after successful signup
      setShowEmailAlert(true);
    }
    setLoading(false);
  };

  /**
   * Handles closing the email verification alert
   * Resets the form after user acknowledges the email notification
   */
  const handleCloseEmailAlert = () => {
    setShowEmailAlert(false);
    // Reset form after successful signup
    setEmail('');
    setPassword('');
    setFullName('');
    setCityOrUni('');
    setError('');
  };

  return (
    <Background>
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
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
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <UIButton variant="solid" onPress={onSignup}>{loading ? '...' : 'Sign up'}</UIButton>
      </View>
      
      {/* Email verification alert */}
      <UIAlert
        visible={showEmailAlert}
        onClose={handleCloseEmailAlert}
        title="Check Your Email"
        message={`We've sent a verification link to ${email}. Please check your email and click the link to verify your account. You may need to check your spam folder.`}
        buttonText="Got it"
      />
    </Background>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: colors.navy },
  title: { fontSize: 24, marginBottom: 16, fontWeight: '800', color: colors.white },
  input: { backgroundColor: colors.white, padding: 12, borderRadius: 8, marginBottom: 12 },
  error: { color: colors.yellow, marginBottom: 12 },
});


