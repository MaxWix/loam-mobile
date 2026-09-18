import { TouchableOpacity, View, StyleSheet } from "react-native";
import { EMOJI_TONES, resolveEmojiComponent } from "../utils/emojiAssets";
import { colors } from "../theme";

/**
 * Row of 4 tone swatches, ported from the web app's EmojiColorPicker.svelte.
 * Same preview emoji rendered in each of the 4 tones so the user can compare
 * them directly, same selected-state border treatment.
 */
export default function EmojiColorPicker({
  value = null,
  onSelect = () => {},
  previewKey = "thumbsup",
}) {
  return (
    <View style={styles.row}>
      {EMOJI_TONES.map((tone) => {
        const EmojiIcon = resolveEmojiComponent(previewKey, tone);
        const selected = value === tone;
        return (
          <TouchableOpacity
            key={tone}
            style={[styles.toneOption, selected && styles.toneOptionSelected]}
            onPress={() => onSelect(tone)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`Emoji color ${tone}`}
          >
            {EmojiIcon ? <EmojiIcon width={32} height={32} /> : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "center",
    flexWrap: "wrap",
  },
  toneOption: {
    width: 56,
    height: 56,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 29,
    borderBottomRightRadius: 32,
    borderBottomLeftRadius: 30,
    borderWidth: 3,
    borderColor: "transparent",
    backgroundColor: colors.lime500,
    alignItems: "center",
    justifyContent: "center",
  },
  toneOptionSelected: {
    borderColor: colors.lime700,
  },
});
