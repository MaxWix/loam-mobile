import { View, StyleSheet } from "react-native";
import { Image } from "expo-image";

// App-wide replacement for React Native's default spinner. Uses expo-image
// (not the built-in Image) since that's what actually animates GIFs
// reliably — same reasoning as the root loading screen in app/_layout.js.
export default function Loader({ size = 112, style }) {
  return (
    <View style={[styles.container, style]}>
      <Image
        source={require("../../assets/loader.gif")}
        style={{ width: size, height: size }}
        contentFit="contain"
        autoplay
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
});
