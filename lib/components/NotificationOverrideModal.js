import { useState, useEffect, useCallback } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { useAuth } from "../stores/auth";
import Loader from "./Loader";
import {
  loadOverridesForScope,
  loadOverridableTypes,
  setOverride,
} from "../utils/notificationPreferences";
import { colors, fonts, spacing } from "../theme";

// Per-person / per-branch notification exceptions — layer 4 of the
// preferences system. Lives on a profile or a branch rather than in the
// settings page, because a flat list of every bud would be unusable;
// settings only shows the exceptions you've actually made.
//
// Three states per notification type:
//   Default — no override row exists; category/type settings apply
//   Always  — override row, enabled = true
//   Never   — override row, enabled = false
// The master switch still overrides all of these, deliberately: a pause
// with secret exceptions isn't a pause.

const OPTIONS = [
  { value: null, label: "Default" },
  { value: true, label: "Always" },
  { value: false, label: "Never" },
];

export default function NotificationOverrideModal({
  visible,
  onClose,
  scopeType, // 'person' | 'branch'
  scopeId,
  scopeLabel,
}) {
  const { supabase, session } = useAuth();
  const userId = session?.user?.id;

  const [types, setTypes] = useState([]);
  const [overrides, setOverrides] = useState({}); // typeId -> { id, enabled }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!userId || !scopeId) return;
    setLoading(true);
    try {
      const [typeRows, overrideRows] = await Promise.all([
        loadOverridableTypes(supabase),
        loadOverridesForScope(supabase, userId, scopeType, scopeId),
      ]);
      setTypes(typeRows);
      setOverrides(overrideRows);
    } catch (e) {
      console.warn("Failed to load notification overrides", e);
      setError("Couldn't load your settings for this profile.");
    } finally {
      setLoading(false);
    }
  }, [supabase, userId, scopeType, scopeId]);

  // Refetch each time it opens rather than once on mount — the same modal
  // instance gets reused across different people as you browse profiles.
  useEffect(() => {
    if (visible) load();
  }, [visible, load]);

  const handleSelect = async (typeId, value) => {
    const previous = overrides;
    setError("");
    setOverrides((prev) => {
      const next = { ...prev };
      if (value === null) delete next[typeId];
      else next[typeId] = { ...(next[typeId] || {}), enabled: value };
      return next;
    });

    try {
      await setOverride(supabase, userId, {
        scopeType,
        scopeId,
        notificationTypeId: typeId,
        enabled: value,
      });
    } catch (e) {
      console.warn("Failed to save notification override", e);
      setOverrides(previous);
      setError("Couldn't save that — check your connection.");
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.card}>
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.subtitle}>
            {scopeLabel
              ? `What you hear about from ${scopeLabel}.`
              : "What you hear about from this branch."}
          </Text>

          {loading ? (
            <Loader size={48} style={styles.loader} />
          ) : (
            <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
              {types.map((type) => {
                const current = overrides[type.id];
                const value = current ? current.enabled : null;
                return (
                  <View key={type.id} style={styles.typeRow}>
                    <Text style={styles.typeLabel}>{type.label}</Text>
                    <View style={styles.segmented}>
                      {OPTIONS.map((option) => {
                        const selected = value === option.value;
                        return (
                          <TouchableOpacity
                            key={option.label}
                            style={[
                              styles.segment,
                              selected && styles.segmentSelected,
                            ]}
                            onPress={() => handleSelect(type.id, option.value)}
                            accessibilityRole="button"
                            accessibilityState={{ selected }}
                          >
                            <Text
                              style={[
                                styles.segmentText,
                                selected && styles.segmentTextSelected,
                              ]}
                            >
                              {option.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Text style={styles.footnote}>
            "Default" follows your main notification settings.
          </Text>

          <TouchableOpacity style={styles.doneButton} onPress={onClose}>
            <Text style={styles.doneText}>done</Text>
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
    maxWidth: 380,
    width: "100%",
    maxHeight: "80%",
  },
  title: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 20,
    color: colors.brown900,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontFamily: fonts.primary,
    fontSize: 14,
    color: colors.brown500,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  loader: {
    paddingVertical: spacing.xl,
  },
  body: {
    flexGrow: 0,
  },
  typeRow: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  typeLabel: {
    fontFamily: fonts.primary,
    fontSize: 14,
    color: colors.brown700,
  },
  segmented: {
    flexDirection: "row",
    backgroundColor: colors.brown50,
    borderRadius: 44,
    padding: 3,
    gap: 3,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 44,
    alignItems: "center",
  },
  segmentSelected: {
    backgroundColor: colors.lime500,
  },
  segmentText: {
    fontFamily: fonts.primary,
    fontSize: 13,
    color: colors.brown500,
  },
  segmentTextSelected: {
    fontFamily: fonts.primaryBold,
    color: colors.white200,
  },
  error: {
    fontFamily: fonts.primary,
    fontSize: 13,
    color: colors.clay500,
    marginTop: spacing.xs,
  },
  footnote: {
    fontFamily: fonts.primary,
    fontSize: 12,
    color: colors.brown300,
    lineHeight: 16,
    marginTop: spacing.sm,
  },
  doneButton: {
    marginTop: spacing.lg,
    paddingVertical: 14,
    borderRadius: 100,
    backgroundColor: colors.green300,
    alignItems: "center",
  },
  doneText: {
    fontFamily: fonts.primaryBold,
    fontSize: 14,
    color: colors.white200,
  },
});
