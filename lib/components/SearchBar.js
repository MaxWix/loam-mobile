import { useState } from "react";
import { View, TextInput, StyleSheet } from "react-native";
import { colors, fonts, spacing, radius } from "../theme";

export default function SearchBar({
  placeholder,
  onSearch,
  autoFocus = false,
}) {
  const [value, setValue] = useState("");

  const handleChange = (text) => {
    setValue(text);
    onSearch(text);
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={handleChange}
        placeholder={placeholder || "Search..."}
        placeholderTextColor={colors.brown200}
        autoFocus={autoFocus}
        autoCapitalize="none"
        returnKeyType="search"
        clearButtonMode="while-editing"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  input: {
    backgroundColor: colors.white400,
    borderWidth: 1,
    borderColor: colors.brown200,
    borderRadius: radius.full,
    paddingHorizontal: 19,
    paddingVertical: 14,
    fontFamily: fonts.primary,
    fontSize: 16,
    color: colors.brown900,
  },
});
