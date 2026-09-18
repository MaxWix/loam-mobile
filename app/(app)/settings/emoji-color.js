import { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { useAuth } from "../../../lib/stores/auth";
import EmojiColorPicker from "../../../lib/components/EmojiColorPicker";
import Button from "../../../lib/components/Button";
import { DEFAULT_EMOJI_TONE } from "../../../lib/utils/emojiAssets";
import { colors, fonts, spacing } from "../../../lib/theme";
import { MaterialIcons } from "@expo/vector-icons";

export default function EmojiColorScreen() {
  const { supabase, session } = useAuth();
  const [selectedTone, setSelectedTone] = useState(DEFAULT_EMOJI_TONE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!session?.user?.id) return;
    supabase
      .from("profiles")
      .select("emoji_skin_tone")
      .eq("id", session.user.id)
      .single()
      .then(({ data }) => {
        setSelectedTone(data?.emoji_skin_tone ?? DEFAULT_EMOJI_TONE);
        setLoading(false);
      });
  }, [session?.user?.id]);

  const handleSave = async () => {
    if (saving || !session?.user?.id) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ emoji_skin_tone: selectedTone })
        .eq("id", session.user.id);

      if (error) {
        Alert.alert("Error", "Couldn't save your emoji color. Try again.");
        return;
      }
      router.back();
    } catch (e) {
      Alert.alert("Error", "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <TouchableOpacity
        onPress={() => router.back()}
        style={styles.backButton}
        hitSlop={12}
      >
        <MaterialIcons name="arrow-back" size={24} color={colors.brown500} />
      </TouchableOpacity>

      <Text style={styles.title}>Reaction Emoji Color</Text>
      <Text style={styles.subtitle}>
        Choose the skin tone you'd like your reaction emojis to use.
      </Text>

      <View style={styles.pickerWrap}>
        <EmojiColorPicker value={selectedTone} onSelect={setSelectedTone} />
      </View>

      <Button onPress={handleSave} disabled={saving}>
        {saving ? "Saving..." : "Save"}
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  container: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: 60,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brown50,
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  title: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 24,
    color: colors.brown900,
  },
  subtitle: {
    fontFamily: fonts.primary,
    fontSize: 16,
    color: colors.brown500,
    lineHeight: 22,
  },
  pickerWrap: {
    paddingVertical: spacing.lg,
  },
});
