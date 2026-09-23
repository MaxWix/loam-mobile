import { useState } from "react";
import {
  View,
  Text,
  Share,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { router } from "expo-router";
import ProfileImage from "./ProfileImage";
import Button from "./Button";
import NotificationOverrideModal from "./NotificationOverrideModal";
import ReportSheet from "./ReportSheet";
import { useAuth } from "../stores/auth";
import { blockUser } from "../utils/moderation";
import { colors, typography, spacing, fonts } from "../theme";

export default function ProfileDetails({ profile, isOwnProfile }) {
  const { supabase, session } = useAuth();
  const profileLink = `https://loam.ing/${profile?.username}`;
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showReportSheet, setShowReportSheet] = useState(false);

  const handleBlock = () => {
    setShowActionMenu(false);
    const name = profile?.username || "this user";
    Alert.alert(
      `Block @${name}?`,
      "You won't see each other's posts or comments, and they won't be able to send you requests. You can unblock them in Settings.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block",
          style: "destructive",
          onPress: async () => {
            try {
              await blockUser(supabase, session.user.id, profile.id);
              Alert.alert("Blocked", `@${name} has been blocked.`);
              router.back();
            } catch (e) {
              console.warn("Block failed", e);
              Alert.alert("Error", "Couldn't block right now. Try again.");
            }
          },
        },
      ],
    );
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Connect with me on Loam! ${profileLink}`,
        url: profileLink,
      });
    } catch (e) {
      console.error(e);
    }
  };

  if (!profile) return null;

  return (
    <View style={styles.container}>
      <View style={styles.layout}>
        <View style={styles.detailsSection}>
          <ProfileImage
            src={profile.profile_img}
            alt={profile.username}
            variant="large"
          />
          <View style={styles.profileText}>
            <Text style={styles.displayName}>{profile.display_name}</Text>
            <Text style={styles.username}>@{profile.username}</Text>
          </View>
        </View>

        {isOwnProfile && (
          <View style={styles.headerActions}>
            <Button
              size="icon"
              variant="lime"
              icon="share"
              onPress={handleShare}
            />
            <Button
              size="icon"
              variant="lime"
              icon="edit"
              onPress={() => router.push(`/(app)/profile/edit`)}
            />
          </View>
        )}

        {/* Other people's profiles get the same three-dot action menu the
            post cards use — currently just notification preferences for
            this person, but it's the natural home for anything else
            profile-scoped later. */}
        {!isOwnProfile && (
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => setShowActionMenu((v) => !v)}
              accessibilityLabel="Profile options"
            >
              <Text style={styles.menuDots}>•••</Text>
            </TouchableOpacity>

            {showActionMenu && (
              <View style={styles.actionMenu}>
                <TouchableOpacity
                  style={styles.actionMenuItem}
                  onPress={() => {
                    setShowActionMenu(false);
                    setShowNotificationModal(true);
                  }}
                >
                  <Text style={styles.actionMenuText}>Notifications</Text>
                </TouchableOpacity>
                <View style={styles.actionMenuDivider} />
                <TouchableOpacity
                  style={styles.actionMenuItem}
                  onPress={() => {
                    setShowActionMenu(false);
                    setShowReportSheet(true);
                  }}
                >
                  <Text style={styles.actionMenuText}>Report user</Text>
                </TouchableOpacity>
                <View style={styles.actionMenuDivider} />
                <TouchableOpacity
                  style={styles.actionMenuItem}
                  onPress={handleBlock}
                >
                  <Text
                    style={[styles.actionMenuText, styles.actionMenuDanger]}
                  >
                    Block user
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>

      {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

      {isOwnProfile && (
        <View style={styles.actionButtons}>
          <Button
            variant="brown"
            size="sideBySide"
            onPress={() => router.push("/settings")}
          >
            Manage Account
          </Button>
          <Button
            variant="lime"
            size="sideBySide"
            onPress={() => router.push("/(app)/connections")}
          >
            Manage Buds
          </Button>
        </View>
      )}

      {!isOwnProfile && profile?.id && (
        <ReportSheet
          visible={showReportSheet}
          onClose={() => setShowReportSheet(false)}
          targetType="user"
          targetId={profile.id}
        />
      )}

      {!isOwnProfile && profile?.id && (
        <NotificationOverrideModal
          visible={showNotificationModal}
          onClose={() => setShowNotificationModal(false)}
          scopeType="person"
          scopeId={profile.id}
          scopeLabel={profile.display_name || profile.username}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  layout: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 20,
    width: "100%",
  },
  detailsSection: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 24,
  },
  profileText: {
    flex: 1,
  },
  displayName: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 24,
    color: colors.brown900,
  },
  username: {
    ...typography.hg16,
    color: colors.brown500,
  },
  bio: {
    ...typography.hg14,
    color: colors.brown700,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  headerActions: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "center",
    position: "relative",
  },
  menuButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(182,175,163,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  menuDots: {
    fontSize: 12,
    color: colors.brown500,
    letterSpacing: 1,
  },
  actionMenu: {
    position: "absolute",
    top: 40,
    right: 0,
    backgroundColor: colors.white400,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.brown100,
    zIndex: 20,
    minWidth: 150,
    shadowColor: colors.brown900,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    overflow: "hidden",
  },
  actionMenuItem: {
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  actionMenuText: {
    fontFamily: fonts.primary,
    fontSize: 14,
    color: colors.brown500,
  },
  actionMenuDanger: {
    color: colors.clay500,
  },
  actionMenuDivider: {
    height: 1,
    backgroundColor: colors.brown100,
  },
  actionButtons: {
    flexDirection: "row",
    gap: spacing.md,
  },
});
