import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Share,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { useAuth } from "../../lib/stores/auth";
import ProfileImage from "../../lib/components/ProfileImage";
import Loader from "../../lib/components/Loader";
import { collectContactHashes } from "../../lib/utils/contacts";
import { API_URL } from "../../lib/config";
import {
  colors,
  layout,
  buttons,
  spacing,
  typography,
  fonts,
} from "../../lib/theme";

// Final onboarding step. Three states in one screen:
//
//   intro    — explain what syncing does before touching the OS prompt,
//              same reasoning as the notifications step: the permission
//              dialog is one-shot, so the ask should be informed.
//   results  — contacts already on Loam, with connect buttons
//   invite   — everyone else, as a share link rather than a list we upload
//
// Contact data never leaves the device: emails are hashed locally and only
// hashes are sent (see lib/utils/contacts.js). Non-matches are discarded
// server-side, so Loam never learns who else is in someone's address book.

export default function ContactsOnboardingScreen() {
  const { session, supabase } = useAuth();
  const [stage, setStage] = useState("intro"); // intro | loading | results
  const [matches, setMatches] = useState([]);
  const [otherCount, setOtherCount] = useState(0);
  const [requestingIds, setRequestingIds] = useState(new Set());
  const [denied, setDenied] = useState(false);

  const token = session?.access_token;

  const finish = async () => {
    await supabase
      .from("profiles")
      .update({ onboarding_complete: true })
      .eq("id", session.user.id);
    router.replace("/(app)/feed");
  };

  const handleSync = async () => {
    setStage("loading");
    try {
      const { granted, hashes, contacts } = await collectContactHashes();
      if (!granted) {
        setDenied(true);
        setStage("intro");
        return;
      }

      const res = await fetch(`${API_URL}/api/contacts/match`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ hashes }),
      });

      const data = res.ok ? await res.json() : { matches: [] };
      const found = data.matches || [];

      // Pair each match back to the contact it came from, so someone shows
      // up under the name that's in the address book rather than whatever
      // display name they picked.
      const contactByHash = Object.fromEntries(
        contacts.map((c) => [c.hash, c]),
      );
      setMatches(
        found.map((m) => ({
          ...m,
          contactName: contactByHash[m.hash]?.name || m.display_name,
        })),
      );
      setOtherCount(Math.max(0, contacts.length - found.length));
      setStage("results");
    } catch (e) {
      console.warn("Contact sync failed", e);
      Alert.alert(
        "Hmm",
        "Couldn't check your contacts. You can try again later in Settings.",
      );
      setStage("intro");
    }
  };

  const sendRequest = async (userId) => {
    setRequestingIds((prev) => new Set([...prev, userId]));
    try {
      const res = await fetch(`${API_URL}/api/connections`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ receiver_id: userId }),
      });
      if (res.ok) {
        setMatches((prev) =>
          prev.map((m) =>
            m.id === userId ? { ...m, request_pending: true } : m,
          ),
        );
      }
    } catch (e) {
      console.warn("Bud request failed", e);
    } finally {
      setRequestingIds((prev) => {
        const s = new Set(prev);
        s.delete(userId);
        return s;
      });
    }
  };

  const handleInvite = async () => {
    try {
      await Share.share({
        message: "Come find me on Loam — https://loam.ing",
      });
    } catch (e) {
      // Cancelled share, nothing to do.
    }
  };

  if (stage === "loading") {
    return (
      <View style={[styles.container, styles.centered]}>
        <Loader size={72} />
        <Text style={styles.loadingText}>Looking for your people…</Text>
      </View>
    );
  }

  if (stage === "results") {
    return (
      <View style={styles.container}>
        <Text style={styles.wordmark}>loam</Text>

        <ScrollView
          style={styles.resultsScroll}
          contentContainerStyle={styles.resultsContent}
        >
          <Text style={styles.title}>
            {matches.length > 0
              ? "Your people are here"
              : "No contacts on Loam yet"}
          </Text>

          {matches.length > 0 ? (
            <>
              <Text style={styles.body}>
                {matches.length === 1
                  ? "One of your contacts is already on Loam."
                  : `${matches.length} of your contacts are already on Loam.`}
              </Text>

              <View style={styles.list}>
                {matches.map((m) => (
                  <View key={m.id} style={styles.row}>
                    <ProfileImage src={m.profile_img} variant="small" />
                    <View style={styles.rowText}>
                      <Text style={styles.rowName}>{m.contactName}</Text>
                      <Text style={styles.rowUsername}>@{m.username}</Text>
                    </View>
                    {m.already_connected ? (
                      <Text style={styles.rowStatus}>buds</Text>
                    ) : m.request_pending ? (
                      <Text style={styles.rowStatus}>requested</Text>
                    ) : (
                      <TouchableOpacity
                        style={styles.addButton}
                        onPress={() => sendRequest(m.id)}
                        disabled={requestingIds.has(m.id)}
                      >
                        <Text style={styles.addButtonText}>
                          {requestingIds.has(m.id) ? "…" : "add"}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            </>
          ) : (
            <Text style={styles.body}>
              None of your contacts have signed up yet — you could be the one
              who brings them here.
            </Text>
          )}

          <View style={styles.inviteSection}>
            <Text style={styles.inviteTitle}>Invite someone</Text>
            <Text style={styles.inviteBody}>
              {otherCount > 0
                ? `${otherCount} other contacts aren't on Loam yet. Share your link and they'll find you when they join.`
                : "Share your link and friends will find you when they join."}
            </Text>
            <TouchableOpacity
              style={styles.inviteButton}
              onPress={handleInvite}
            >
              <Text style={styles.inviteButtonText}>Share invite link</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <TouchableOpacity style={styles.button} onPress={finish}>
          <Text style={styles.buttonText}>Done</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // stage === "intro"
  return (
    <View style={styles.container}>
      <Text style={styles.wordmark}>loam</Text>

      <View style={styles.content}>
        <Text style={styles.title}>Find your people</Text>
        <Text style={styles.body}>
          Loam can check which of your contacts are already here, so you don't
          have to hunt for them one by one.
        </Text>
        <Text style={styles.body}>
          Your contacts stay on your phone. We scramble them before they're
          checked, and never see anyone who isn't already on Loam.
        </Text>

        {denied && (
          <Text style={styles.deniedNote}>
            Contacts access is off. You can turn it on in your phone's Settings,
            or skip this and find friends by sharing your link.
          </Text>
        )}
      </View>

      <TouchableOpacity style={styles.button} onPress={handleSync}>
        <Text style={styles.buttonText}>Check my contacts</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.skipButton} onPress={finish}>
        <Text style={styles.skipText}>Not now</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...layout.screen,
    ...layout.screenContent,
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  wordmark: layout.wordmark,
  content: {
    flex: 1,
    justifyContent: "center",
    gap: spacing.md,
  },
  title: {
    ...typography.h1,
    color: colors.brown900,
    marginBottom: spacing.sm,
  },
  body: {
    ...typography.hg16,
    color: colors.brown500,
    lineHeight: 26,
  },
  loadingText: {
    ...typography.hg16,
    color: colors.brown300,
  },
  deniedNote: {
    ...typography.hg14,
    color: colors.clay500,
    lineHeight: 20,
    marginTop: spacing.sm,
  },
  resultsScroll: {
    flex: 1,
  },
  resultsContent: {
    paddingBottom: spacing.lg,
  },
  list: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowName: {
    fontFamily: fonts.primaryBold,
    fontSize: 15,
    color: colors.brown700,
  },
  rowUsername: {
    fontFamily: fonts.primary,
    fontSize: 13,
    color: colors.brown300,
  },
  rowStatus: {
    fontFamily: fonts.primary,
    fontSize: 13,
    color: colors.brown300,
  },
  addButton: {
    backgroundColor: colors.lime500,
    borderRadius: 44,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
  },
  addButtonText: {
    fontFamily: fonts.primaryBold,
    fontSize: 13,
    color: colors.brown700,
  },
  inviteSection: {
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.brown100,
    gap: spacing.sm,
  },
  inviteTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    color: colors.brown900,
  },
  inviteBody: {
    ...typography.hg14,
    color: colors.brown500,
    lineHeight: 20,
  },
  inviteButton: {
    ...buttons.lime,
    alignSelf: "flex-start",
    width: "auto",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  inviteButtonText: buttons.limeText,
  button: buttons.primary,
  buttonText: buttons.primaryText,
  skipButton: {
    alignItems: "center",
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  skipText: {
    ...typography.hg16,
    color: colors.brown300,
  },
});
