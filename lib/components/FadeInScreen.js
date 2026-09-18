import { useRef, useState, useCallback } from "react";
import { Animated, StyleSheet } from "react-native";
import { useFocusEffect } from "expo-router";

// Wrap a tab screen's root content in this to get a fade-in each time the
// tab is switched to. Bottom tabs keep screens mounted and just swap
// visibility, so this listens for focus via expo-router's useFocusEffect
// rather than a one-time mount effect.
export default function FadeInScreen({ children, style }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      opacity.setValue(0);
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }, []),
  );

  return (
    <Animated.View style={[styles.fill, { opacity }, style]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
