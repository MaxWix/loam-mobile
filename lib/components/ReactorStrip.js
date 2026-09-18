import { View, Text, ScrollView, StyleSheet } from "react-native";
import ProfileImage from "./ProfileImage";
import { colors, spacing } from "../theme";
import {
  parseReactionValue,
  resolveEmojiComponent,
} from "../utils/emojiAssets";

// Who reacted to a post: avatar with their emoji tucked in the corner.
// Same visuals as the strip in CommentsSheet.
export default function ReactorsStrip({
  reactors,
  badgeBorderColor = colors.brown50,
}) {
  if (!reactors?.length) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.strip}
    >
      {reactors.map((r) => {
        const parsed = parseReactionValue(r.emoji);
        const EmojiIcon = parsed
          ? resolveEmojiComponent(parsed.key, parsed.tone)
          : null;
        return (
          <View key={`${r.user_id}-${r.emoji}`} style={styles.chip}>
            <ProfileImage
              src={r.author?.profile_img}
              alt={r.author?.display_name || r.author?.username || "Reactor"}
              variant="small"
            />
            <View style={[styles.badge, { borderColor: badgeBorderColor }]}>
              {EmojiIcon ? (
                <EmojiIcon width={14} height={14} />
              ) : (
                <Text style={styles.emojiText}>{r.emoji}</Text>
              )}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
  },
  strip: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
    paddingTop: 2,
    paddingBottom: spacing.sm,
  },
  chip: {
    position: "relative",
  },
  badge: {
    position: "absolute",
    right: -2,
    bottom: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.lime500,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  emojiText: {
    fontSize: 12,
  },
});
