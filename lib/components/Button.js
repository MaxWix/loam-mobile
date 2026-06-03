import { TouchableOpacity, Text, StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { colors, typography, radius, fonts } from "../theme";
import EditIcon from "../../assets/icons/edit.svg";
import ShareIcon from "../../assets/icons/Share.svg";

// Organic blob shape for icon buttons — matches the web app's CSS mask
const ICON_BLOB_PATH =
  "M38.0571 18.4656C38.0571 28.1925 28.0073 37 16.9143 37C5.82125 37 0 28.1925 0 18.4656C0 8.7388 10.0498 0 21.1429 0C32.2359 0 38.0571 8.7388 38.0571 18.4656Z";

const ICON_COMPONENTS = {
  edit: EditIcon,
  share: ShareIcon,
};

const VARIANTS = {
  lime: {
    container: { backgroundColor: colors.lime500 },
    text: { color: colors.brown500 },
    iconBg: colors.lime500,
  },
  ghost: {
    container: {
      backgroundColor: "transparent",
      borderWidth: 2,
      borderColor: colors.brown500,
    },
    text: { color: colors.brown500 },
    iconBg: colors.brown500,
  },
  gray: {
    container: { backgroundColor: colors.green100 },
    text: { color: colors.brown500 },
    iconBg: colors.green100,
  },
  white: {
    container: { backgroundColor: colors.white400 },
    text: { color: colors.brown500 },
    iconBg: colors.white400,
  },
  clay: {
    container: { backgroundColor: colors.clay300 },
    text: { color: colors.brown500 },
    iconBg: colors.clay300,
  },
  brown: {
    container: { backgroundColor: colors.brown300 },
    text: { color: colors.white200 },
    iconBg: colors.brown300,
  },
  primary: {
    container: { backgroundColor: colors.brown500 },
    text: { color: colors.white200 },
    iconBg: colors.brown500,
  },
  danger: {
    container: { backgroundColor: "#ef4444" },
    text: { color: colors.white200 },
    iconBg: "#ef4444",
  },
};

const SIZES = {
  medium: {
    container: {
      height: 46,
      paddingHorizontal: 24,
      borderRadius: radius.full,
      width: "100%",
    },
    text: { fontFamily: fonts.primaryBold, ...typography.hg14 },
  },
  small: {
    container: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: radius.full,
    },
    text: { fontFamily: fonts.primaryBold, ...typography.hg14 },
  },
  sideBySide: {
    container: {
      flex: 1,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: radius.full,
    },
    text: { fontFamily: fonts.primaryBold, ...typography.hg14 },
  },
  icon: {
    container: {
      width: 39,
      height: 37,
      padding: 0,
    },
    text: {},
  },
};

export default function Button({
  children,
  onPress,
  variant = "lime",
  size = "medium",
  disabled = false,
  icon,
  style,
}) {
  const variantStyle = VARIANTS[variant] || VARIANTS.lime;
  const sizeStyle = SIZES[size] || SIZES.medium;

  // Icon button — organic blob shape with SVG icon inside
  if (size === "icon") {
    const IconComponent = icon ? ICON_COMPONENTS[icon] : null;

    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        style={[styles.iconButton, disabled && styles.disabled, style]}
        activeOpacity={0.8}
      >
        <Svg width={39} height={37} viewBox="0 0 39 37" fill="none">
          <Path d={ICON_BLOB_PATH} fill={variantStyle.iconBg} />
        </Svg>
        {IconComponent && (
          <View style={styles.iconOverlay}>
            <IconComponent width={20} height={20} />
          </View>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.base,
        sizeStyle.container,
        variantStyle.container,
        disabled && styles.disabled,
        style,
      ]}
      activeOpacity={0.8}
    >
      <Text style={[sizeStyle.text, variantStyle.text]}>{children}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: {
    opacity: 0.5,
  },
  iconButton: {
    width: 39,
    height: 37,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  iconOverlay: {
    position: "absolute",
    width: 39,
    height: 37,
    alignItems: "center",
    justifyContent: "center",
  },
  iconImg: {
    width: 20,
    height: 20,
  },
});
