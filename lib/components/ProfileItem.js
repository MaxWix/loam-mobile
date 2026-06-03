import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";
import { colors, typography, spacing, radius, fonts } from "../theme";

// Inline SVG background paths — mirrors the 4 background SVGs from the web app
const BACKGROUNDS = {
  F3EEE4: {
    color: colors.brown50,
    path: "M8.89625 347.555C-8.76673 336.514 4.74257 81.5901 8.16367 21.794C8.5866 14.4018 13.9813 8.49062 21.3318 7.59935C53.6813 3.67685 150.966 -4.93056 334.343 3.73077C373.519 5.58116 359.107 276.701 355.063 342.04C354.563 350.115 348.148 356.384 340.066 356.742C279.454 359.425 42.3656 368.476 8.89625 347.555Z",
  },
  F5EDEB: {
    color: colors.clay50,
    path: "M8.89625 347.555C-8.76673 336.514 4.74257 81.5901 8.16367 21.794C8.5866 14.4018 13.9813 8.49062 21.3318 7.59935C53.6813 3.67685 150.966 -4.93056 334.343 3.73077C373.519 5.58116 359.107 276.701 355.063 342.04C354.563 350.115 348.148 356.384 340.066 356.742C279.454 359.425 42.3656 368.476 8.89625 347.555Z",
  },
  ECEDE2: {
    color: colors.green50,
    path: "M8.89625 347.555C-8.76673 336.514 4.74257 81.5901 8.16367 21.794C8.5866 14.4018 13.9813 8.49062 21.3318 7.59935C53.6813 3.67685 150.966 -4.93056 334.343 3.73077C373.519 5.58116 359.107 276.701 355.063 342.04C354.563 350.115 348.148 356.384 340.066 356.742C279.454 359.425 42.3656 368.476 8.89625 347.555Z",
  },
  F5F5E1: {
    color: colors.lime100,
    path: "M8.89625 347.555C-8.76673 336.514 4.74257 81.5901 8.16367 21.794C8.5866 14.4018 13.9813 8.49062 21.3318 7.59935C53.6813 3.67685 150.966 -4.93056 334.343 3.73077C373.519 5.58116 359.107 276.701 355.063 342.04C354.563 350.115 348.148 356.384 340.066 356.742C279.454 359.425 42.3656 368.476 8.89625 347.555Z",
  },
};

const CATEGORY_ICONS = {
  listening: "🎵",
  watching: "🎬",
  reading: "📚",
};

function getBackground(color) {
  if (!color) return BACKGROUNDS["F3EEE4"];
  const normalized = color.toUpperCase().replace(/^#/, "");
  return BACKGROUNDS[normalized] || BACKGROUNDS["F3EEE4"];
}

function getSubtitle(category, subtitle) {
  if (!subtitle) return "";
  const cat = (category || "").toLowerCase();
  if (cat === "watching") {
    const yearMatch = subtitle.match(/(19|20)\d{2}/);
    return yearMatch ? yearMatch[0] : subtitle;
  }
  if (cat === "listening") {
    const parts = subtitle.split("•");
    return (parts.length > 1 ? parts.slice(1).join("•") : subtitle).trim();
  }
  return subtitle;
}

function hasValidMedia(url) {
  if (!url) return false;
  if (url.includes("via.placeholder.com")) return false;
  if (url.includes("placehold.co")) return false;
  return true;
}

export default function ProfileItem({ item, onPress }) {
  const bg = getBackground(item?.color);
  const category = (item?.category || "").toLowerCase();
  const title = item?.title || "";
  const subtitle = getSubtitle(category, item?.subtitle);
  const mediaUrl = item?.media_url || item?.img_url || "";
  const showMedia = hasValidMedia(mediaUrl);
  const icon = CATEGORY_ICONS[category];

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      {/* Organic background SVG */}
      <View style={StyleSheet.absoluteFill}>
        <Svg
          width="100%"
          height="100%"
          viewBox="0 0 361 361"
          preserveAspectRatio="xMidYMid slice"
        >
          <Path d={bg.path} fill={bg.color} />
        </Svg>
      </View>

      {/* Card content */}
      <View style={styles.content}>
        {showMedia && (
          <View style={styles.mediaWrapper}>
            <Image
              source={{ uri: mediaUrl }}
              style={styles.media}
              resizeMode="cover"
            />
            {icon && (
              <View style={styles.iconBadge}>
                <Text style={styles.iconText}>{icon}</Text>
              </View>
            )}
          </View>
        )}

        {title ? (
          <Text style={styles.title} numberOfLines={3}>
            {title}
          </Text>
        ) : null}

        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}

        {item?.caption ? (
          <Text style={styles.caption} numberOfLines={3}>
            {item.caption}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 12,
    position: "relative",
    minHeight: 80,
  },
  content: {
    padding: spacing.md,
  },
  mediaWrapper: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: spacing.sm,
    position: "relative",
  },
  media: {
    width: "100%",
    height: "100%",
  },
  iconBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  iconText: {
    fontSize: 12,
  },
  title: {
    ...typography.bg18Bold,
    color: colors.brown500,
    marginBottom: 2,
    lineHeight: 22,
  },
  subtitle: {
    fontFamily: fonts.primary,
    fontSize: 14,
    color: colors.brown300,
    marginTop: 2,
  },
  caption: {
    fontFamily: fonts.primary,
    fontSize: 14,
    color: colors.brown500,
    marginTop: spacing.xs,
  },
});
