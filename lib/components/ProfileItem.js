import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";
import { colors, typography, spacing, radius, fonts } from "../theme";

// Inline SVG background paths — mirrors the 4 background SVGs from the web app
const BACKGROUNDS = {
  F3EEE4: {
    color: colors.brown100,
    path: "M8.89625 347.555C-8.76673 336.514 4.74257 81.5901 8.16367 21.794C8.5866 14.4018 13.9813 8.49062 21.3318 7.59935C53.6813 3.67685 150.966 -4.93056 334.343 3.73077C373.519 5.58116 359.107 276.701 355.063 342.04C354.563 350.115 348.148 356.384 340.066 356.742C279.454 359.425 42.3656 368.476 8.89625 347.555Z",
  },
  F5EDEB: {
    color: colors.clay100,
    path: "M8.89625 347.555C-8.76673 336.514 4.74257 81.5901 8.16367 21.794C8.5866 14.4018 13.9813 8.49062 21.3318 7.59935C53.6813 3.67685 150.966 -4.93056 334.343 3.73077C373.519 5.58116 359.107 276.701 355.063 342.04C354.563 350.115 348.148 356.384 340.066 356.742C279.454 359.425 42.3656 368.476 8.89625 347.555Z",
  },
  ECEDE2: {
    color: colors.green100,
    path: "M8.89625 347.555C-8.76673 336.514 4.74257 81.5901 8.16367 21.794C8.5866 14.4018 13.9813 8.49062 21.3318 7.59935C53.6813 3.67685 150.966 -4.93056 334.343 3.73077C373.519 5.58116 359.107 276.701 355.063 342.04C354.563 350.115 348.148 356.384 340.066 356.742C279.454 359.425 42.3656 368.476 8.89625 347.555Z",
  },
  F5F5E1: {
    color: colors.lime300,
    path: "M8.89625 347.555C-8.76673 336.514 4.74257 81.5901 8.16367 21.794C8.5866 14.4018 13.9813 8.49062 21.3318 7.59935C53.6813 3.67685 150.966 -4.93056 334.343 3.73077C373.519 5.58116 359.107 276.701 355.063 342.04C354.563 350.115 348.148 356.384 340.066 356.742C279.454 359.425 42.3656 368.476 8.89625 347.555Z",
  },
};

// Category badge — same SVG paths and badge colors as PostCard.js, so the
// icon reads identically wherever a post shows up in the app, not just on
// the feed.
const READING_PATH =
  "M18.0571 32.0103C16.7438 30.9706 15.3212 30.1635 13.789 29.589C12.2569 29.0144 10.6701 28.7272 9.02853 28.7272C7.87945 28.7272 6.75088 28.8776 5.64283 29.1786C4.53479 29.4795 3.47462 29.9036 2.46233 30.4508C1.88778 30.7517 1.33376 30.7381 0.800257 30.4097C0.266752 30.0814 0 29.6027 0 28.9734V9.19269C0 8.89174 0.0752378 8.60447 0.225713 8.33088C0.376189 8.05728 0.601902 7.85209 0.902854 7.71529C2.16138 7.05867 3.47462 6.56621 4.84258 6.2379C6.21054 5.90959 7.60586 5.74543 9.02853 5.74543C10.6154 5.74543 12.168 5.95063 13.6864 6.36101C15.2049 6.7714 16.6618 7.38698 18.0571 8.20776V28.0705C19.4524 27.195 20.9161 26.5384 22.4482 26.1007C23.9803 25.6629 25.5261 25.4441 27.0856 25.4441C28.0705 25.4441 29.035 25.5261 29.9788 25.6903C30.9227 25.8544 31.8735 26.1007 32.831 26.429V6.73036C33.2414 6.86716 33.645 7.01079 34.0417 7.16127C34.4384 7.31175 34.8283 7.49642 35.2113 7.71529C35.5122 7.85209 35.738 8.05728 35.8884 8.33088C36.0389 8.60447 36.1141 8.89174 36.1141 9.19269V28.9734C36.1141 29.6027 35.8474 30.0814 35.3139 30.4097C34.7804 30.7381 34.2264 30.7517 33.6518 30.4508C32.6395 29.9036 31.5794 29.4795 30.4713 29.1786C29.3633 28.8776 28.2347 28.7272 27.0856 28.7272C25.4441 28.7272 23.8572 29.0144 22.3251 29.589C20.793 30.1635 19.3703 30.9706 18.0571 32.0103Z";
