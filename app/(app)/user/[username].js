import { View, TouchableOpacity, StyleSheet } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import FadeInScreen from "../../../lib/components/FadeInScreen";
import ProfileScreenBody from "../../../lib/components/ProfileScreenBody";
import { colors, spacing } from "../../../lib/theme";

export default function UserProfileScreen() {
  const { username } = useLocalSearchParams();

  return (
    <FadeInScreen>
      <View style={styles.backRow}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={12}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.brown500} />
        </TouchableOpacity>
      </View>
      <ProfileScreenBody username={username} />
    </FadeInScreen>
  );
}

const styles = StyleSheet.create({
  backRow: {
    paddingTop: 56,
    paddingHorizontal: spacing.screenHorizontal,
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: "flex-start",
    justifyContent: "center",
  },
});
