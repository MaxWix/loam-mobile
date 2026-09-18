import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Share,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useAuth } from "../../../lib/stores/auth";
import Loader from "../../../lib/components/Loader";
import ProfileImage from "../../../lib/components/ProfileImage";
import { startPhoneLink, confirmPhoneLink } from "../../../lib/utils/phoneAuth";
import {
  getContactsPermission,
  collectContactHashes,
} from "../../../lib/utils/contacts";
import { API_URL } from "../../../lib/config";
import {
  colors,
  fonts,
  inputs,
  buttons,
  spacing,
  typography,
} from "../../../lib/theme";

// The permanent home for "find your people" — phone verification and
// contact sync, merged into one adaptive flow rather than two screens.
//
// This exists because the onboarding ask is one-shot: someone who taps
// "Not now" there has answered, and re-asking on the feed would be nagging
// (see app/onboarding/verify-phone.js, still used for that one-time
// backfill prompt). This page is the opposite of that — always available,
// never brought up on its own — and it picks up wherever the person left
// off rather than always starting from zero:
//
//   no verified number         -> phone entry
//   verified, never synced     -> contact sync intro
//   verified, already synced   -> results, refreshed silently
//
// The permission check on load is read-only (getContactsPermission) so
// mounting this screen can never itself trigger the OS prompt — only an
// explicit tap does that, same rule as everywhere else phone/contacts
// permission comes up in this app.

const RESEND_COOLDOWN_S = 30;

