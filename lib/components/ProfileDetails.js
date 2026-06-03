import { View, Text, Share, StyleSheet } from "react-native";
import { router } from "expo-router";
import ProfileImage from "./ProfileImage";
import Button from "./Button";
import { colors, typography, spacing, fonts } from "../theme";

export default function ProfileDetails({ profile, isOwnProfile }) {
  const profileLink = `https://loam.ing/${profile?.username}`;

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
            onPress={() => router.push("/connections")}
          >
            Manage Buds
          </Button>
        </View>
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
  },
  headerActions: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "center",
  },
  actionButtons: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.sm,
  },
});
