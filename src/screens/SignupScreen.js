/**
 * User Registration Screen
 * 
 * Allows new users to create an account for the B2B Clothing app.
 * Collects user information including email, password, name, and location.
 * Creates both authentication and profile records.
 */

import { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabaseClient';
import { colors } from '../theme/colors';
import { styles } from '../theme/styles';
import Background from '../components/Background';
import Input from '../ui/Input';
import Label from '../ui/Label';
import UIButton from '../ui/Button';
import UIAlert from '../ui/Alert';
import Dropdown from '../ui/Dropdown';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

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
  const [confirmEmail, setConfirmEmail] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [city, setCity] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Alert state for email verification notification
  const [showEmailAlert, setShowEmailAlert] = useState(false);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

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
      await supabase.from('profiles').upsert({ id: user.id, full_name: fullName, city: city });
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
    setConfirmEmail('');
    setPassword('');
    setConfirmPassword('');
    setFullName('');
    setCity('');
    setError('');
    navigation.navigate('Welcome');
  };

  return (
    <Background>
      <View style={[styles.containerBackground, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <Text style={styles.screenTitle}>Create your account</Text>
        <Label>Email</Label>
        <Input placeholder="you@example.com" autoCapitalize="none" value={email} onChangeText={setEmail} />
        <View style={{ height: 8 }} />
        <Label>Confirm Email</Label>
        <Input placeholder="you@example.com" autoCapitalize="none" value={confirmEmail} onChangeText={setConfirmEmail} />
        <View style={{ height: 8 }} />
        <Label>Password - </Label>
        <Input placeholder="••••••••" secureTextEntry value={password} onChangeText={setPassword} />
        <View style={{ height: 8 }} />
        <Label>Confirm Password</Label>
        <Input placeholder="••••••••" secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} />
        <View style={{ height: 8 }} />
        <Label>Full name</Label>
        <Input value={fullName} onChangeText={setFullName} />
        <View style={{ height: 8 }} />        
        <Label>City</Label>
        <Dropdown 
          title="Select a City"
          enumType='location'
          value={city} 
          onValueChange={setCity}
          placeholder="Select a City"
        />
        <View style={{ height: 8 }} />

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <UIButton variant="gold" onPress={onSignup}>{loading ? '...' : 'Sign up'}</UIButton>
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
