import { useEffect, useRef } from "react";
import { router } from "expo-router";
import * as Notifications from "expo-notifications";

// Where a tapped notification should land. Every notification carries a
// `data` payload built server-side in templates.js — this is the other half
// of that contract, so the two need to stay in sync when a type is added.
//
// Anything post-related opens that post's detail screen; connection-related
// notifications open wherever the action actually is.
function routeFor(data) {
  if (!data?.type) return null;

  switch (data.type) {
    case "comment":
    case "reaction":
    case "new_post":
      return data.postId ? `/(app)/posts/${data.postId}` : null;

    case "bud_request":
      // The accept/decline buttons live on the notifications screen, so
      // that's the useful destination — not the requester's profile.
      return "/(app)/notifications";

    case "new_bud":
      // Already connected, nothing to action — their profile is the point.
      return data.username
        ? `/(app)/user/${data.username}`
        : "/(app)/notifications";

    default:
      return null;
  }
}

/**
 * Handles taps on push notifications.
 *
 * @param {boolean} ready  true once auth has resolved and the initial
 *   router.replace has run. Navigating before that races the redirect —
 *   the replace would discard whatever this pushed.
 */
export function useNotificationRouting(ready) {
  // A cold start hands back the same "last response" every time it's
  // queried, so without this it would re-navigate on every re-render that
  // flips `ready`.
  const handledColdStart = useRef(false);

  useEffect(() => {
    if (!ready) return;

    const navigate = (response) => {
      const target = routeFor(response?.notification?.request?.content?.data);
      if (target) router.push(target);
    };

    // App was closed and launched by tapping a notification. There's no
    // listener event for this — the response is stashed and has to be
    // asked for.
    if (!handledColdStart.current) {
      handledColdStart.current = true;
      Notifications.getLastNotificationResponseAsync()
        .then((response) => {
          if (response) navigate(response);
        })
        .catch((e) => console.warn("Cold start notification check failed", e));
    }

    // App was already running (foreground or background) when tapped.
    const sub = Notifications.addNotificationResponseReceivedListener(navigate);
    return () => sub.remove();
  }, [ready]);
}

/**
 * Show notifications while the app is in the foreground.
 *
 * Without this, iOS silently swallows anything that arrives while Loam is
 * open — which reads as "notifications are broken" during testing when
 * they're actually being delivered correctly.
 *
 * Called at module scope (not in a component) because it configures a
 * global handler, not per-render state.
 */
export function configureForegroundNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}
