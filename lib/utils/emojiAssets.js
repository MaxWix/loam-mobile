/**
 * Custom reaction emoji assets, replacing the old unicode emoji picker.
 * Ported from the web app's $lib/utils/emojiAssets.js — same keys, same
 * tone system, same stored value format, so reactions look identical and
 * remain readable across both platforms.
 *
 * Assets live under assets/emojis-{tone}/, tone is 1-4 (1 = default/yellow).
 * Metro can't glob-import like Vite does, so every asset is imported
 * explicitly below and each import yields a React component (via
 * react-native-svg-transformer), not a URL string like on web.
 *
 * Reactions are stored as a string in the form `key:tone` (e.g. "celebrate:2").
 * Legacy reactions stored as plain unicode emoji (e.g. "❤️") are still
 * supported for rendering — they just fall back to plain text.
 */

import celebrate1 from "../../assets/emojis-1/celebrate-1.svg";
import celebrate2 from "../../assets/emojis-2/celebrate-2.svg";
import celebrate3 from "../../assets/emojis-3/celebrate-3.svg";
import celebrate4 from "../../assets/emojis-4/celebrate-4.svg";
import clap1 from "../../assets/emojis-1/clap-1.svg";
import clap2 from "../../assets/emojis-2/clap-2.svg";
import clap3 from "../../assets/emojis-3/clap-3.svg";
import clap4 from "../../assets/emojis-4/clap-4.svg";
import confounded1 from "../../assets/emojis-1/confounded-1.svg";
import confounded2 from "../../assets/emojis-2/confounded-2.svg";
import confounded3 from "../../assets/emojis-3/confounded-3.svg";
import confounded4 from "../../assets/emojis-4/confounded-4.svg";
import cry1 from "../../assets/emojis-1/cry-1.svg";
import cry2 from "../../assets/emojis-2/cry-2.svg";
import cry3 from "../../assets/emojis-3/cry-3.svg";
import cry4 from "../../assets/emojis-4/cry-4.svg";
import crylaugh1 from "../../assets/emojis-1/crylaugh-1.svg";
import crylaugh2 from "../../assets/emojis-2/crylaugh-2.svg";
import crylaugh3 from "../../assets/emojis-3/crylaugh-3.svg";
import crylaugh4 from "../../assets/emojis-4/crylaugh-4.svg";
import crytears1 from "../../assets/emojis-1/crytears-1.svg";
import crytears2 from "../../assets/emojis-2/crytears-2.svg";
import crytears3 from "../../assets/emojis-3/crytears-3.svg";
import crytears4 from "../../assets/emojis-4/crytears-4.svg";
import cute1 from "../../assets/emojis-1/cute-1.svg";
import cute2 from "../../assets/emojis-2/cute-2.svg";
import cute3 from "../../assets/emojis-3/cute-3.svg";
import cute4 from "../../assets/emojis-4/cute-4.svg";
import embarassed1 from "../../assets/emojis-1/embarassed-1.svg";
import embarassed2 from "../../assets/emojis-2/embarassed-2.svg";
import embarassed3 from "../../assets/emojis-3/embarassed-3.svg";
import embarassed4 from "../../assets/emojis-4/embarassed-4.svg";
import excited1 from "../../assets/emojis-1/excited-1.svg";
import excited2 from "../../assets/emojis-2/excited-2.svg";
import excited3 from "../../assets/emojis-3/excited-3.svg";
import excited4 from "../../assets/emojis-4/excited-4.svg";
import hearteyes1 from "../../assets/emojis-1/hearteyes-1.svg";
import hearteyes2 from "../../assets/emojis-2/hearteyes-2.svg";
import hearteyes3 from "../../assets/emojis-3/hearteyes-3.svg";
import hearteyes4 from "../../assets/emojis-4/hearteyes-4.svg";
import humble1 from "../../assets/emojis-1/humble-1.svg";
import humble2 from "../../assets/emojis-2/humble-2.svg";
import humble3 from "../../assets/emojis-3/humble-3.svg";
import humble4 from "../../assets/emojis-4/humble-4.svg";
import kiss1 from "../../assets/emojis-1/kiss-1.svg";
import kiss2 from "../../assets/emojis-2/kiss-2.svg";
import kiss3 from "../../assets/emojis-3/kiss-3.svg";
import kiss4 from "../../assets/emojis-4/kiss-4.svg";
import melting1 from "../../assets/emojis-1/melting-1.svg";
import melting2 from "../../assets/emojis-2/melting-2.svg";
import melting3 from "../../assets/emojis-3/melting-3.svg";
import melting4 from "../../assets/emojis-4/melting-4.svg";
import pray1 from "../../assets/emojis-1/pray-1.svg";
import pray2 from "../../assets/emojis-2/pray-2.svg";
import pray3 from "../../assets/emojis-3/pray-3.svg";
import pray4 from "../../assets/emojis-4/pray-4.svg";
import saluting1 from "../../assets/emojis-1/saluting-1.svg";
import saluting2 from "../../assets/emojis-2/saluting-2.svg";
import saluting3 from "../../assets/emojis-3/saluting-3.svg";
import saluting4 from "../../assets/emojis-4/saluting-4.svg";
import shades1 from "../../assets/emojis-1/shades-1.svg";
import shades2 from "../../assets/emojis-2/shades-2.svg";
import shades3 from "../../assets/emojis-3/shades-3.svg";
import shades4 from "../../assets/emojis-4/shades-4.svg";
import shocked1 from "../../assets/emojis-1/shocked-1.svg";
import shocked2 from "../../assets/emojis-2/shocked-2.svg";
import shocked3 from "../../assets/emojis-3/shocked-3.svg";
import shocked4 from "../../assets/emojis-4/shocked-4.svg";
import sleepy1 from "../../assets/emojis-1/sleepy-1.svg";
import sleepy2 from "../../assets/emojis-2/sleepy-2.svg";
import sleepy3 from "../../assets/emojis-3/sleepy-3.svg";
import sleepy4 from "../../assets/emojis-4/sleepy-4.svg";
import smile1 from "../../assets/emojis-1/smile-1.svg";
import smile2 from "../../assets/emojis-2/smile-2.svg";
import smile3 from "../../assets/emojis-3/smile-3.svg";
import smile4 from "../../assets/emojis-4/smile-4.svg";
import smiletongue1 from "../../assets/emojis-1/smiletongue-1.svg";
import smiletongue2 from "../../assets/emojis-2/smiletongue-2.svg";
import smiletongue3 from "../../assets/emojis-3/smiletongue-3.svg";
import smiletongue4 from "../../assets/emojis-4/smiletongue-4.svg";
import squintingtongue1 from "../../assets/emojis-1/squintingtongue-1.svg";
import squintingtongue2 from "../../assets/emojis-2/squintingtongue-2.svg";
import squintingtongue3 from "../../assets/emojis-3/squintingtongue-3.svg";
import squintingtongue4 from "../../assets/emojis-4/squintingtongue-4.svg";
import stareyes1 from "../../assets/emojis-1/stareyes-1.svg";
import stareyes2 from "../../assets/emojis-2/stareyes-2.svg";
import stareyes3 from "../../assets/emojis-3/stareyes-3.svg";
import stareyes4 from "../../assets/emojis-4/stareyes-4.svg";
import thumbsup1 from "../../assets/emojis-1/thumbsup-1.svg";
import thumbsup2 from "../../assets/emojis-2/thumbsup-2.svg";
import thumbsup3 from "../../assets/emojis-3/thumbsup-3.svg";
import thumbsup4 from "../../assets/emojis-4/thumbsup-4.svg";
import tongue1 from "../../assets/emojis-1/tongue-1.svg";
import tongue2 from "../../assets/emojis-2/tongue-2.svg";
import tongue3 from "../../assets/emojis-3/tongue-3.svg";
import tongue4 from "../../assets/emojis-4/tongue-4.svg";
import woozy1 from "../../assets/emojis-1/woozy-1.svg";
import woozy2 from "../../assets/emojis-2/woozy-2.svg";
import woozy3 from "../../assets/emojis-3/woozy-3.svg";
import woozy4 from "../../assets/emojis-4/woozy-4.svg";

