import { View, TextInput, Text, StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";
import { colors, fonts, typography, spacing } from "../theme";

// SVG paths from the web app Input.svelte
const ORGANIC_INPUT_PATHS = {
  fill: "M8.20624 50.0633C-4.77788 48.7959 0.49916 25.2185 4.77518 11.3351C6.66371 5.2034 12.3085 1.23649 18.7233 1.11288C47.5718 0.556951 137.414 -0.723797 308.41 0.537413C338.019 0.755796 334.444 27.0118 330.134 41.6686C328.374 47.6545 322.841 51.3223 316.602 51.3663C265.871 51.7238 39.6463 53.1322 8.20624 50.0633Z",
  stroke:
    "M2.04102 45.2109C0.828732 42.7125 0.403159 39.3083 0.51758 35.4453C0.746232 27.7278 3.11746 18.4159 5.25293 11.4824C7.07336 5.57186 12.518 1.73225 18.7324 1.61231C47.5758 1.05648 137.415 -0.224067 308.407 1.03712C315.737 1.09125 320.954 2.75657 324.608 5.4004C328.259 8.04137 330.398 11.694 331.509 15.8184C333.739 24.1005 331.805 34.2146 329.654 41.5274C327.964 47.2748 322.646 50.8236 316.598 50.8662C291.232 51.045 221.995 51.4868 155.17 51.5C88.3242 51.5132 23.9435 51.0968 8.25488 49.5654C5.1977 49.267 3.23647 47.6745 2.04102 45.2109Z",
};

const ORGANIC_TEXTAREA_PATHS = {
  fill: "M9.20624 105.903C-5.19317 102.93 2.86654 41.913 7.11283 15.193C8.26825 7.92246 14.3452 2.56426 21.7013 2.27498C52.5356 1.06237 142.15 -1.47283 309.41 1.13684C341.742 1.64128 334.506 67.8212 329.951 96.0143C328.764 103.366 322.45 108.589 315.004 108.698C259.603 109.51 40.1378 112.29 9.20624 105.903Z",
  stroke:
    "M2.69922 94.1426C1.50637 87.6418 1.29452 78.9449 1.66699 69.4727C2.41158 50.5374 5.48403 28.6269 7.60645 15.2715C8.72414 8.23833 14.6012 3.05451 21.7207 2.77441C52.5445 1.56222 142.149 -0.972805 309.402 1.63673C317.272 1.75951 322.736 5.86041 326.465 12.4561C330.209 19.0786 332.185 28.1942 333.015 38.2334C334.673 58.3024 331.734 81.8463 329.458 95.9346C328.311 103.036 322.211 108.093 314.996 108.198C287.296 108.604 218.583 109.502 152.929 109.5C120.101 109.499 88.042 109.273 62.2578 108.648C36.4495 108.023 16.9863 106.999 9.30762 105.413C7.69661 105.08 6.34937 103.93 5.24219 101.999C4.13293 100.064 3.29598 97.3948 2.69922 94.1426Z",
};

export default function Input({
  value,
  onChangeText,
  placeholder,
  label,
  error,
  type = "text",
  organic = false,
  multiline = false,
  secureTextEntry = false,
  autoCapitalize = "sentences",
  keyboardType = "default",
  autoFocus = false,
  placeholderTextColor,
  style,
}) {
  const isTextarea = type === "textarea" || multiline;
  const paths = isTextarea ? ORGANIC_TEXTAREA_PATHS : ORGANIC_INPUT_PATHS;
  const viewBox = isTextarea ? "0 0 336 110" : "0 0 333 52";
  const aspectRatio = isTextarea ? 336 / 110 : 333 / 52;

  if (organic) {
    return (
      <View style={[styles.organicWrapper, style]}>
        {label && <Text style={styles.label}>{label}</Text>}
        <View style={styles.organicInputContainer}>
          <Svg
            style={StyleSheet.absoluteFill}
            viewBox={viewBox}
            preserveAspectRatio="none"
          >
            <Path d={paths.fill} fill="transparent" />
            <Path
              d={paths.stroke}
              fill="none"
              stroke={colors.brown500}
              strokeOpacity={0.8}
            />
          </Svg>
          <TextInput
            style={[styles.organicInput, isTextarea && styles.organicTextarea]}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={placeholderTextColor || colors.brown300}
            secureTextEntry={secureTextEntry}
            autoCapitalize={autoCapitalize}
            keyboardType={keyboardType}
            autoFocus={autoFocus}
            multiline={isTextarea}
          />
        </View>
        {error && <Text style={styles.error}>{error}</Text>}
      </View>
    );
  }

  return (
    <View style={[styles.wrapper, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[styles.input, isTextarea && styles.textarea]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={placeholderTextColor || colors.brown300}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        autoFocus={autoFocus}
        multiline={isTextarea}
      />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    marginBottom: spacing.md,
  },
  organicWrapper: {
    width: "100%",
    marginBottom: spacing.md,
  },
  label: {
    fontFamily: fonts.primaryBold,
    fontSize: 14,
    color: colors.brown900,
    paddingLeft: 18,
    marginBottom: 4,
  },
  input: {
    width: "100%",
    paddingHorizontal: 19,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: colors.brown300,
    borderRadius: 53,
    backgroundColor: colors.white400,
    fontFamily: fonts.primary,
    fontSize: 16,
    color: colors.brown900,
  },
  textarea: {
    borderRadius: 24,
    minHeight: 80,
    textAlignVertical: "top",
  },
  organicInputContainer: {
    position: "relative",
    width: "100%",
    aspectRatio: 333 / 52,
  },
  organicInput: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    backgroundColor: "transparent",
    fontFamily: fonts.primary,
    fontSize: 14,
    color: colors.brown900,
  },
  organicTextarea: {
    paddingVertical: 18,
    textAlignVertical: "top",
    aspectRatio: undefined,
  },
  error: {
    fontFamily: fonts.primary,
    fontSize: 12,
    color: colors.clay500,
    marginTop: -8,
    marginBottom: spacing.sm,
    paddingLeft: 19,
  },
});
