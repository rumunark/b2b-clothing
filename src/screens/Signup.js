/**
 * User Registration Screen
 * 
 * Allows new users to create an account for the B2B Clothing app.
 * Collects user information including email, password, name, and location.
 * Creates both authentication and profile records.
 */

import { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ensureUserKeys } from '../lib/keyManager';
import { supabase } from '../lib/supabaseClient';
import { colors } from '../theme/colors';
import { styles } from '../theme/styles';
import Background from '../components/Background';
import { Input, Label, Alert, Button, Dropdown } from '../ui'
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Linking from 'expo-linking';


/**
 * Signup Component
 * 
 * Handles user registration with form validation and error handling.
 * Creates user authentication record and profile information in Supabase.
 */
export default function Signup() {
  // Form state management
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Alert state for email verification notification
  const [showEmailAlert, setShowEmailAlert] = useState(false);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

    
  useEffect(() => {
    const sub = Linking.addEventListener('url', async ({ url }) => {
      const { queryParams } = Linking.parse(url);
      if (queryParams?.access_token && queryParams?.refresh_token) {
        await supabase.auth.setSession({
          access_token: queryParams.access_token,
          refresh_token: queryParams.refresh_token,
        });
      }
    });
    return () => sub.remove();
  }, []);

  const isStrongPassword = (pw) => {
    const value = String(pw || '');
    const hasMinLength = value.length >= 8;
    const hasUpper = /[A-Z]/.test(value);
    const hasLower = /[a-z]/.test(value);
    const hasNumberOrSymbol = /[0-9]/.test(value) || /[^A-Za-z0-9]/.test(value);
    return hasMinLength && hasUpper && hasLower && hasNumberOrSymbol;
  };

  /**
   * Handles user registration process
   * 1. Creates authentication account with Supabase Auth
   * 2. Creates user profile record with additional information
   * 3. Handles errors and loading states
   */
  const onSignup = async () => {
    setLoading(true);
    setError('');
    // Validate re-entered email and password before attempting signup
    if ((email || '').trim().toLowerCase() !== (confirmEmail || '').trim().toLowerCase()) {
      setError('Email addresses do not match');
      setLoading(false);
      return;
    }
    if ((password || '') !== (confirmPassword || '')) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }
    if (!isStrongPassword(password)) {
      setError('Password must be at least 8 characters, include upper and lower case letters, and at least one number or symbol.');
      setLoading(false);
      return;
    }
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: 'b2bclothing://auth/callback',
      },
    });
    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    

    if (data.session) {
      // Email confirmation is OFF
      await ensureUserKeys(data.user.id, password);
      navigation.navigate('EditProfile');
    } else {
      // Confirmation ON
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
    setConfirmEmail('');
    setPassword('');
    setConfirmPassword('');
    setError('');
    navigation.navigate('Welcome');
  };

  return (
    <Background>
      <View style={[styles.containerBackground, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <Text style={styles.screenTitle}>Create your account</Text>
        <Label>Email</Label>
        <Input placeholder="you@example.com" autoCapitalize="none" value={email} onChangeText={setEmail} />
        <Label>Confirm Email</Label>
        <Input placeholder="you@example.com" autoCapitalize="none" value={confirmEmail} onChangeText={setConfirmEmail} />
        <Label>Password</Label>
        <Input placeholder="••••••••" secureTextEntry value={password} onChangeText={setPassword} />
        <Label>Confirm Password</Label>
        <Input placeholder="••••••••" secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button variant="gold" onPress={onSignup}>{loading ? '...' : 'Sign up'}</Button>
      </View>
      
      {/* Email verification alert */}
      <Alert
        visible={showEmailAlert}
        onClose={handleCloseEmailAlert}
        title="Check Your Email"
        message={`We've sent a verification link to ${email}. Please check your email and click the link to verify your account. You may need to check your spam folder.`}
        buttonText="Got it"
      />
    </Background>
  );
}