import clownShared from "../../assets/emojis-1/clown.svg";
import devilShared from "../../assets/emojis-1/devil.svg";
import dottedlineShared from "../../assets/emojis-1/dottedline.svg";
import freezingShared from "../../assets/emojis-1/freezing.svg";
import ghostShared from "../../assets/emojis-1/ghost.svg";
import heartShared from "../../assets/emojis-1/heart.svg";
import leavesShared from "../../assets/emojis-1/leaves.svg";
import overheatingShared from "../../assets/emojis-1/overheating.svg";
import plantShared from "../../assets/emojis-1/plant.svg";
import poopShared from "../../assets/emojis-1/poop.svg";
import skullShared from "../../assets/emojis-1/skull.svg";
import skullcrossbonesShared from "../../assets/emojis-1/skullcrossbones.svg";
import vomitShared from "../../assets/emojis-1/vomit.svg";

export const DEFAULT_EMOJI_TONE = 1;
export const EMOJI_TONES = [1, 2, 3, 4];

/** @type {Record<number, Record<string, any>>} */
const assetsByTone = {
  1: {
    celebrate: celebrate1,
    clap: clap1,
    confounded: confounded1,
    cry: cry1,
    crylaugh: crylaugh1,
    crytears: crytears1,
    cute: cute1,
    embarassed: embarassed1,
    excited: excited1,
    hearteyes: hearteyes1,
    humble: humble1,
    kiss: kiss1,
    melting: melting1,
    pray: pray1,
    saluting: saluting1,
    shades: shades1,
    shocked: shocked1,
    sleepy: sleepy1,
    smile: smile1,
    smiletongue: smiletongue1,
    squintingtongue: squintingtongue1,
    stareyes: stareyes1,
    thumbsup: thumbsup1,
    tongue: tongue1,
    woozy: woozy1,
  },
  2: {
    celebrate: celebrate2,
    clap: clap2,
    confounded: confounded2,
    cry: cry2,
    crylaugh: crylaugh2,
    crytears: crytears2,
    cute: cute2,
    embarassed: embarassed2,
    excited: excited2,
    hearteyes: hearteyes2,
    humble: humble2,
    kiss: kiss2,
    melting: melting2,
    pray: pray2,
    saluting: saluting2,
    shades: shades2,
    shocked: shocked2,
    sleepy: sleepy2,
    smile: smile2,
    smiletongue: smiletongue2,
    squintingtongue: squintingtongue2,
    stareyes: stareyes2,
    thumbsup: thumbsup2,
    tongue: tongue2,
    woozy: woozy2,
  },
  3: {
    celebrate: celebrate3,
    clap: clap3,
    confounded: confounded3,
    cry: cry3,
    crylaugh: crylaugh3,
    crytears: crytears3,
    cute: cute3,
    embarassed: embarassed3,
    excited: excited3,
    hearteyes: hearteyes3,
    humble: humble3,
    kiss: kiss3,
    melting: melting3,
    pray: pray3,
    saluting: saluting3,
    shades: shades3,
    shocked: shocked3,
    sleepy: sleepy3,
    smile: smile3,
    smiletongue: smiletongue3,
    squintingtongue: squintingtongue3,
    stareyes: stareyes3,
    thumbsup: thumbsup3,
    tongue: tongue3,
    woozy: woozy3,
  },
  4: {
    celebrate: celebrate4,
    clap: clap4,
    confounded: confounded4,
    cry: cry4,
    crylaugh: crylaugh4,
    crytears: crytears4,
    cute: cute4,
    embarassed: embarassed4,
    excited: excited4,
    hearteyes: hearteyes4,
    humble: humble4,
    kiss: kiss4,
    melting: melting4,
    pray: pray4,
    saluting: saluting4,
    shades: shades4,
    shocked: shocked4,
    sleepy: sleepy4,
    smile: smile4,
    smiletongue: smiletongue4,
    squintingtongue: squintingtongue4,
    stareyes: stareyes4,
    thumbsup: thumbsup4,
    tongue: tongue4,
    woozy: woozy4,
  },
};

