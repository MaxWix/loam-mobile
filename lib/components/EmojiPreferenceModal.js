import { useState } from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useAuth } from "../stores/auth";
import EmojiColorPicker from "./EmojiColorPicker";
import { DEFAULT_EMOJI_TONE } from "../utils/emojiAssets";
import { colors, fonts, spacing } from "../theme";

/**
 * First-time modal prompting the user to pick their reaction emoji color.
 * Ported from the web app's EmojiPreferenceModal.svelte — same copy, same
 * "must save to close" behavior (no dismiss/cancel), shown once when the
 * user's profile has no emoji_skin_tone set yet.
 *
 * Unlike web (which does a full window reload after saving), onSaved(tone)
 * is called so the parent screen can just update its own local state.
 */
export default function EmojiPreferenceModal({
  isOpen = false,
  onSaved = () => {},
}) {
  const { supabase, session } = useAuth();
  const [selectedTone, setSelectedTone] = useState(DEFAULT_EMOJI_TONE);
  const [saving, setSaving] = useState(false);

  const saveAndClose = async () => {
    if (saving || !session?.user?.id) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ emoji_skin_tone: selectedTone })
        .eq("id", session.user.id);

      if (!error) {
        onSaved(selectedTone);
      }
    } catch (e) {
      console.error("Failed to save emoji color preference", e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={isOpen} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Pick your emoji skin tone</Text>
          <Text style={styles.description}>
            Choose the skin tone you'd like your new reaction emojis to use. You
            can always change this later in Settings.
          </Text>
          <EmojiColorPicker value={selectedTone} onSelect={setSelectedTone} />
          <TouchableOpacity
            style={[styles.confirmButton, saving && styles.confirmDisabled]}
            onPress={saveAndClose}
            disabled={saving}
          >
            <Text style={styles.confirmText}>
              {saving ? "saving..." : "save"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.md,
  },
  card: {
    backgroundColor: colors.white400,
    borderRadius: 24,
    padding: spacing.xl,
    maxWidth: 360,
    width: "100%",
    alignItems: "center",
  },
  title: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 20,
    color: colors.brown900,
    textAlign: "left",
    alignSelf: "stretch",
    marginBottom: spacing.xs,
  },
  description: {
    fontFamily: fonts.primary,
    fontSize: 14,
    color: colors.brown500,
    textAlign: "left",
    alignSelf: "stretch",
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  confirmButton: {
    marginTop: spacing.lg,
    width: "100%",
    paddingVertical: 14,
    borderRadius: 100,
    backgroundColor: colors.green300,
    alignItems: "center",
  },
  confirmDisabled: {
    opacity: 0.6,
  },
  confirmText: {
    fontFamily: fonts.primaryBold,
    fontSize: 14,
    color: colors.white200,
  },
});