const LISTENING_PATH =
  "M6.42697 28.2787C4.65955 28.2787 3.14654 27.6633 1.88792 26.4327C0.629307 25.202 0 23.7226 0 21.9945C0 20.2664 0.629307 18.787 1.88792 17.5563C3.14654 16.3257 4.65955 15.7104 6.42697 15.7104C7.04288 15.7104 7.61194 15.7824 8.13413 15.9264C8.65632 16.0704 9.15843 16.2864 9.64045 16.5744V3.14207L28.9213 0V18.8524C28.9213 20.5806 28.292 22.06 27.0334 23.2906C25.7748 24.5213 24.2618 25.1366 22.4944 25.1366C20.727 25.1366 19.2139 24.5213 17.9553 23.2906C16.6967 22.06 16.0674 20.5806 16.0674 18.8524C16.0674 17.1243 16.6967 15.6449 17.9553 14.4143C19.2139 13.1836 20.727 12.5683 22.4944 12.5683C23.1103 12.5683 23.6794 12.6403 24.2015 12.7843C24.7237 12.9283 25.2258 13.1443 25.7079 13.4324V6.95184L12.8539 9.42622V21.9945C12.8539 23.7226 12.2246 25.202 10.966 26.4327C9.7074 27.6633 8.19438 28.2787 6.42697 28.2787Z";
const WATCHING_PATH =
  "M3.58333 0L7.16667 7.16667H12.5417L8.95833 0H12.5417L16.125 7.16667H21.5L17.9167 0H21.5L25.0833 7.16667H30.4583L26.875 0H32.25C33.2354 0 34.079 0.350868 34.7807 1.0526C35.4825 1.75434 35.8333 2.59792 35.8333 3.58333V25.0833C35.8333 26.0688 35.4825 26.9123 34.7807 27.6141C34.079 28.3158 33.2354 28.6667 32.25 28.6667H3.58333C2.59792 28.6667 1.75434 28.3158 1.0526 27.6141C0.350868 26.9123 0 26.0688 0 25.0833V3.58333C0 2.59792 0.350868 1.75434 1.0526 1.0526C1.75434 0.350868 2.59792 0 3.58333 0ZM3.58333 10.75V25.0833H32.25V10.75H3.58333Z";

const BADGE_COLORS = {
  F5F5E1: { bg: "#CFD0A3", fg: "#5A6145" },
  F5EDEB: { bg: "#DCC0B5", fg: "#9E5135" },
  ECEDE2: { bg: "#CFD0A3", fg: "#5A6145" },
  F3EEE4: { bg: "#B6AFA3", fg: "#462B01" },
};

function getBadgeColors(color) {
  const normalized = (color || "F3EEE4").toUpperCase().replace(/^#/, "");
  return BADGE_COLORS[normalized] || BADGE_COLORS["F3EEE4"];
}

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
  const showCategoryBadge =
    category === "reading" ||
    category === "listening" ||
    category === "watching";
  const badgeColors = getBadgeColors(item?.color);

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
            <View style={styles.mediaClip}>
              <Image
                source={{ uri: mediaUrl }}
                style={styles.media}
                resizeMode="cover"
              />
            </View>
            {showCategoryBadge && (
              <View
                style={[styles.iconBadge, { backgroundColor: badgeColors.bg }]}
              >
                <Svg
                  width={14}
                  height={14}
                  viewBox={
                    category === "reading"
                      ? "0 0 37 33"
                      : category === "listening"
                        ? "0 0 29 29"
                        : "0 0 36 29"
                  }
                >
                  <Path
                    d={
                      category === "reading"
                        ? READING_PATH
                        : category === "listening"
                          ? LISTENING_PATH
                          : WATCHING_PATH
                    }
                    fill={badgeColors.fg}
                  />
                </Svg>
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
    marginBottom: spacing.sm,
    position: "relative",
  },
  mediaClip: {
    width: "100%",
    height: "100%",
    borderRadius: 4,
    overflow: "hidden",
  },
  media: {
    width: "100%",
    height: "100%",
  },
  iconBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    ...typography.bg18Bold,
    color: colors.brown500,
    lineHeight: 22,
  },
  subtitle: {
    fontFamily: fonts.primary,
    fontSize: 14,
    color: colors.brown500,
  },
  caption: {
    fontFamily: fonts.primary,
    fontSize: 14,
    color: colors.brown500,
    marginTop: spacing.sm,
    marginBottom: 0,
  },
});
