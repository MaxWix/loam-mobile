import { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
} from "react-native";
import AddCommentIcon from "../../assets/AddComment.svg";
import { colors, fonts, spacing } from "../theme";

const CYCLE_MS = 5000;
const FADE_MS = 260;

// Corner radii are drawn from two separate bands rather than one range, so
// the two diagonals always contrast. Picking both from a single range lets
// them land close together, which flattens the pill into a plain rounded
// rectangle and loses the organic character.
// The low band stays well above 0 so no corner looks squared off; the high
// band is capped near half the 36px height so a corner can't round past
// the pill itself.
const RADIUS_SMALL_MIN = 9;
const RADIUS_SMALL_MAX = 15;
const RADIUS_LARGE_MIN = 20;
const RADIUS_LARGE_MAX = 26;

/**
 * Deterministic pseudo-random corner radii, derived from the post id.
 *
 * Deliberately not Math.random(): cards unmount and remount as the feed
 * scrolls, and a fresh shape on every remount reads as flickering. Hashing
 * a stable seed means each post keeps its own shape for good while still
 * varying across the feed.
 *
 * Opposite corners are paired (TL with BR, TR with BL) so the result stays
 * on the same diagonal-lean as the action buttons rather than looking like
 * four unrelated corners.
 *
 * @param {string|undefined} seed
 */
function organicRadii(seed) {
  // FNV-1a — small, fast, and spreads similar strings (sequential UUIDs)
  // across very different values.
  let hash = 2166136261;
  const str = String(seed ?? "");
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  // Pull two independent values out of the one hash.
  const a = (hash >>> 0) % 1000;
  const b = ((hash >>> 10) >>> 0) % 1000;

  const big =
    RADIUS_LARGE_MIN +
    Math.round((a / 1000) * (RADIUS_LARGE_MAX - RADIUS_LARGE_MIN));
  const small =
    RADIUS_SMALL_MIN +
    Math.round((b / 1000) * (RADIUS_SMALL_MAX - RADIUS_SMALL_MIN));

  // A third bit off the hash decides which diagonal leads, so the lean
  // direction varies across the feed too rather than always tilting the
  // same way.
  const leadsTopLeft = ((hash >>> 20) & 1) === 0;

  return {
    borderTopLeftRadius: leadsTopLeft ? big : small,
    borderBottomRightRadius: leadsTopLeft ? big : small,
    borderTopRightRadius: leadsTopLeft ? small : big,
    borderBottomLeftRadius: leadsTopLeft ? small : big,
  };
}

/**
 * Ticker of recent comments in the post card footer, replacing what used
 * to be a bare comment button. Tapping anywhere on it opens the full
 * comments sheet.
 *
 * Preview text comes bundled with the feed response (`comment_preview`)
 * rather than being fetched per card — one request for the whole feed
 * instead of one per post.
 *
 * Cycling pauses at a single comment (nothing to cycle to) and the whole
 * thing degrades to a plain "Add a comment" prompt when there are none,
 * so the affordance never disappears.
 */
export default function CommentTicker({
  comments = [],
  count = 0,
  onPress,
  textColor = colors.brown500,
  backgroundColor,
  seed,
}) {
  const [index, setIndex] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;
  // Read inside the interval callback so the timer doesn't need to be torn
  // down and rebuilt every time the index changes.
  const indexRef = useRef(0);
  indexRef.current = index;

  const radii = useMemo(() => organicRadii(seed), [seed]);

  useEffect(() => {
    if (comments.length <= 1) return;

    const timer = setInterval(() => {
      // Fade out, swap the text while invisible, fade back in — avoids the
      // cross-fade ghosting you'd get from animating two overlaid copies.
      Animated.timing(fade, {
        toValue: 0,
        duration: FADE_MS,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished) return;
        setIndex((indexRef.current + 1) % comments.length);
        Animated.timing(fade, {
          toValue: 1,
          duration: FADE_MS,
          useNativeDriver: true,
        }).start();
      });
    }, CYCLE_MS);

    return () => clearInterval(timer);
  }, [comments.length, fade]);

  // A post can lose comments (deleted, or a refetch returns fewer) while
  // this is mid-cycle, which would otherwise leave index out of range.
  useEffect(() => {
    if (index >= comments.length) setIndex(0);
  }, [comments.length, index]);

  const current = comments[index];

  return (
    <TouchableOpacity
      style={[
        styles.container,
        radii,
        backgroundColor ? { backgroundColor } : null,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={
        count > 0 ? `${count} comments, tap to view` : "Add a comment"
      }
    >
      <AddCommentIcon width={18} height={18} style={styles.icon} />

      <View style={styles.textWrap}>
        {current ? (
          <Animated.View style={{ opacity: fade }}>
            <Text style={[styles.text, { color: textColor }]} numberOfLines={1}>
              <Text style={styles.author}>{current.author} </Text>
              {current.content}
            </Text>
          </Animated.View>
        ) : (
          <Text style={[styles.placeholder, { color: textColor }]}>
            Add a comment
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    // Matches the action buttons' height so the footer row stays level
    // whether a comment is showing or not.
    height: 36,
    paddingHorizontal: 12,
    // Corner radii are applied inline per post (see organicRadii above),
    // so each card's pill has its own shape.
  },
  icon: {
    opacity: 0.75,
  },
  textWrap: {
    flex: 1,
  },
  text: {
    fontFamily: fonts.primary,
    fontSize: 12,
    lineHeight: 16,
  },
  author: {
    fontFamily: fonts.primaryBold,
  },
  placeholder: {
    fontFamily: fonts.primary,
    fontSize: 12,
    opacity: 0.65,
  },
});
