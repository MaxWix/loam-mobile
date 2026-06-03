/**
 * theme.js
 * Single source of truth for all design tokens in the mobile app.
 * Mirrors _abstracts.scss from the web app exactly.
 * Import this in every screen and component.
 *
 * Usage:
 *   import { colors, typography, buttons, inputs, layout } from '../../lib/theme';
 */

// --- COLORS ---
// Mirrors $brown-*, $green-*, $lime-*, $clay-*, $blue-* from _abstracts.scss
export const colors = {
  // Primary browns
  brown900: "#100900",
  brown700: "#261700",
  brown500: "#462B01",
  brown300: "#867966",
  brown200: "#B6AFA3",
  brown100: "#DAD5CC",
  brown50: "#F3EEE4",

  // Whites
  white400: "#FAF5EA",
  white200: "#FFFEFA",

  // Greens
  green900: "#212407",
  green700: "#2E330A",
  green500: "#42480E",
  green300: "#8C916E",
  green100: "#D9DACF",
  green50: "#ECEDE2",

  // Limes
  lime900: "#232316",
  lime700: "#5A5A34",
  lime500: "#AFB066",
  lime300: "#CFD0A3",
  lime100: "#F5F5E1",

  // Clays
  clay900: "#351C12",
  clay700: "#62311F",
  clay500: "#9E5135",
  clay300: "#C59786",
  clay200: "#DCC0B5",
  clay100: "#ECDCD7",
  clay50: "#F5EDEB",

  // Blues
  blue500: "#668FB0",
  blue100: "#E1EFF5",
};

// --- TYPOGRAPHY ---
// React Native uses numeric font weights, not strings like '800'
// 'display' = Bricolage Grotesque, 'primary' = Host Grotesk
// Note: Custom fonts require expo-font setup (see docs/MOBILE_DEV_GUIDE.md)
// Until fonts are loaded, system fonts are used as fallback.
export const fonts = {
  display: "BricolageGrotesque",
  displayMedium: "BricolageGrotesque-Medium",
  displayBold: "BricolageGrotesque-Bold",
  displayExtraBold: "BricolageGrotesque-ExtraBold",
  primary: "HostGrotesk",
  primaryMedium: "HostGrotesk-Medium",
  primaryBold: "HostGrotesk-Bold",
};

// Typography scale — mirrors the mixins from _abstracts.scss
export const typography = {
  // Display / headings (Bricolage Grotesque)
  h1: { fontFamily: fonts.displayBold, fontSize: 24 },
  h2: { fontFamily: fonts.displayMedium, fontSize: 20 },
  wordmark: { fontFamily: fonts.displayExtraBold, fontSize: 28 },
  bg24Bold: { fontFamily: fonts.displayBold, fontSize: 24 },
  bg18Bold: { fontFamily: fonts.displayBold, fontSize: 18 },
  bg24: { fontFamily: fonts.display, fontSize: 24 },
  bg20: { fontFamily: fonts.display, fontSize: 20 },

  // Body (Host Grotesk)
  h3: { fontFamily: fonts.primaryBold, fontSize: 16 },
  h4: { fontFamily: fonts.primary, fontSize: 14 },
  bodyLarge: { fontFamily: fonts.primary, fontSize: 16 },
  bodyMedium: { fontFamily: fonts.primary, fontSize: 14 },
  bodySmall: { fontFamily: fonts.primary, fontSize: 12 },
  hg24: { fontFamily: fonts.primary, fontSize: 24 },
  hg20: { fontFamily: fonts.primary, fontSize: 20 },
  hg18: { fontFamily: fonts.primary, fontSize: 18 },
  hg16: { fontFamily: fonts.primary, fontSize: 16 },
  hg14: { fontFamily: fonts.primary, fontSize: 14 },
  hg12: { fontFamily: fonts.primary, fontSize: 12 },
};

// --- SPACING ---
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  screenTop: 80, // Standard top padding for screens
  screenHorizontal: 32, // Standard horizontal padding for screens
};

// --- BORDER RADIUS ---
export const radius = {
  sm: 10,
  md: 12,
  lg: 24,
  full: 44, // Matches the pill shape on web buttons
};

// --- COMMON COMPONENT STYLES ---
// Ready-to-use StyleSheet objects for shared components.
// Spread these into your local StyleSheet.create() calls.

export const buttons = {
  // Primary: brown500 background — matches .btn.brown on web
  primary: {
    backgroundColor: colors.brown500,
    paddingVertical: 14,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  primaryText: {
    ...typography.hg14,
    color: colors.white200,
    fontWeight: "700",
  },

  // Lime: lime500 background — matches .btn.lime on web
  lime: {
    backgroundColor: colors.lime500,
    paddingVertical: 14,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  limeText: {
    ...typography.hg14,
    color: colors.brown500,
    fontWeight: "700",
  },

  // Ghost: transparent with border — matches .btn.ghost on web
  ghost: {
    backgroundColor: "transparent",
    paddingVertical: 14,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.brown500,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  ghostText: {
    ...typography.hg14,
    color: colors.brown500,
    fontWeight: "700",
  },

  // Gray: green100 background — matches .btn.gray on web
  gray: {
    backgroundColor: colors.green100,
    paddingVertical: 14,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  grayText: {
    ...typography.hg14,
    color: colors.brown500,
    fontWeight: "700",
  },

  // Disabled state — apply alongside any button variant
  disabled: {
    opacity: 0.5,
  },
};

export const inputs = {
  // Standard input — matches input:not(.organic-input) on web
  input: {
    backgroundColor: colors.white400,
    borderWidth: 1,
    borderColor: colors.brown300,
    borderRadius: radius.full, // pill shape like web
    paddingHorizontal: 19,
    paddingVertical: 16,
    ...typography.hg16,
    color: colors.brown900,
    width: "100%",
  },
  // Textarea variant — matches textarea:not(.organic-textarea) on web
  textarea: {
    backgroundColor: colors.white400,
    borderWidth: 1,
    borderColor: colors.brown300,
    borderRadius: radius.lg,
    paddingHorizontal: 19,
    paddingVertical: 16,
    ...typography.hg16,
    color: colors.brown900,
    width: "100%",
    textAlignVertical: "top",
  },
  errorText: {
    ...typography.hg12,
    color: colors.clay500,
    marginTop: -8,
    marginBottom: 8,
    paddingLeft: 19,
  },
};

// --- SCREEN LAYOUT ---
// Standard screen wrapper styles
export const layout = {
  screen: {
    flex: 1,
    backgroundColor: colors.brown50,
  },
  screenContent: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.screenTop,
    paddingBottom: spacing.xxl,
  },
  wordmark: {
    ...typography.wordmark,
    color: colors.brown700,
    marginBottom: spacing.lg,
  },
  pageTitle: {
    ...typography.h1,
    color: colors.brown900,
    marginBottom: spacing.sm,
  },
  pageSubtitle: {
    ...typography.hg16,
    color: colors.brown500,
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
};