export default function PhoneSettingsScreen() {
  const { supabase, session } = useAuth();
  const userId = session?.user?.id;
  const token = session?.access_token;

  const [loading, setLoading] = useState(true);
  const [phoneState, setPhoneState] = useState(null); // { phone_e164, verified } | null
  // phone_enter | phone_code | contacts_intro | contacts_syncing | contacts_results
  const [screen, setScreen] = useState("phone_enter");

  // --- phone verification ---
  const [phone, setPhone] = useState("");
  const [e164, setE164] = useState(null);
  const [code, setCode] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [working, setWorking] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const codeInputRef = useRef(null);

  // --- contact sync ---
  const [matches, setMatches] = useState([]);
  const [otherCount, setOtherCount] = useState(0);
  const [requestingIds, setRequestingIds] = useState(new Set());
  const [denied, setDenied] = useState(false);
  const [syncError, setSyncError] = useState("");

  // Actually collects and matches contacts. Safe to call whenever
  // permission is already granted (no OS prompt fires in that case) — used
  // both for the explicit "Check my contacts" tap and the silent refresh
  // on load when a previous sync already granted permission.
  const runSync = async () => {
    setScreen("contacts_syncing");
    setSyncError("");
    try {
      const { granted, hashes, contacts } = await collectContactHashes();
      if (!granted) {
        setDenied(true);
        setScreen("contacts_intro");
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

      const contactByHash = {};
      for (const c of contacts) {
        for (const h of c.hashes) contactByHash[h] = c;
      }
      setMatches(
        found.map((m) => ({
          ...m,
          contactName: contactByHash[m.hash]?.name || m.display_name,
        })),
      );
      setOtherCount(Math.max(0, contacts.length - found.length));
      setScreen("contacts_results");
    } catch (e) {
      console.warn("Contact sync failed", e);
      setSyncError("Couldn't check your contacts. Try again in a moment.");
      setScreen("contacts_intro");
    }
  };

  // Decides contacts_intro vs. an immediate (silent) sync, without ever
  // prompting for permission itself.
  const enterContactsFlow = useCallback(async () => {
    const permission = await getContactsPermission();
    if (permission?.status === "granted") {
      await runSync();
    } else {
      setScreen("contacts_intro");
    }
  }, []);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    const { data } = await supabase
      .from("user_phones")
      .select("phone_e164, verified")
      .eq("user_id", userId)
      .maybeSingle();
    const verified = data?.verified ? data : null;
    setPhoneState(verified);

    if (!verified) {
      setScreen("phone_enter");
      setLoading(false);
      return;
    }

    await enterContactsFlow();
    setLoading(false);
  }, [userId, supabase, enterContactsFlow]);

  useEffect(() => {
    load();
  }, [load]);

  // Every resend costs an SMS, so the button is disabled on a timer rather
  // than relying on people not to tap it repeatedly.
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const resetPhoneForm = () => {
    setPhone("");
    setCode("");
    setE164(null);
    setPhoneError("");
  };

  const handleSendCode = async () => {
    if (working) return;
    setWorking(true);
    setPhoneError("");
    const result = await startPhoneLink(supabase, phone);
    setWorking(false);

    if (!result.ok) {
      setPhoneError(result.error);
      return;
    }
    setE164(result.e164);
    setScreen("phone_code");
    setCooldown(RESEND_COOLDOWN_S);
    setTimeout(() => codeInputRef.current?.focus(), 300);
  };

  const handleResend = async () => {
    if (working || cooldown > 0) return;
    setWorking(true);
    setPhoneError("");
    const result = await startPhoneLink(supabase, e164);
    setWorking(false);
    if (result.ok) setCooldown(RESEND_COOLDOWN_S);
    else setPhoneError(result.error);
  };

  const handleVerify = async () => {
    if (working || code.length < 6) return;
    setWorking(true);
    setPhoneError("");
    const result = await confirmPhoneLink(supabase, e164, code.trim(), userId);
    setWorking(false);

    if (!result.ok) {
      setPhoneError(result.error);
      return;
    }
    setPhoneState({ phone_e164: e164, verified: true });
    resetPhoneForm();
    // Number just verified — move straight into contact sync rather than
    // landing on a resting "here's your number" screen with nothing to do.
    await enterContactsFlow();
  };

  const handleChangeNumber = () => {
    resetPhoneForm();
    setScreen("phone_enter");
  };

  const handleRemove = () => {
    Alert.alert(
      "Remove your number?",
      "Friends who have your number won't be able to find you on Loam. You can add it back any time.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            const { error: deleteError } = await supabase
              .from("user_phones")
              .delete()
              .eq("user_id", userId);
            if (deleteError) {
              Alert.alert("Error", "Couldn't remove your number. Try again.");
              return;
            }
            setPhoneState(null);
            resetPhoneForm();
            setScreen("phone_enter");
          },
        },
      ],
    );
  };

  const sendRequest = async (matchUserId) => {
    setRequestingIds((prev) => new Set([...prev, matchUserId]));
    try {
      const res = await fetch(`${API_URL}/api/connections`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ receiver_id: matchUserId }),
      });
      if (res.ok) {
        setMatches((prev) =>
          prev.map((m) =>
            m.id === matchUserId ? { ...m, request_pending: true } : m,
          ),
        );
      }
    } catch (e) {
      console.warn("Bud request failed", e);
    } finally {
      setRequestingIds((prev) => {
        const s = new Set(prev);
        s.delete(matchUserId);
        return s;
      });
    }
  };

  const handleInvite = async () => {
    try {
      await Share.share({ message: "Come find me on Loam — https://loam.ing" });
    } catch (e) {
      // Cancelled share, nothing to do.
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <Loader size={72} />
      </View>
    );
  }

  const backButton = (
    <TouchableOpacity style={styles.backRow} onPress={() => router.back()}>
      <Text style={styles.backText}>← Back</Text>
    </TouchableOpacity>
  );

  // A compact "verified: [number] · change · remove" row, shown above the
  // contacts UI so the number is still manageable without its own screen.
  const phoneManageRow = phoneState && (
    <View style={styles.manageRow}>
      <Text style={styles.manageNumber}>{phoneState.phone_e164}</Text>
      <TouchableOpacity onPress={handleChangeNumber}>
        <Text style={styles.manageLink}>change</Text>
      </TouchableOpacity>
      <Text style={styles.manageDivider}>·</Text>
      <TouchableOpacity onPress={handleRemove}>
        <Text style={[styles.manageLink, styles.manageLinkDanger]}>remove</Text>
      </TouchableOpacity>
    </View>
  );

  // --- Phone: code entry ---
  // Button lives inside the KeyboardAvoidingView, directly under the
  // input, rather than pinned separately — see the loam-mobile keyboard
  // convention: pinning it outside the KAV would either bury it under the
  // keyboard or strand it above with a gap once the layout compresses.
  if (screen === "phone_code") {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {backButton}
        <View style={styles.content}>
          <Text style={styles.title}>Enter your code</Text>
          <Text style={styles.body}>We sent a 6-digit code to {e164}.</Text>

          <TextInput
            ref={codeInputRef}
            style={[styles.input, styles.codeInput]}
            placeholder="123456"
            placeholderTextColor={colors.brown200}
            value={code}
            onChangeText={(v) => setCode(v.replace(/\D/g, "").slice(0, 6))}
            keyboardType="number-pad"
            autoComplete="sms-otp"
            textContentType="oneTimeCode"
            maxLength={6}
          />

          {phoneError ? <Text style={styles.error}>{phoneError}</Text> : null}

          <TouchableOpacity
            style={[styles.button, working && styles.buttonDisabled]}
            onPress={handleVerify}
            disabled={working || code.length < 6}
          >
            <Text style={styles.buttonText}>
              {working ? "Verifying..." : "Verify"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleResend}
            disabled={cooldown > 0 || working}
          >
            <Text style={[styles.link, cooldown > 0 && styles.linkDisabled]}>
              {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setScreen("phone_enter");
              setCode("");
              setPhoneError("");
            }}
          >
            <Text style={styles.link}>Use a different number</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // --- Phone: number entry ---
  if (screen === "phone_enter") {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {backButton}
        <View style={styles.content}>
          <Text style={styles.title}>
            {phoneState ? "Change your number" : "Be easier to find"}
          </Text>
          <Text style={styles.body}>
            Friends who already have your number can find you on Loam without
            having to search. We'll text you a code to confirm it's yours.
          </Text>
          <Text style={styles.body}>
            Your number is never shown on your profile, and we don't use it for
            anything else.
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Phone number"
            placeholderTextColor={colors.brown200}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoComplete="tel"
            autoFocus
          />

          {phoneError ? <Text style={styles.error}>{phoneError}</Text> : null}

          <TouchableOpacity
            style={[styles.button, working && styles.buttonDisabled]}
            onPress={handleSendCode}
            disabled={working || !phone.trim()}
          >
            <Text style={styles.buttonText}>
              {working ? "Sending..." : "Send code"}
            </Text>
          </TouchableOpacity>

          {phoneState && (
            <TouchableOpacity
              style={styles.skipButton}
              onPress={() => setScreen("contacts_intro")}
            >
              <Text style={styles.skipText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    );
  }

  // --- Contacts: syncing ---
  if (screen === "contacts_syncing") {
    return (
      <View style={[styles.container, styles.centered]}>
        <Loader size={72} />
        <Text style={styles.loadingText}>Looking for your people…</Text>
      </View>
    );
  }

  // --- Contacts: results ---
  if (screen === "contacts_results") {
    return (
      <View style={styles.container}>
        {backButton}
        <ScrollView
          style={styles.resultsScroll}
          contentContainerStyle={styles.resultsContent}
        >
          {phoneManageRow}

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

          <TouchableOpacity onPress={runSync}>
            <Text style={styles.recheckLink}>Recheck my contacts</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // --- Contacts: intro (screen === "contacts_intro") ---
  return (
    <View style={styles.container}>
      {backButton}
      <View style={styles.content}>
        {phoneManageRow}

        <Text style={styles.title}>Find your people</Text>
        <Text style={styles.body}>
          Loam can check which of your contacts are already here, so you don't
          have to hunt for them one by one.
        </Text>
        <Text style={styles.body}>
          Your contacts stay on your phone. We scramble them before they're
          checked, and never see anyone who isn't already on Loam.
        </Text>

        {(denied || syncError) && (
          <Text style={styles.deniedNote}>
            {denied
              ? "Contacts access is off. You can turn it on in your phone's Settings."
              : syncError}
          </Text>
        )}
      </View>

      <TouchableOpacity style={styles.button} onPress={runSync}>
        <Text style={styles.buttonText}>Check my contacts</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: 60,
    paddingBottom: spacing.xxl,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  backRow: { marginBottom: spacing.sm },
  backText: {
    fontFamily: fonts.primary,
    fontSize: 16,
    color: colors.brown500,
  },
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
  manageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingBottom: spacing.md,
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.brown100,
  },
  manageNumber: {
    fontFamily: fonts.primaryBold,
    fontSize: 14,
    color: colors.brown700,
    flex: 1,
  },
  manageLink: {
    fontFamily: fonts.primary,
    fontSize: 13,
    color: colors.brown500,
  },
  manageLinkDanger: {
    color: colors.clay500,
  },
  manageDivider: {
    color: colors.brown200,
  },
  input: {
    ...inputs.input,
    marginTop: spacing.md,
  },
  codeInput: {
    fontSize: 24,
    letterSpacing: 8,
    textAlign: "center",
  },
  error: {
    ...typography.hg14,
    color: colors.clay500,
    lineHeight: 20,
  },
  link: {
    ...typography.hg14,
    color: colors.brown500,
    marginTop: spacing.sm,
    textAlign: "center",
  },
  linkDisabled: {
    color: colors.brown300,
  },
  button: {
    ...buttons.primary,
    marginTop: spacing.sm,
  },
  buttonDisabled: buttons.disabled,
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
  recheckLink: {
    ...typography.hg14,
    color: colors.brown300,
    textAlign: "center",
    marginTop: spacing.lg,
  },
});
