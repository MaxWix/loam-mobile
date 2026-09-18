import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { router } from "expo-router";
import { colors, layout, buttons, spacing, typography } from "../../lib/theme";

export default function EducationScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.wordmark}>loam</Text>

      <View style={styles.content}>
        <Text style={styles.title}>Let's complete your profile</Text>
        <Text style={styles.body}>
          To add a profile item, search from different media types or make a
          custom post for updates that don't fit into a category. Any updates to
          your profile will populate on your connections' feeds.
        </Text>
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push("/onboarding/notifications")}
      >
        <Text style={styles.buttonText}>Next</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...layout.screen,
    ...layout.screenContent,
  },
  wordmark: layout.wordmark,
  content: {
    flex: 1,
    justifyContent: "center",
  },
  title: {
    ...typography.h1,
    color: colors.brown900,
    marginBottom: spacing.lg,
  },
  body: {
    ...typography.hg16,
    color: colors.brown500,
    lineHeight: 26,
  },
  button: buttons.primary,
  buttonText: buttons.primaryText,
});