/** @type {Record<string, any>} */
const sharedAssets = {
  clown: clownShared,
  devil: devilShared,
  dottedline: dottedlineShared,
  freezing: freezingShared,
  ghost: ghostShared,
  heart: heartShared,
  leaves: leavesShared,
  overheating: overheatingShared,
  plant: plantShared,
  poop: poopShared,
  skull: skullShared,
  skullcrossbones: skullcrossbonesShared,
  vomit: vomitShared,
};

/**
 * Preferred display order for the emoji picker, grouped by "category" so
 * similar reactions (smileys, sad, shocked, gross/spooky, hand gestures)
 * appear together instead of in random/alphabetical order. Any key that
 * exists in the assets but isn't listed here is appended alphabetically
 * at the end, so new emoji assets never disappear from the picker.
 * Kept identical to the web app's order for visual parity.
 * @type {string[]}
 */
const EMOJI_CATEGORY_ORDER = [
  // Faces
  "smile",
  "cute",
  "excited",
  "hearteyes",
  "kiss",
  "tongue",
  "smiletongue",
  "squintingtongue",
  "humble",
  "shades",
  "celebrate",
  "crylaugh",
  "cry",
  "crytears",
  "sleepy",
  "woozy",
  "melting",
  "overheating",
  "freezing",
  "vomit",
  "shocked",
  "stareyes",
  "confounded",
  "embarassed",
  "saluting",
  // Spooky / objects
  "skull",
  "skullcrossbones",
  "devil",
  "poop",
  "clown",
  "ghost",
  // Hand gestures
  "clap",
  "pray",
  "thumbsup",
];

