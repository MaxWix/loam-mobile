import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { useAuth } from "../../../lib/stores/auth";
import { unregisterPushToken } from "../../../lib/utils/pushTokens";
import { colors, fonts, spacing, typography } from "../../../lib/theme";
import { useEffect, useState } from "react";

function SettingsRow({ label, onPress, danger }) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress}>
      <Text style={[styles.rowLabel, danger && styles.rowLabelDanger]}>
        {label}
      </Text>
      <Text style={styles.rowArrow}>›</Text>
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const { supabase, session } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!session) return;
    supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", session.user.id)
      .single()
      .then(({ data }) => setIsAdmin(data?.is_admin ?? false));
  }, [session]);

  const handleLogout = async () => {
    console.log("Logging out user:", session?.user?.id);
    // Drop this device's token first — otherwise notifications for the
    // signed-out account keep arriving here.
    // await unregisterPushToken(supabase);
    await supabase.auth.signOut();
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <TouchableOpacity
        style={styles.backRow}
        onPress={() => router.replace("/(app)/profile")}
      >
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Manage Account</Text>

      <View style={styles.section}>
        <SettingsRow
          label="Legal"
          onPress={() => router.push("/(app)/settings/legal")}
        />
        <SettingsRow
          label="Update Password"
          onPress={() => router.push("/(app)/settings/update-password")}
        />
        <SettingsRow
          label="Notifications"
          onPress={() => router.push("/(app)/settings/notifications")}
        />
        <SettingsRow
          label="Reaction Emoji Color"
          onPress={() => router.push("/(app)/settings/emoji-color")}
        />
        <SettingsRow
          label="Music Streaming Service"
          onPress={() => router.push("/(app)/settings/music-service")}
        />
        <SettingsRow
          label="Connect your Phone Number"
          onPress={() => router.push("/(app)/settings/phone")}
        />
        <SettingsRow
          label="Blocked Users"
          onPress={() => router.push("/(app)/settings/blocked")}
        />
        {isAdmin && (
          <SettingsRow
            label="Platform Admin"
            onPress={() => Alert.alert("Admin", "Admin panel coming soon.")}
          />
        )}
        <SettingsRow
          label="Delete Account"
          danger
          onPress={() => router.push("/(app)/settings/delete-account")}
        />
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  container: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: 60,
    paddingBottom: spacing.xxl,
  },
  backRow: {
    marginBottom: spacing.md,
  },
  backText: {
    fontFamily: fonts.primary,
    fontSize: 16,
    color: colors.brown500,
  },
  title: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 24,
    color: colors.brown900,
    marginBottom: spacing.xl,
    marginTop: spacing.md,
  },
  section: {
    borderTopWidth: 1,
    borderTopColor: colors.brown100,
    marginBottom: spacing.xl,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.brown100,
  },
  rowLabel: {
    fontFamily: fonts.primary,
    fontSize: 16,
    color: colors.brown700,
  },
  rowLabelDanger: {
    color: colors.clay500,
  },
  rowArrow: {
    fontFamily: fonts.primary,
    fontSize: 20,
    color: colors.brown200,
  },
  logoutButton: {
    borderWidth: 2,
    borderColor: colors.brown500,
    borderRadius: 44,
    paddingVertical: 14,
    alignItems: "center",
  },
  logoutText: {
    fontFamily: fonts.primaryBold,
    fontSize: 14,
    color: colors.brown500,
  },
});
