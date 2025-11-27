import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { COLORS, FONTS, SIZES } from '../../utils/theme'; // import theme

export default function LandingScreen({ navigation }) {

  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace("Login"); // navigate to Login screen
    }, 2000); // 2 seconds

    return () => clearTimeout(timer); // cleanup
  }, []);

  return (
    <View style={styles.container}>
      {/* Logo */}
      <Image
        source={require('../../Assets/Images/logo.jpg')} // your logo path
        style={styles.logo}
      />

      {/* App Name */}
      <Text style={styles.title}>MilkBook</Text>

      {/* Tagline */}
      <Text style={styles.subtitle}>Easy Milk Tracking </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.padding,
  },
  logo: {
    width: 150,
    height: 150,
    borderRadius: 60,   // circular logo
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    color: COLORS.primary,
    fontFamily: FONTS.bold,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontFamily: FONTS.medium,
  },
});
