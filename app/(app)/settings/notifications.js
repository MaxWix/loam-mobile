import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
  AppState,
  Linking,
  Platform,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import * as Notifications from "expo-notifications";
import { useAuth } from "../../../lib/stores/auth";
import Loader from "../../../lib/components/Loader";
import {
  loadNotificationSettings,
  loadCachedNotificationSettings,
  setMasterEnabled,
  setCategoryEnabled,
  setTypeEnabled,
  removeOverride,
} from "../../../lib/utils/notificationPreferences";
import { colors, fonts, spacing } from "../../../lib/theme";

const TRACK_COLORS = { false: colors.brown100, true: colors.lime500 };

function ToggleRow({
  label,
  description,
  value,
  onValueChange,
  disabled,
  bold,
}) {
  return (
    <View style={[styles.row, disabled && styles.rowDisabled]}>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, bold && styles.rowLabelBold]}>
          {label}
        </Text>
        {description ? (
          <Text style={styles.rowDescription}>{description}</Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={TRACK_COLORS}
        thumbColor={colors.white200}
        ios_backgroundColor={colors.brown100}
      />
    </View>
  );
}

export default function NotificationSettingsScreen() {
  const { supabase, session } = useAuth();
  const userId = session?.user?.id;

  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [permission, setPermission] = useState(null); // expo-notifications PermissionResponse
  const errorTimer = useRef(null);

  // ---- OS-level permission -------------------------------------------------
  // The in-app toggles below are meaningless if notifications are off at the
  // system level, so surface that state plainly instead of letting someone
  // flip switches that can't do anything. Re-checked on focus and whenever
  // the app returns to the foreground, since the user may have just changed
  // it in iOS/Android Settings.
  const checkPermission = useCallback(async () => {
    try {
      setPermission(await Notifications.getPermissionsAsync());
    } catch {
      setPermission(null);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      checkPermission();
    }, [checkPermission]),
  );

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") checkPermission();
    });
    return () => sub.remove();
  }, [checkPermission]);

  const handlePermissionCta = async () => {
    // First ask: show the system prompt. Already denied: iOS won't re-prompt,
    // so the only path is the system Settings screen.
    if (permission?.canAskAgain && permission?.status !== "denied") {
      const next = await Notifications.requestPermissionsAsync();
      setPermission(next);
    } else {
      Linking.openSettings();
    }
  };

  const osBlocked =
    permission &&
    permission.status !== "granted" &&
    !(Platform.OS === "ios" && permission.ios?.status === 3); // 3 = provisional

  // ---- Load ------------------------------------------------------------------
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    (async () => {
      // Paint from cache immediately if we have it, so the page is usable
      // instantly and still shows last-known settings when offline.
      const cached = await loadCachedNotificationSettings(userId);
      if (cached && !cancelled) {
        setSettings(cached);
        setLoading(false);
      }
      try {
        const fresh = await loadNotificationSettings(supabase, userId);
        if (!cancelled) {
          setSettings(fresh);
          setOffline(false);
        }
      } catch (e) {
        console.warn("Failed to load notification settings", e);
        if (!cancelled) setOffline(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, supabase]);

  // ---- Writes: optimistic, revert on failure ------------------------------
  const showSaveError = () => {
    setSaveError("Couldn't save that — check your connection and try again.");
    clearTimeout(errorTimer.current);
    errorTimer.current = setTimeout(() => setSaveError(""), 3500);
  };

  const withOptimistic = async (apply, persist) => {
    const previous = settings;
    setSettings((s) => apply(s));
    try {
      await persist();
    } catch (e) {
      console.warn("Notification setting save failed", e);
      setSettings(previous);
      showSaveError();
    }
  };

  const onMaster = (enabled) =>
    withOptimistic(
      (s) => ({ ...s, masterEnabled: enabled }),
      () => setMasterEnabled(supabase, userId, enabled),
    );

  const onCategory = (categoryId, enabled) =>
    withOptimistic(
      (s) => ({
        ...s,
        categories: s.categories.map((c) =>
          c.id === categoryId ? { ...c, enabled } : c,
        ),
      }),
      () => setCategoryEnabled(supabase, userId, categoryId, enabled),
    );

  const onType = (categoryId, typeId, enabled) =>
    withOptimistic(
      (s) => ({
        ...s,
        categories: s.categories.map((c) =>
          c.id !== categoryId
            ? c
            : {
                ...c,
                types: c.types.map((t) =>
                  t.id === typeId ? { ...t, enabled } : t,
                ),
              },
        ),
      }),
      () => setTypeEnabled(supabase, userId, typeId, enabled),
    );

  const onRemoveOverride = (overrideId) =>
    withOptimistic(
      (s) => ({
        ...s,
        overrides: s.overrides.filter((o) => o.id !== overrideId),
      }),
      () => removeOverride(supabase, overrideId),
    );

  // ---- Render ----------------------------------------------------------------
  // One person or branch may have an override for several notification types.
  // Group them so each shows up once, with its settings listed beneath, rather
  // than as several unrelated-looking rows with the same name.
  const overrideGroups = useMemo(() => {
    const groups = new Map();
    for (const o of settings?.overrides || []) {
      const key = `${o.scope_type}:${o.scope_id}`;
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          scope_label: o.scope_label,
          scope_type: o.scope_type,
          items: [],
        });
      }
      groups.get(key).items.push(o);
    }
    return [...groups.values()].sort((a, b) =>
      a.scope_label.localeCompare(b.scope_label),
    );
  }, [settings?.overrides]);

  if (loading && !settings) {
    return (
      <View style={styles.centered}>
        <Loader size={72} />
      </View>
    );
  }

  if (!settings) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>
          Couldn't load your notification settings.
        </Text>
      </View>
    );
  }

  const master = settings.masterEnabled;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <TouchableOpacity style={styles.backRow} onPress={() => router.back()}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Notifications</Text>

      {offline && (
        <Text style={styles.offlineNote}>
          You're offline — showing your last saved settings. Changes will need a
          connection to save.
        </Text>
      )}

      {osBlocked && (
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>
            Notifications are off in your phone's settings
          </Text>
          <Text style={styles.bannerText}>
            Your choices below are saved either way, but nothing will arrive
            until Loam is allowed to send notifications.
          </Text>
          <TouchableOpacity
            style={styles.bannerButton}
            onPress={handlePermissionCta}
          >
            <Text style={styles.bannerButtonText}>
              {permission?.canAskAgain && permission?.status !== "denied"
                ? "Allow notifications"
                : "Open Settings"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {saveError ? <Text style={styles.saveError}>{saveError}</Text> : null}

      {/* Layer 1 — master switch. A true pause: everything below keeps its
          own state, this just stops all of it from firing. */}
      <View style={styles.masterSection}>
        <ToggleRow
          label="Allow notifications"
          description="Pause everything without changing your individual settings."
          value={master}
          onValueChange={onMaster}
          bold
        />
      </View>

      {/* Layers 2 & 3 — rendered from the database, so a new category or
          type added there shows up here without an app update. */}
      {settings.categories.map((category) => (
        <View key={category.id} style={styles.section}>
          <ToggleRow
            label={category.label}
            description={category.description}
            value={category.enabled}
            onValueChange={(v) => onCategory(category.id, v)}
            disabled={!master}
            bold
          />
          <View style={styles.typeList}>
            {category.types.map((type) => (
              <ToggleRow
                key={type.id}
                label={type.label}
                description={type.description}
                value={type.enabled}
                onValueChange={(v) => onType(category.id, type.id, v)}
                disabled={!master || !category.enabled}
              />
            ))}
          </View>
        </View>
      ))}

      {/* Layer 4 — per-person / per-branch exceptions. Set from a bud's
          profile or a branch; this is just where you review and remove them. */}
      <View style={styles.section}>
        <Text style={styles.sectionHeading}>Customized</Text>
        {settings.overrides.length === 0 ? (
          <Text style={styles.emptyText}>
            No exceptions yet. From a bud's profile or a branch, you can choose
            to always or never get specific notifications from them.
          </Text>
        ) : (
          overrideGroups.map((group) => (
            <View
              key={group.key}
              style={[styles.overrideGroup, !master && styles.rowDisabled]}
            >
              <Text style={styles.overrideGroupLabel}>
                {group.scope_label}
                {group.scope_type === "branch" ? (
                  <Text style={styles.overrideGroupKind}> · branch</Text>
                ) : null}
              </Text>

              {group.items.map((o) => (
                <View key={o.id} style={styles.overrideItem}>
                  <Text style={styles.overrideItemText}>
                    <Text style={styles.overrideItemValue}>
                      {o.enabled ? "Always" : "Never"}
                    </Text>
                    {" · "}
                    {o.type_label}
                  </Text>
                  <TouchableOpacity
                    onPress={() => onRemoveOverride(o.id)}
                    hitSlop={10}
                    accessibilityLabel={`Remove ${o.type_label} exception for ${group.scope_label}`}
                  >
                    <Text style={styles.remove}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  container: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: 60,
    paddingBottom: spacing.xxl,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  backRow: { marginBottom: spacing.md },
  backText: {
    fontFamily: fonts.primary,
    fontSize: 16,
    color: colors.brown500,
  },
  title: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 24,
    color: colors.brown900,
    marginBottom: spacing.lg,
    marginTop: spacing.md,
  },
  offlineNote: {
    fontFamily: fonts.primary,
    fontSize: 13,
    color: colors.brown300,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  banner: {
    backgroundColor: colors.lime100,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  bannerTitle: {
    fontFamily: fonts.primaryBold,
    fontSize: 14,
    color: colors.brown700,
  },
  bannerText: {
    fontFamily: fonts.primary,
    fontSize: 13,
    color: colors.brown500,
    lineHeight: 18,
  },
  bannerButton: {
    alignSelf: "flex-start",
    backgroundColor: colors.brown500,
    borderRadius: 44,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    marginTop: spacing.xs,
  },
  bannerButtonText: {
    fontFamily: fonts.primaryBold,
    fontSize: 13,
    color: colors.white200,
  },
  saveError: {
    fontFamily: fonts.primary,
    fontSize: 13,
    color: colors.clay500,
    marginBottom: spacing.md,
  },
  masterSection: {
    borderTopWidth: 1,
    borderTopColor: colors.brown100,
    marginBottom: spacing.xl,
  },
  section: {
    borderTopWidth: 1,
    borderTopColor: colors.brown100,
    marginBottom: spacing.xl,
  },
  sectionHeading: {
    fontFamily: fonts.primaryBold,
    fontSize: 16,
    color: colors.brown700,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  typeList: {
    paddingLeft: spacing.md,
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
  rowDisabled: {
    opacity: 0.45,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    fontFamily: fonts.primary,
    fontSize: 16,
    color: colors.brown700,
  },
  rowLabelBold: {
    fontFamily: fonts.primaryBold,
  },
  rowDescription: {
    fontFamily: fonts.primary,
    fontSize: 13,
    color: colors.brown300,
    lineHeight: 18,
  },
  emptyText: {
    fontFamily: fonts.primary,
    fontSize: 14,
    color: colors.brown300,
    lineHeight: 20,
    paddingVertical: spacing.md,
  },
  overrideGroup: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.brown100,
    gap: spacing.xs,
  },
  overrideGroupLabel: {
    fontFamily: fonts.primaryBold,
    fontSize: 15,
    color: colors.brown700,
  },
  overrideGroupKind: {
    fontFamily: fonts.primary,
    fontSize: 13,
    color: colors.brown300,
  },
  overrideItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingLeft: spacing.md,
    paddingVertical: 2,
  },
  overrideItemText: {
    flex: 1,
    fontFamily: fonts.primary,
    fontSize: 13,
    color: colors.brown300,
    lineHeight: 18,
  },
  overrideItemValue: {
    fontFamily: fonts.primaryBold,
    color: colors.brown500,
  },
  remove: {
    fontFamily: fonts.primaryBold,
    fontSize: 16,
    color: colors.brown300,
    paddingHorizontal: spacing.xs,
  },
});
