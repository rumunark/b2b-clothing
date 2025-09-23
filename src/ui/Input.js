import { TextInput, StyleSheet } from 'react-native';

export default function Input(props) {
  return <TextInput {...props} style={[styles.input, props.style]} />;
}

const styles = StyleSheet.create({
  input: { backgroundColor: 'rgba(255,255,255,0.95)', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.7)' },
});


