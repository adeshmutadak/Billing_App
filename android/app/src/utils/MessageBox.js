import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

export default function MessageBox({ type = 'success', message, onHide }) {
  const slideAnim = useRef(new Animated.Value(-100)).current; // starts above the screen
  const opacityAnim = useRef(new Animated.Value(0)).current;  // initial opacity 0

  let backgroundColor = '#4BB543'; // success green
  let icon = '✔';

  if (type === 'error') {
    backgroundColor = '#FF4D4F';
    icon = '✖';
  } else if (type === 'warning') {
    backgroundColor = '#FFA500';
    icon = '⚠';
  }

  useEffect(() => {
    // Slide in
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 30, // final top position
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Hide after 3 seconds
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -100,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (onHide) onHide(); // notify parent to remove component
      });
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor },
        { transform: [{ translateY: slideAnim }], opacity: opacityAnim },
      ]}
    >
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.message}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    flexDirection: 'row',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    zIndex: 9999,
    elevation: 10,
  },
  icon: { fontSize: 18, color: '#fff', marginRight: 10 },
  message: { color: '#fff', fontSize: 16, flexShrink: 1 },
});
