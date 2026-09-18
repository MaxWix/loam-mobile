import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { colors, fonts, spacing, radius } from "../theme";
import { getImage, getSubtitle, getTitle } from "../utils/mediaUtils";

export default function ResultItem({ item, category, onPress }) {
  const imageUrl = getImage(item, category);
  const subtitle = getSubtitle(item, category);
  const title = getTitle(item);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={styles.image}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.imagePlaceholder} />
      )}
      <View style={styles.text}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.brown100,
  },
  image: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: colors.brown100,
  },
  imagePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: colors.brown100,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: fonts.primaryBold,
    fontSize: 14,
    color: colors.brown700,
  },
  subtitle: {
    fontFamily: fonts.primary,
    fontSize: 12,
    color: colors.brown300,
  },
});
