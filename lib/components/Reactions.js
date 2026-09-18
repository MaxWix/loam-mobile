import { useMemo, useRef, useEffect } from "react";
import { View, Text, StyleSheet, Animated, Easing } from "react-native";
import {
  parseReactionValue,
  resolveEmojiComponent,
} from "../utils/emojiAssets";
import { colors } from "../theme";
import { MeasuredPressable } from "./ReactorBubble";

const REACTION_BG = {
  F5F5E1: colors.lime500,
  F5EDEB: colors.clay300,
  ECEDE2: colors.green300,
  F3EEE4: colors.brown300,
};

const MINE_SCALE = 1.15;
const POP_PEAK_SCALE = 1.3 * MINE_SCALE;

export default function Reactions({
  reactions = [],
  color = "F3EEE4",
  justAddedEmoji = null,
  lastMineEmoji = null,
  onReactionPress = null,
}) {
  if (!reactions.length) return null;

  const bgColor = REACTION_BG[color] || "#DAD5CC";
  const orderedReactions = useMemo(() => {
    const withStableGroupIndex = reactions.map((r, groupIndex) => ({
      ...r,
      _groupIndex: groupIndex,
    }));
    const mineAll = withStableGroupIndex.filter((r) => r.reacted_by_viewer);
    const others = withStableGroupIndex.filter((r) => !r.reacted_by_viewer);
    const recent = mineAll.filter((r) => r.emoji === lastMineEmoji);
    const restMine = mineAll.filter((r) => r.emoji !== lastMineEmoji);
    const mine = [...recent, ...restMine];
    return [...mine, ...others];
  }, [reactions, lastMineEmoji]);

  const expandedReactions = useMemo(
    () =>
      orderedReactions.flatMap((r) => {
        const count = r.count && r.count > 0 ? r.count : 1;
        return Array.from({ length: count }, (_, idx) => ({
          ...r,
          _isViewerBubble: r.reacted_by_viewer && idx === 0,
          _key: `g${r._groupIndex}-${idx}`,
        }));
      }),
    [orderedReactions],
  );

  const flips = useMemo(
    () =>
      expandedReactions.map(() => ({
        scaleX: Math.random() > 0.5 ? -1 : 1,
        scaleY: Math.random() > 0.5 ? -1 : 1,
      })),
    [expandedReactions.length],
  );

  const popScalesRef = useRef(new Map());
  const animationSeqRef = useRef(new Map());

  const getPopScale = (key) => {
    let value = popScalesRef.current.get(key);
    if (!value) {
      value = new Animated.Value(MINE_SCALE);
      popScalesRef.current.set(key, value);
    }
    return value;
  };

  const highlightKey = useMemo(() => {
    if (!justAddedEmoji) return null;
    const found = expandedReactions.find(
      (r) => r.emoji === justAddedEmoji && r._isViewerBubble,
    );
    return found ? found._key : null;
  }, [expandedReactions, justAddedEmoji]);

  useEffect(() => {
    if (!highlightKey) return;
    const scale = getPopScale(highlightKey);
    const seqMap = animationSeqRef.current;
    const seq = (seqMap.get(highlightKey) || 0) + 1;
    seqMap.set(highlightKey, seq);
    scale.setValue(POP_PEAK_SCALE);
    Animated.timing(scale, {
      toValue: MINE_SCALE,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      if (seqMap.get(highlightKey) === seq) {
        scale.setValue(MINE_SCALE);
      }
    });
  }, [highlightKey]);

  return (
    <View style={styles.container}>
      {expandedReactions.map((r, i) => {
        const parsed = parseReactionValue(r.emoji);
        const EmojiIcon = parsed
          ? resolveEmojiComponent(parsed.key, parsed.tone)
          : null;

        return (
          <Animated.View
            key={r._key}
            style={[
              styles.item,
              {
                zIndex: expandedReactions.length - i,
                marginLeft: i === 0 ? 0 : -8,
              },
              r._isViewerBubble
                ? { transform: [{ scale: getPopScale(r._key) }] }
                : null,
            ]}
          >
            {(() => {
              const circle = (
                <View
                  style={[
                    styles.circle,
                    { backgroundColor: bgColor },
                    {
                      transform: [
                        { scaleX: flips[i].scaleX },
                        { scaleY: flips[i].scaleY },
                      ],
                    },
                  ]}
                >
                  {/* Counter-flip the emoji so it always reads correctly */}
                  {EmojiIcon ? (
                    <EmojiIcon
                      width={22}
                      height={22}
                      style={{
                        transform: [
                          { scaleX: flips[i].scaleX },
                          { scaleY: flips[i].scaleY },
                        ],
                      }}
                    />
                  ) : (
                    <Text
                      style={[
                        styles.emoji,
                        {
                          transform: [
                            { scaleX: flips[i].scaleX },
                            { scaleY: flips[i].scaleY },
                          ],
                        },
                      ]}
                    >
                      {r.emoji}
                    </Text>
                  )}
                </View>
              );

              // Only owners get a press handler (PostCard passes undefined
              // otherwise), so everyone else keeps plain, non-interactive bubbles.
              return onReactionPress ? (
                <MeasuredPressable
                  onPress={(anchor) => onReactionPress(r.emoji, anchor)}
                >
                  {circle}
                </MeasuredPressable>
              ) : (
                circle
              );
            })()}
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingLeft: 2,
    overflow: "visible",
  },
  item: {
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: -1, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 0.9,
    elevation: 2,
  },
  circle: {
    width: 36,
    height: 36,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 22,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: {
    fontSize: 20,
    lineHeight: 24,
  },
});
