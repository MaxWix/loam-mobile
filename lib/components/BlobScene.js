import { useMemo } from "react";
import { View, StyleSheet, Dimensions, Animated } from "react-native";
import ListeningBlob from "../../assets/icons/listeningBlob.svg";
import ReadingBlob from "../../assets/icons/readingBlob.svg";
import WatchingBlob from "../../assets/icons/watchingBlob.svg";
import ListeningIcon from "../../assets/icons/listeningIcon.svg";
import ReadingIcon from "../../assets/icons/readingIcon.svg";
import WatchingIcon from "../../assets/icons/watchingIcon.svg";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// TEMP DIAGNOSTIC — set back to false once the blobs are confirmed.
// true: red-tints the scene, bypasses all animation (everything fully
// visible), draws a solid box beside each SVG, and logs what the SVG
// imports resolved to. Each of those isolates a different failure layer.
const DEBUG = true;

/**
 * Ambient background blobs for the media tabs, ported from web's
 * BlobScene.svelte. Whichever tab is active gets its blob full-size,
 * opaque, and showing its icon; the other two shrink, fade, and drift
 * toward the edges.
 *
 * Unlike web, this is driven by the PagerView's *scroll position* rather
 * than by discrete tab changes — `progress` is a continuous page index
 * (2.4 = 40% of the way from Listening to Watching), so the blobs move
 * with a swipe in progress instead of snapping after it lands. Tapping a
 * tab animates the pager, which drives the same value, so both input
 * methods share one animation path.
 *
 * Purely decorative: pointerEvents="none" throughout, so the swipe and
 * every control above it are unaffected.
 *
 * @param {Animated.Value} progress - continuous page index from PagerView
 */
export default function BlobScene({ progress }) {
  if (DEBUG) {
    // A working transformer import is a component (function/object).
    // A number here means Metro treated the .svg as a plain image asset,
    // i.e. the transformer isn't applied to this path.
    console.log("[BlobScene] imports:", {
      ListeningBlob: typeof ListeningBlob,
      WatchingBlob: typeof WatchingBlob,
      ReadingBlob: typeof ReadingBlob,
      ListeningIcon: typeof ListeningIcon,
    });
  }

  // Page indices in POST_TABS order: text, photo, listening, watching,
  // reading. Only the last three have blobs.
  const BLOBS = useMemo(
    () => [
      {
        key: "listening",
        page: 2,
        Blob: ListeningBlob,
        Icon: ListeningIcon,
        // Resting spot when active, and where it drifts when not.
        size: { w: 300, h: 323 },
        style: { top: -40, left: -40 },
        iconSize: 118,
        active: { x: 40, y: 80 },
        inactive: { x: -60, y: -60 },
      },
      {
        key: "watching",
        page: 3,
        Blob: WatchingBlob,
        Icon: WatchingIcon,
        size: { w: 319, h: 308 },
        style: { bottom: -60, left: SCREEN_WIDTH / 2 - 160 },
        iconSize: 118,
        active: { x: 0, y: -20 },
        inactive: { x: 0, y: 110 },
      },
      {
        key: "reading",
        page: 4,
        Blob: ReadingBlob,
        Icon: ReadingIcon,
        size: { w: 238, h: 325 },
        style: { top: 20, right: -60 },
        iconSize: 87,
        active: { x: 0, y: 0 },
        inactive: { x: 120, y: -40 },
      },
    ],
    [],
  );

  return (
    <View
      style={[styles.scene, DEBUG && { backgroundColor: "rgba(255,0,0,0.25)" }]}
      pointerEvents="none"
    >
      {BLOBS.map(
        ({
          key,
          page,
          Blob,
          Icon,
          style,
          size,
          iconSize,
          active,
          inactive,
        }) => {
          // Each blob peaks on its own page and falls off on either side.
          // The one-page-wide ramp means a swipe cross-fades the two blobs
          // it's between rather than switching at the midpoint.
          const range = [page - 1, page, page + 1];

          const translateX = progress.interpolate({
            inputRange: range,
            outputRange: [inactive.x, active.x, inactive.x],
            extrapolate: "clamp",
          });
          const translateY = progress.interpolate({
            inputRange: range,
            outputRange: [inactive.y, active.y, inactive.y],
            extrapolate: "clamp",
          });
          const scale = progress.interpolate({
            inputRange: range,
            outputRange: [0.8, 1, 0.8],
            extrapolate: "clamp",
          });
          const opacity = progress.interpolate({
            // Fades out entirely by the time you reach the non-media tabs
            // (text/photo), where the scene shouldn't show at all.
            inputRange: [page - 2, page - 1, page, page + 1, page + 2],
            outputRange: [0, 0.5, 1, 0.5, 0],
            extrapolate: "clamp",
          });
          const iconOpacity = progress.interpolate({
            inputRange: [page - 0.5, page, page + 0.5],
            outputRange: [0, 1, 0],
            extrapolate: "clamp",
          });

          return (
            <Animated.View
              key={key}
              style={[
                styles.blob,
                style,
                { width: size.w, height: size.h },
                {
                  opacity,
                  transform: [{ translateX }, { translateY }, { scale }],
                },
              ]}
            >
              <Blob width={size.w} height={size.h} />
              <Animated.View
                style={[styles.iconWrap, { opacity: iconOpacity }]}
              >
                <Icon width={iconSize} height={iconSize} />
              </Animated.View>
            </Animated.View>
          );
        },
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  scene: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
    zIndex: 10,
    elevation: 10,
  },
  blob: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
});
