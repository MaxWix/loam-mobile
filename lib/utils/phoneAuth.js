import { normalizePhone } from "./contacts";

// Phone verification and phone sign-in, both built on Supabase Auth's OTP
// support rather than a hand-rolled code table.
//
// Requires an SMS provider configured in Supabase (Authentication →
// Providers → Phone). Every send costs money, so the UI should rate-limit
// resends rather than letting someone tap repeatedly.
//
// Two different flows use the same OTP mechanism, and they are NOT
// interchangeable — the `type` passed to verifyOtp differs:
//
//   linking a number to a signed-in account -> type: "phone_change"
//   signing in with a number                -> type: "sms"
//
// Passing the wrong one fails with an unhelpful error, which is most of
// why these are wrapped here instead of called inline.

/**
 * Start linking a phone number to the currently signed-in account.
 * Sends an OTP to the number.
 *
 * @returns {Promise<{ ok: boolean, e164?: string, error?: string }>}
 */
export async function startPhoneLink(supabase, rawPhone) {
  const e164 = normalizePhone(rawPhone);
  if (!e164) {
    return {
      ok: false,
      error: "That doesn't look like a valid phone number.",
    };
  }

  const { error } = await supabase.auth.updateUser({ phone: e164 });
  if (error) {
    console.warn("Phone link failed", error);
    return { ok: false, error: friendlyError(error) };
  }
  return { ok: true, e164 };
}

/**
 * Confirm the code sent by startPhoneLink, then record the number for
 * contact matching.
 *
 * The `user_phones` write happens only after Supabase confirms the code —
 * that ordering is the whole point of verification. Writing first and
 * verifying after would make an unverified number discoverable in the
 * window between.
 *
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export async function confirmPhoneLink(supabase, e164, code, userId) {
  const { error } = await supabase.auth.verifyOtp({
    phone: e164,
    token: code,
    type: "phone_change",
  });
  if (error) {
    console.warn("Phone verification failed", error);
    return { ok: false, error: friendlyError(error) };
  }

  const { error: writeError } = await supabase
    .from("user_phones")
    .upsert(
      { user_id: userId, phone_e164: e164, verified: true },
      { onConflict: "user_id" },
    );

  if (writeError) {
    // The number is verified on the auth side either way; this only means
    // contact matching won't find them. Most likely cause is the unique
    // constraint — another account already claims this number.
    console.warn("Could not record verified phone", writeError);
    return {
      ok: false,
      error:
        "That number is verified, but it's already linked to another Loam account.",
    };
  }

  return { ok: true };
}

/**
 * Send a sign-in code to a phone number. Only works for numbers already
 * linked to an account.
 *
 * `shouldCreateUser: false` matters: without it, signing in with an unknown
 * number silently creates a brand new account instead of failing, which
 * would strand someone in an empty duplicate of their own profile.
 *
 * @returns {Promise<{ ok: boolean, e164?: string, error?: string }>}
 */
export async function startPhoneSignIn(supabase, rawPhone) {
  const e164 = normalizePhone(rawPhone);
  if (!e164) {
    return {
      ok: false,
      error: "That doesn't look like a valid phone number.",
    };
  }

  const { error } = await supabase.auth.signInWithOtp({
    phone: e164,
    options: { shouldCreateUser: false },
  });
  if (error) {
    console.warn("Phone sign-in failed", error);
    return { ok: false, error: friendlyError(error) };
  }
  return { ok: true, e164 };
}

/**
 * Confirm a sign-in code. On success the session is set and the app's
 * normal auth routing takes over.
 *
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export async function confirmPhoneSignIn(supabase, e164, code) {
  const { error } = await supabase.auth.verifyOtp({
    phone: e164,
    token: code,
    type: "sms",
  });
  if (error) {
    console.warn("Phone sign-in verification failed", error);
    return { ok: false, error: friendlyError(error) };
  }
  return { ok: true };
}

/**
 * Record that the user has been asked to add a number, so the prompt shows
 * once rather than at every sign-in.
 */
export async function dismissPhonePrompt(supabase, userId) {
  const { error } = await supabase
    .from("profiles")
    .update({ phone_prompt_dismissed_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) console.warn("Could not record phone prompt dismissal", error);
}

/**
 * Is this identifier an email address rather than a phone number?
 *
 * Just checks for "@" on purpose. A full email regex would be stricter but
 * no more useful here — the only decision being made is which auth path to
 * take, and no valid phone number contains "@". Anything malformed gets
 * rejected by Supabase with a real error message either way.
 *
 * @param {string} value
 */
export function looksLikeEmail(value) {
  return String(value || "").includes("@");
}

/** Supabase auth errors are terse and often internal-sounding. */
function friendlyError(error) {
  const message = String(error?.message || "").toLowerCase();

  if (
    message.includes("already been registered") ||
    message.includes("already exists")
  ) {
    return "That number is already linked to another Loam account.";
  }
  if (message.includes("invalid") && message.includes("token")) {
    return "That code didn't work. Check it and try again.";
  }
  if (message.includes("expired")) {
    return "That code expired. Request a new one.";
  }
  if (message.includes("rate") || message.includes("too many")) {
    return "Too many attempts. Wait a minute and try again.";
  }
  if (message.includes("not found") || message.includes("no user")) {
    return "No Loam account uses that number. Try signing in with your email.";
  }
  return "Something went wrong. Please try again.";
}
