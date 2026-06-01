import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../../lib/stores/auth";

export default function ProfileScreen() {
  const { supabase } = useAuth();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/onboarding/auth");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <TouchableOpacity style={styles.button} onPress={handleLogout}>
        <Text style={styles.buttonText}>Log out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3EEE4",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#261700",
    marginBottom: 32,
  },
  button: {
    backgroundColor: "#462B01",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  buttonText: {
    color: "#F3EEE4",
    fontSize: 16,
    fontWeight: "700",
  },
});
