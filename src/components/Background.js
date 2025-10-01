import { ImageBackground, View, StyleSheet } from 'react-native';

export default function Background({ children }) {
  return (
    <ImageBackground
      source={require('../../assets/new-hero-image.jpg')}
      style={styles.bg}
      resizeMode="cover"
    >
      <View style={styles.overlay} pointerEvents="none" />
      {children}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.15)' },
});


