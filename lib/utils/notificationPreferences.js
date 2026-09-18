import AsyncStorage from "@react-native-async-storage/async-storage";

// Data layer for the notification preferences system (see
// notification_preferences_schema.sql). Everything that touches these
// tables goes through here so the "no row = use the default" rule and the
// precedence chain are written down exactly once.
//
// Effective state for a category or type is COALESCE(user row, default):
// rows only exist once someone has changed a toggle away from its default.

const cacheKey = (userId) => `loam:notification_settings:${userId}`;

/**
 * Load everything the settings page needs, merged into a render-ready shape:
 * {
 *   masterEnabled, categories: [{ ...category, enabled, types: [{ ...type, enabled }] }],
 *   overrides: [{ id, enabled, scope_type, scope_id, scope_label, type_label }]
 * }
 * Returns from a per-user AsyncStorage cache first (when `preferCache`), so
 * the page can paint instantly and still work offline with last-known values.
 */
export async function loadNotificationSettings(supabase, userId) {
  const [
    { data: profile, error: profileError },
    { data: categories, error: catError },
    { data: types, error: typeError },
    { data: catPrefs },
    { data: typePrefs },
    { data: overrides },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("push_notifications_enabled")
      .eq("id", userId)
      .single(),
    supabase
      .from("notification_categories")
      .select("id, key, label, description, sort_order, default_enabled")
      .order("sort_order"),
    supabase
      .from("notification_types")
      .select(
        "id, category_id, key, label, description, is_scheduled, sort_order, default_enabled",
      )
      .order("sort_order"),
    supabase
      .from("notification_category_preferences")
      .select("category_id, enabled")
      .eq("user_id", userId),
    supabase
      .from("notification_type_preferences")
      .select("notification_type_id, enabled")
      .eq("user_id", userId),
    supabase
      .from("notification_overrides")
      .select("id, notification_type_id, scope_type, scope_id, enabled")
      .eq("user_id", userId),
  ]);

  if (profileError || catError || typeError) {
    throw profileError || catError || typeError;
  }

  const catPrefById = Object.fromEntries(
    (catPrefs || []).map((p) => [p.category_id, p.enabled]),
  );
  const typePrefById = Object.fromEntries(
    (typePrefs || []).map((p) => [p.notification_type_id, p.enabled]),
  );
  const typeById = Object.fromEntries((types || []).map((t) => [t.id, t]));

  const mergedCategories = (categories || []).map((c) => ({
    ...c,
    enabled: catPrefById[c.id] ?? c.default_enabled,
    types: (types || [])
      .filter((t) => t.category_id === c.id)
      .map((t) => ({ ...t, enabled: typePrefById[t.id] ?? t.default_enabled })),
  }));

  // Overrides point at either a profile or a branch — resolve display names
  // in two batched lookups rather than one per row.
  const personIds = (overrides || [])
    .filter((o) => o.scope_type === "person")
    .map((o) => o.scope_id);
  const branchIds = (overrides || [])
    .filter((o) => o.scope_type === "branch")
    .map((o) => o.scope_id);

  const [{ data: people }, { data: branches }] = await Promise.all([
    personIds.length
      ? supabase
          .from("profiles")
          .select("id, username, display_name")
          .in("id", personIds)
      : Promise.resolve({ data: [] }),
    branchIds.length
      ? supabase.from("branches").select("id, name, emoji").in("id", branchIds)
      : Promise.resolve({ data: [] }),
  ]);
  const personById = Object.fromEntries((people || []).map((p) => [p.id, p]));
  const branchById = Object.fromEntries((branches || []).map((b) => [b.id, b]));

  const mergedOverrides = (overrides || []).map((o) => {
    const scope =
      o.scope_type === "person"
        ? personById[o.scope_id]
        : branchById[o.scope_id];
    const scope_label =
      o.scope_type === "person"
        ? scope?.display_name || scope?.username || "Someone"
        : scope
          ? `${scope.emoji || ""} ${scope.name}`.trim()
          : "A branch";
    return {
      ...o,
      scope_label,
      type_label: typeById[o.notification_type_id]?.label || "Notifications",
    };
  });

  const settings = {
    masterEnabled: profile?.push_notifications_enabled ?? true,
    categories: mergedCategories,
    overrides: mergedOverrides,
  };

  AsyncStorage.setItem(cacheKey(userId), JSON.stringify(settings)).catch(
    () => {},
  );
  return settings;
}

