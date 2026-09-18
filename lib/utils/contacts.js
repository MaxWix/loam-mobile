import * as Contacts from "expo-contacts";
import * as Crypto from "expo-crypto";

// Contact matching, done without ever sending Loam anyone's address book.
//
// The rule: normalize locally, hash locally, send only hashes. The server
// compares them against hashes of its own users and returns matches. It
// never receives a readable email or number for anyone who isn't already a
// Loam user, and nothing about non-matching contacts is stored.
//
// Matches on both phone numbers and emails. Phone is the one that actually
// works in practice — most address book entries have a number and no email
// — but both are hashed the same way and sent together.

/**
 * Normalize an email for hashing. Both sides must normalize identically or
 * nothing will ever match, so this stays deliberately simple: trim and
 * lowercase, nothing clever like stripping dots or +tags.
 * @param {string} email
 */
export function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

/**
 * Normalize a phone number to E.164 (+15551234567).
 *
 * Both sides must produce byte-identical strings or the hashes won't match,
 * which is why anything ambiguous returns null instead of being guessed at:
 * a wrong guess doesn't fail loudly, it just silently never matches.
 *
 * @param {string} phone
 * @param {string} defaultCountryCode digits only, e.g. "1" for US
 */
export function normalizePhone(phone, defaultCountryCode = "1") {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return null;
  if (String(phone).trim().startsWith("+")) return `+${digits}`;
  // A US number typed locally is 10 digits; 11 starting with 1 already has
  // the country code. Anything else is ambiguous, so leave it alone rather
  // than guessing wrong and producing a hash that can never match.
  if (digits.length === 10) return `+${defaultCountryCode}${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

/**
 * SHA-256 of a normalized value.
 * @param {string} value
 * @returns {Promise<string>} lowercase hex
 */
export async function hashValue(value) {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, value, {
    encoding: Crypto.CryptoEncoding.HEX,
  });
}

export async function getContactsPermission() {
  try {
    return await Contacts.getPermissionsAsync();
  } catch {
    return null;
  }
}

export async function requestContactsPermission() {
  try {
    return await Contacts.requestPermissionsAsync();
  } catch (e) {
    console.warn("Contacts permission request failed", e);
    return null;
  }
}

/**
 * Read the address book and return hashed phone numbers and emails, plus
 * enough local-only detail to render the results list.
 *
 * The `contacts` array never leaves the device — only `hashes` is sent.
 * One contact can produce several hashes (two numbers and an email), all
 * pointing back at the same person.
 *
 * @param {string} defaultCountryCode digits only, for numbers stored without one
 * @returns {Promise<{ granted: boolean, hashes: string[], contacts: Array<{ id: string, name: string, hashes: string[] }> }>}
 */
export async function collectContactHashes(defaultCountryCode = "1") {
  const permission = await requestContactsPermission();
  if (permission?.status !== "granted") {
    return { granted: false, hashes: [], contacts: [] };
  }

  const { data } = await Contacts.getContactsAsync({
    fields: [
      Contacts.Fields.PhoneNumbers,
      Contacts.Fields.Emails,
      Contacts.Fields.Name,
    ],
  });

  /** @type {Array<{ id: string, name: string, hashes: string[] }>} */
  const contacts = [];
  // Values already hashed this run, so a number saved on two contacts
  // doesn't get hashed or sent twice.
  const seenValues = new Set();

  for (const contact of data || []) {
    const values = [];

    for (const entry of contact.phoneNumbers || []) {
      const normalized = normalizePhone(entry.number, defaultCountryCode);
      if (normalized) values.push(normalized);
    }
    for (const entry of contact.emails || []) {
      const normalized = normalizeEmail(entry.email);
      if (normalized) values.push(normalized);
    }

    const fresh = values.filter((v) => !seenValues.has(v));
    if (!fresh.length) continue;
    fresh.forEach((v) => seenValues.add(v));

    const hashes = [];
    for (const value of fresh) {
      hashes.push(await hashValue(value));
    }

    contacts.push({
      id: String(contact.id),
      name: contact.name || "Someone",
      hashes,
    });
  }

  return {
    granted: true,
    hashes: contacts.flatMap((c) => c.hashes),
    contacts,
  };
}
