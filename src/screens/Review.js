import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabaseClient';
import Background from '../components/Background';
import { Button } from '../ui';
import { styles } from '../theme/styles';
import { colors } from '../theme/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function Review({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { itemId, sellerId, itemTitle } = route.params ?? {};

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submitReview = async () => {
    if (rating < 1) {
      Alert.alert('Rating required', 'Please select a star rating before submitting.');
      return;
    }
    try {
      setSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { Alert.alert('Not signed in', 'Please sign in first.'); return; }

      const { error } = await supabase.from('reviews').insert({
        buyer_id: user.id,
        seller_id: sellerId,
        item_id: itemId,
        rating,
        comment: comment.trim() || null,
        created_at: new Date().toISOString(),
      });
      if (error) throw error;

      Alert.alert('Thank you!', 'Your review has been submitted.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Background>
      <ScrollView contentContainerStyle={[styles.containerBackground, { paddingBottom: insets.bottom }]}>
        <Text style={styles.screenTitle}>Leave a Review</Text>
        {itemTitle ? <Text style={styles.body}>{itemTitle}</Text> : null}

        <View style={{ height: 20 }} />

        <Text style={styles.label}>Your rating</Text>
        <View style={[styles.row, { justifyContent: 'center', marginBottom: 16 }]}>
          {[1, 2, 3, 4, 5].map((n) => (
            <TouchableOpacity
              key={n}
              onPress={() => setRating(n)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={n <= rating ? 'star' : 'star-outline'}
                size={40}
                color={colors.yellow}
              />
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Comment</Text>
        <TextInput
          value={comment}
          onChangeText={setComment}
          placeholder="Share your experience..."
          placeholderTextColor={colors.gray500}
          multiline
          maxLength={1000}
          style={[styles.input, { height: 120, textAlignVertical: 'top' }]}
        />

        <View style={{ height: 16 }} />
        <Button onPress={submitReview} variant="gold" disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit Review'}
        </Button>
      </ScrollView>
    </Background>
  );
}