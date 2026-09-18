import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Modal,
} from "react-native";
import { router } from "expo-router";
import { useAuth } from "../../../lib/stores/auth";
import { API_URL } from "../../../lib/config";
import Input from "../../../lib/components/Input";
import Button from "../../../lib/components/Button";
import { colors, fonts, spacing } from "../../../lib/theme";
import { MaterialIcons } from "@expo/vector-icons";

export default function DeleteAccountScreen() {
  const { supabase, session } = useAuth();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = async () => {
    if (!password) {
      return Alert.alert("Required", "Please enter your password to confirm.");
    }

    setLoading(true);
    try {
      // Verify password first
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: session.user.email,
        password,
      });

      if (signInError) {
        setLoading(false);
        return Alert.alert(
          "Incorrect password",
          "Please check your password and try again.",
        );
      }

      // Call backend to delete account using admin API
      const res = await fetch(`${API_URL}/api/users/delete`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return Alert.alert("Error", data.error || "Could not delete account.");
      }

      await supabase.auth.signOut();
    } catch (e) {
      Alert.alert("Error", "Something went wrong.");
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <TouchableOpacity
        onPress={() => router.back()}
        style={styles.backButton}
        hitSlop={12}
      >
        <MaterialIcons name="arrow-back" size={24} color={colors.brown500} />
      </TouchableOpacity>

      <Text style={styles.title}>Delete Account</Text>
      <Text style={styles.subtitle}>
        This is permanent and cannot be undone. All your data will be removed.
      </Text>

      <Input
        value={password}
        onChangeText={setPassword}
        placeholder="Confirm your password"
        secureTextEntry
        autoCapitalize="none"
      />

      <Button
        variant="clay"
        onPress={() => {
          if (!password) {
            return Alert.alert("Required", "Please enter your password first.");
          }
          setShowConfirm(true);
        }}
        disabled={loading}
      >
        Delete Account
      </Button>

      {/* Confirm Modal */}
      <Modal visible={showConfirm} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Delete your account?</Text>
            <Text style={styles.modalMessage}>
              This is permanent and cannot be undone. All your data will be
              removed.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setShowConfirm(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirm}
                onPress={handleDelete}
                disabled={loading}
              >
                <Text style={styles.modalConfirmText}>
                  {loading ? "Deleting..." : "Yes, delete"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  container: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: 60,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  title: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 24,
    color: colors.clay500,
  },
  subtitle: {
    fontFamily: fonts.primary,
    fontSize: 16,
    color: colors.brown500,
    lineHeight: 22,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  modalCard: {
    backgroundColor: colors.brown50,
    borderRadius: 24,
    padding: spacing.xl,
    width: "100%",
    gap: spacing.md,
  },
  modalTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 20,
    color: colors.brown900,
  },
  modalMessage: {
    fontFamily: fonts.primary,
    fontSize: 15,
    color: colors.brown500,
    lineHeight: 22,
  },
  modalActions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  modalCancel: {
    flex: 1,
    borderWidth: 2,
    borderColor: colors.brown300,
    borderRadius: 44,
    paddingVertical: 14,
    alignItems: "center",
  },
  modalCancelText: {
    fontFamily: fonts.primaryBold,
    fontSize: 14,
    color: colors.brown500,
  },
  modalConfirm: {
    flex: 1,
    backgroundColor: colors.clay500,
    borderRadius: 44,
    paddingVertical: 14,
    alignItems: "center",
  },
  modalConfirmText: {
    fontFamily: fonts.primaryBold,
    fontSize: 14,
    color: colors.white200,
  },
});
