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
import { colors, fonts, spacing } from "../../../lib/theme";
import {
  MUSIC_SERVICES,
  DEFAULT_MUSIC_SERVICE,
} from "../../../lib/utils/musicLinks";

export default function MusicServiceScreen() {
  const { supabase, session } = useAuth();
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!session) return;
    supabase
      .from("profiles")
      .select("music_service")
      .eq("id", session.user.id)
      .single()
      .then(({ data }) =>
        setSelected(data?.music_service ?? DEFAULT_MUSIC_SERVICE),
      );
  }, [session]);

  const choose = async (serviceId) => {
    if (saving || serviceId === selected) return;
    const previous = selected;
    // Optimistic — flip the checkmark immediately, roll back on failure
    setSelected(serviceId);
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ music_service: serviceId })
      .eq("id", session.user.id);
    setSaving(false);
    if (error) {
      setSelected(previous);
      Alert.alert("Error", "Couldn't save that. Try again.");
    }
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <TouchableOpacity style={styles.backRow} onPress={() => router.back()}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Music Streaming Service</Text>
      <Text style={styles.blurb}>
        When someone posts a song, the listen button on their post will open it
        in the app you pick here.
      </Text>

      <View style={styles.section}>
        {MUSIC_SERVICES.map((service) => (
          <TouchableOpacity
            key={service.id}
            style={styles.row}
            onPress={() => choose(service.id)}
            disabled={saving}
          >
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>{service.name}</Text>
              <Text style={styles.rowDescription}>{service.description}</Text>
            </View>
            <View
              style={[
                styles.radio,
                selected === service.id && styles.radioSelected,
              ]}
            >
              {selected === service.id && <View style={styles.radioDot} />}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  container: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: 60,
    paddingBottom: spacing.xxl,
  },
  backRow: {
    marginBottom: spacing.md,
  },
  backText: {
    fontFamily: fonts.primary,
    fontSize: 16,
    color: colors.brown500,
  },
  title: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 24,
    color: colors.brown900,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  blurb: {
    fontFamily: fonts.primary,
    fontSize: 14,
    color: colors.brown500,
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  section: {
    borderTopWidth: 1,
    borderTopColor: colors.brown100,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.brown100,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    fontFamily: fonts.primaryBold,
    fontSize: 16,
    color: colors.brown700,
  },
  rowDescription: {
    fontFamily: fonts.primary,
    fontSize: 13,
    color: colors.brown300,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.brown300,
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: {
    borderColor: colors.brown500,
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.brown500,
  },
});