export async function loadCachedNotificationSettings(userId) {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(userId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function setMasterEnabled(supabase, userId, enabled) {
  const { error } = await supabase
    .from("profiles")
    .update({ push_notifications_enabled: enabled })
    .eq("id", userId);
  if (error) throw error;
}

export async function setCategoryEnabled(
  supabase,
  userId,
  categoryId,
  enabled,
) {
  const { error } = await supabase
    .from("notification_category_preferences")
    .upsert(
      {
        user_id: userId,
        category_id: categoryId,
        enabled,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,category_id" },
    );
  if (error) throw error;
}

export async function setTypeEnabled(supabase, userId, typeId, enabled) {
  const { error } = await supabase.from("notification_type_preferences").upsert(
    {
      user_id: userId,
      notification_type_id: typeId,
      enabled,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,notification_type_id" },
  );
  if (error) throw error;
}

export async function removeOverride(supabase, overrideId) {
  const { error } = await supabase
    .from("notification_overrides")
    .delete()
    .eq("id", overrideId);
  if (error) throw error;
}

/**
 * Every override row a user has for one scope (a person or a branch),
 * keyed by notification_type_id for easy lookup by the control UI.
 */
export async function loadOverridesForScope(
  supabase,
  userId,
  scopeType,
  scopeId,
) {
  const { data, error } = await supabase
    .from("notification_overrides")
    .select("id, notification_type_id, enabled")
    .eq("user_id", userId)
    .eq("scope_type", scopeType)
    .eq("scope_id", scopeId);
  if (error) throw error;
  return Object.fromEntries(
    (data || []).map((o) => [o.notification_type_id, o]),
  );
}

/**
 * Set one scope's override for one notification type.
 * `enabled: null` means "no opinion" — the row is deleted so the normal
 * category/type defaults apply again. There's no third stored state: the
 * row's existence IS the override.
 */
export async function setOverride(
  supabase,
  userId,
  { scopeType, scopeId, notificationTypeId, enabled },
) {
  if (enabled === null) {
    const { error } = await supabase
      .from("notification_overrides")
      .delete()
      .eq("user_id", userId)
      .eq("notification_type_id", notificationTypeId)
      .eq("scope_type", scopeType)
      .eq("scope_id", scopeId);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from("notification_overrides").upsert(
    {
      user_id: userId,
      notification_type_id: notificationTypeId,
      scope_type: scopeType,
      scope_id: scopeId,
      enabled,
    },
    { onConflict: "user_id,notification_type_id,scope_type,scope_id" },
  );
  if (error) throw error;
}

/**
 * The notification types that can be scoped to a person or branch.
 * Driven by `supports_overrides` in the database rather than a hardcoded
 * list here, so the override UI stays correct as types are added: bud
 * requests and new-bud notifications describe the connection itself, and
 * reflection prompts aren't triggered by anyone, so none of them can be
 * meaningfully overridden per-person.
 */
export async function loadOverridableTypes(supabase) {
  const { data, error } = await supabase
    .from("notification_types")
    .select("id, key, label, is_scheduled, sort_order")
    .eq("supports_overrides", true)
    .order("sort_order");
  if (error) throw error;
  return data || [];
}

/**
 * Client-side evaluator for "would this notification be delivered to me?".
 * Mirrors the precedence chain the server will enforce at send time:
 *   master off        -> false, no exceptions
 *   person override   -> that value
 *   branch override   -> that value
 *   otherwise         -> category enabled AND type enabled
 * Useful on-device for scheduled/local types (reflection prompts) that never
 * go through the server, and for previewing state in the UI.
 */
export function isNotificationEnabled(
  settings,
  typeKey,
  { actorId, branchId } = {},
) {
  if (!settings?.masterEnabled) return false;

  const category = settings.categories.find((c) =>
    c.types.some((t) => t.key === typeKey),
  );
  const type = category?.types.find((t) => t.key === typeKey);
  if (!category || !type) return false;

  const overrideFor = (scopeType, scopeId) =>
    scopeId
      ? settings.overrides.find(
          (o) =>
            o.notification_type_id === type.id &&
            o.scope_type === scopeType &&
            o.scope_id === scopeId,
        )
      : null;

  const personOverride = overrideFor("person", actorId);
  if (personOverride) return personOverride.enabled;
  const branchOverride = overrideFor("branch", branchId);
  if (branchOverride) return branchOverride.enabled;

  return category.enabled && type.enabled;
}
