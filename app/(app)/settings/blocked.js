import { useCallback, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useAuth } from "../../../lib/stores/auth";
import ProfileImage from "../../../lib/components/ProfileImage";
import {
  fetchBlockedProfiles,
  unblockUser,
} from "../../../lib/utils/moderation";
import { colors, fonts, spacing } from "../../../lib/theme";

export default function BlockedUsersScreen() {
  const { supabase, session } = useAuth();
  const [rows, setRows] = useState(null); // null = loading
  const [busyId, setBusyId] = useState(null);

  useFocusEffect(
    useCallback(() => {
      if (!session?.user?.id) return;
      fetchBlockedProfiles(supabase, session.user.id)
        .then(setRows)
        .catch((e) => {
          console.warn("Failed to load blocked users", e);
          setRows([]);
        });
    }, [session?.user?.id, supabase]),
  );

  const handleUnblock = (row) => {
    const name = row.profile?.username || "this user";
    Alert.alert(`Unblock @${name}?`, "They'll be able to find you again.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Unblock",
        onPress: async () => {
          setBusyId(row.blocked_id);
          try {
            await unblockUser(supabase, session.user.id, row.blocked_id);
            setRows((prev) =>
              (prev || []).filter((r) => r.blocked_id !== row.blocked_id),
            );
          } catch (e) {
            console.warn("Unblock failed", e);
            Alert.alert("Error", "Couldn't unblock right now. Try again.");
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <TouchableOpacity style={styles.backRow} onPress={() => router.back()}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Blocked Users</Text>
      <Text style={styles.subtitle}>
        Blocked users can't see your posts or comments, and you won't see
        theirs.
      </Text>

      {rows === null ? (
        <ActivityIndicator
          color={colors.brown500}
          style={{ marginTop: spacing.xl }}
        />
      ) : rows.length === 0 ? (
        <Text style={styles.empty}>You haven't blocked anyone.</Text>
      ) : (
        rows.map((row) => (
          <View key={row.blocked_id} style={styles.row}>
            <ProfileImage src={row.profile?.profile_img} variant="small" />
            <View style={styles.rowText}>
              <Text style={styles.rowName} numberOfLines={1}>
                {row.profile?.display_name ||
                  row.profile?.username ||
                  "Unknown"}
              </Text>
              {row.profile?.username ? (
                <Text style={styles.rowUsername} numberOfLines={1}>
                  @{row.profile.username}
                </Text>
              ) : null}
            </View>
            <TouchableOpacity
              style={styles.unblockButton}
              onPress={() => handleUnblock(row)}
              disabled={busyId === row.blocked_id}
            >
              <Text style={styles.unblockText}>
                {busyId === row.blocked_id ? "..." : "Unblock"}
              </Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.brown50,
  },
  container: {
    paddingTop: 64,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  backRow: {
    marginBottom: spacing.md,
  },
  backText: {
    fontFamily: fonts.primary,
    fontSize: 15,
    color: colors.brown300,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 24,
    color: colors.brown900,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontFamily: fonts.primary,
    fontSize: 14,
    color: colors.brown300,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  empty: {
    fontFamily: fonts.primary,
    fontSize: 14,
    color: colors.brown300,
    textAlign: "center",
    paddingVertical: spacing.xl,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  rowText: {
    flex: 1,
  },
  rowName: {
    fontFamily: fonts.primaryBold,
    fontSize: 15,
    color: colors.brown700,
  },
  rowUsername: {
    fontFamily: fonts.primary,
    fontSize: 13,
    color: colors.brown300,
  },
  unblockButton: {
    backgroundColor: colors.brown500,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    borderRadius: 44,
  },
  unblockText: {
    fontFamily: fonts.primaryBold,
    fontSize: 13,
    color: colors.white200,
  },
});
