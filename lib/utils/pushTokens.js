import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";

// Everything that touches push permission and token storage lives here, so
// the rules stay in one place:
//
//   - Never prompt implicitly. `registerForPushNotifications` asks; the
//     launch-time path (`refreshPushTokenIfGranted`) only ever re-registers
//     when permission is ALREADY granted, so opening the app can't trigger
//     a system dialog.
//   - iOS gives exactly one prompt. If someone declines, `canAskAgain`
//     goes false and the only remaining path is the system settings screen.
//   - Tokens rotate (reinstall, restore, OS updates), so re-register on
//     launch rather than assuming the stored one is still good.

/** The EAS project id is required by getExpoPushTokenAsync in recent SDKs. */
function getProjectId() {
  return (
    Constants?.expoConfig?.extra?.eas?.projectId ??
    Constants?.easConfig?.projectId ??
    null
  );
}

export const NOTIF_PROMPT_DISMISSED_KEY = "loam:notif_prompt_dismissed";

export async function getPermissionStatus() {
  try {
    return await Notifications.getPermissionsAsync();
  } catch {
    return null;
  }
}

/**
 * True when the OS will actually deliver notifications. Provisional
 * authorization (iOS) counts: notifications arrive quietly in Notification
 * Center, which is a real delivery channel, not a denial.
 */
export function isPermissionGranted(permission) {
  if (!permission) return false;
  if (permission.status === "granted") return true;
  return Platform.OS === "ios" && permission.ios?.status === 3; // provisional
}

/**
 * Ask for permission and store the resulting token.
 *
 * `provisional: true` (iOS) requests quiet authorization — no dialog at all,
 * notifications land silently in Notification Center, and the first one
 * carries inline "Keep" / "Turn Off" buttons. The person decides from a real
 * example instead of an abstract prompt, and there's no one-shot dialog to
 * burn. Android ignores this and shows its normal runtime prompt.
 *
 * Returns { granted, permission, token }.
 */
export async function registerForPushNotifications(
  supabase,
  userId,
  { provisional = false } = {},
) {
  let permission = await getPermissionStatus();

  if (!isPermissionGranted(permission)) {
    if (permission && !permission.canAskAgain) {
      // Already hard-denied — asking again is a no-op on iOS, so don't
      // pretend otherwise. Caller should route to system settings.
      return { granted: false, permission, token: null };
    }
    try {
      permission = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowProvisional: provisional,
        },
      });
    } catch (e) {
      console.warn("Notification permission request failed", e);
      return { granted: false, permission, token: null };
    }
  }

  if (!isPermissionGranted(permission)) {
    return { granted: false, permission, token: null };
  }

  const token = await savePushToken(supabase, userId);
  return { granted: true, permission, token };
}

/**
 * Fetch the current Expo push token and upsert it. Safe to call on every
 * launch — the token is the unique key, so re-registering just refreshes
 * last_seen_at (and reassigns the row if this device previously belonged to
 * a different account).
 */
export async function savePushToken(supabase, userId) {
  if (!userId) return null;

  const projectId = getProjectId();
  if (!projectId) {
    console.warn("No EAS projectId found — cannot fetch a push token.");
    return null;
  }

  let token;
  try {
    const result = await Notifications.getExpoPushTokenAsync({ projectId });
    token = result?.data;
  } catch (e) {
    // Expected on simulators: there's no real device to register with APNs.
    console.warn("Could not get an Expo push token", e);
    return null;
  }
  if (!token) return null;

  try {
    const { error } = await supabase.from("push_tokens").upsert(
      {
        user_id: userId,
        token,
        device_id: Constants?.sessionId ?? null,
        platform: Platform.OS,
        device_name: Constants?.deviceName ?? null,
        app_version: Constants?.expoConfig?.version ?? null,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "token" },
    );
    if (error) throw error;
  } catch (e) {
    console.warn("Failed to save push token", e);
    return null;
  }

  return token;
}

/**
 * Launch-time refresh. Only touches anything when permission is already
 * granted — this must never surface a permission dialog, since the ask
 * belongs to a deliberate moment in onboarding, not app startup.
 */
export async function refreshPushTokenIfGranted(supabase, userId) {
  if (!userId) return null;
  const permission = await getPermissionStatus();
  if (!isPermissionGranted(permission)) return null;
  return savePushToken(supabase, userId);
}

/**
 * Remove this device's token on sign-out, so notifications don't keep
 * arriving for an account that's no longer signed in here.
 */
export async function unregisterPushToken(supabase) {
  const projectId = getProjectId();
  if (!projectId) return;
  try {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    if (!data) return;
    await supabase.from("push_tokens").delete().eq("token", data);
  } catch (e) {
    console.warn("Failed to unregister push token", e);
  }
}