/**
 * All emoji keys available in the picker, ordered by category. Any key not
 * present in EMOJI_CATEGORY_ORDER is appended alphabetically at the end.
 * @returns {string[]}
 */
export function getEmojiKeys() {
  const allKeys = new Set([
    ...Object.keys(assetsByTone[DEFAULT_EMOJI_TONE]),
    ...Object.keys(sharedAssets),
  ]);

  const ordered = EMOJI_CATEGORY_ORDER.filter((key) => allKeys.has(key));
  const remaining = [...allKeys]
    .filter((key) => !EMOJI_CATEGORY_ORDER.includes(key))
    .sort();

  return [...ordered, ...remaining];
}

/**
 * Resolve the SVG component for a given emoji key + skin tone.
 * (Web's equivalent returns a URL string for <img src>; here it's the
 * actual component, rendered as <Component width={..} height={..} />.)
 * @param {string} key
 * @param {number} [tone]
 * @returns {React.ComponentType|null}
 */
export function resolveEmojiComponent(key, tone = DEFAULT_EMOJI_TONE) {
  if (!key) return null;
  const safeTone = EMOJI_TONES.includes(tone) ? tone : DEFAULT_EMOJI_TONE;
  return assetsByTone[safeTone]?.[key] || sharedAssets[key] || null;
}

/**
 * Build the value stored on a reaction row for a given key + tone.
 * @param {string} key
 * @param {number} [tone]
 * @returns {string}
 */
export function buildReactionValue(key, tone = DEFAULT_EMOJI_TONE) {
  return `${key}:${tone}`;
}

/**
 * Maps legacy plain-unicode reactions (saved before the custom emoji picker
 * existed) to the closest custom asset key. Old reactions have no stored
 * skin tone, so they're always rendered at DEFAULT_EMOJI_TONE (yellow).
 * Any unicode emoji not listed here simply renders as text — never breaks.
 * Kept identical to the web app's mapping so the same historical reaction
 * looks the same on both platforms.
 * @type {Record<string, string>}
 */
const LEGACY_UNICODE_TO_KEY = {
  "😊": "smile",
  "🙂": "smile",
  "😀": "smile",
  "😁": "smile",
  "😃": "smile",
  "😄": "smile",
  "😆": "smile",
  "😂": "crylaugh",
  "🤣": "crylaugh",
  "😭": "crytears",
  "😢": "cry",
  "😍": "hearteyes",
  "🥰": "hearteyes",
  "😘": "kiss",
  "😚": "kiss",
  "😙": "kiss",
  "😜": "tongue",
  "😝": "tongue",
  "😛": "tongue",
  "😎": "shades",
  "🥳": "celebrate",
  "🎉": "celebrate",
  "👏": "clap",
  "🙏": "pray",
  "👍": "thumbsup",
  "💀": "skull",
  "☠️": "skullcrossbones",
  "💩": "poop",
  "😴": "sleepy",
  "🥶": "freezing",
  "🥵": "overheating",
  "😳": "embarassed",
  "😖": "embarassed",
  "👻": "ghost",
  "😈": "devil",
  "👿": "devil",
  "🤢": "vomit",
  "🤮": "vomit",
  "😮‍💨": "woozy",
  "😵": "woozy",
  "😲": "shocked",
  "😱": "shocked",
  "🥺": "humble",
  "😌": "humble",
  "👀": "stareyes",
  "😲‍": "stareyes",
  "❤️": "heart",
};

/**
 * Parse a stored reaction value into { key, tone } or null if it's a legacy
 * plain unicode emoji with no custom asset match (caller should then just
 * render the raw string as text).
 * @param {string} value
 * @returns {{ key: string, tone: number } | null}
 */
export function parseReactionValue(value) {
  if (!value || typeof value !== "string") return null;

  // New format: "key:tone"
  if (value.includes(":")) {
    const [key, toneRaw] = value.split(":");
    const tone = Number(toneRaw);
    if (key && EMOJI_TONES.includes(tone) && resolveEmojiComponent(key, tone)) {
      return { key, tone };
    }
  }

  // Legacy format: raw unicode emoji saved before the custom picker existed.
  const legacyKey = LEGACY_UNICODE_TO_KEY[value];
  if (legacyKey && resolveEmojiComponent(legacyKey, DEFAULT_EMOJI_TONE)) {
    return { key: legacyKey, tone: DEFAULT_EMOJI_TONE };
  }

  return null;
}
