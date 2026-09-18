import { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../../lib/stores/auth";
import {
  colors,
  layout,
  buttons,
  inputs,
  spacing,
  typography,
} from "../../lib/theme";
import * as FileSystem from "expo-file-system/legacy";
import { API_URL } from "../../lib/config";

export default function ProfileSetupScreen() {
  const { session, supabase } = useAuth();
  const [form, setForm] = useState({
    username: "",
    displayName: "",
    bio: "",
  });
  const [profileImage, setProfileImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);
  // y-position of each input within the scroll content, captured via
  // onLayout so focusing one can scroll it into view above the keyboard
  // without hardcoding offsets that would drift if the layout changes.
  const fieldY = useRef({});

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // KeyboardAvoidingView resizes the scroll area once the keyboard opens,
  // but it doesn't know which input the person is actually looking at — it
  // can shrink the view right out from under the focused field. Scrolling
  // explicitly on focus is what actually brings that field into the
  // visible area. Delayed because the resize triggered by KAV hasn't
  // finished at the moment focus fires; scrolling immediately targets the
  // pre-keyboard layout and lands short.
  const scrollToField = (key) => {
    setTimeout(() => {
      const y = fieldY.current[key];
      if (y != null) {
        scrollRef.current?.scrollTo({ y: Math.max(0, y - 16), animated: true });
      }
    }, 250);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      return Alert.alert(
        "Permission needed",
        "Please allow access to your photo library.",
      );
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setProfileImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri) => {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const filename = uri.split("/").pop();
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : "image/jpeg";

    const response = await fetch(`${API_URL}/api/profile/image`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ base64, type, filename }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Upload failed");
    return data.profile_img;
  };

  const handleNext = async () => {
    const { username, displayName } = form;

    if (!username || !displayName) {
      return Alert.alert(
        "Missing fields",
        "Username and display name are required.",
      );
    }

    if (/[^a-zA-Z0-9_]/.test(username)) {
      return Alert.alert(
        "Invalid username",
        "Username can only contain letters, numbers, and underscores.",
      );
    }

    setLoading(true);
    try {
      let profileImgUrl = null;

      if (profileImage) {
        profileImgUrl = await uploadImage(profileImage);
      }

      const updates = {
        username: username.toLowerCase(),
        display_name: displayName,
        bio: form.bio || "",
      };

      if (profileImgUrl) {
        updates.profile_img = profileImgUrl;
      }

      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", session.user.id);

      if (error) return Alert.alert("Error", error.message);

      router.push("/onboarding/age-verify");
    } catch (e) {
      Alert.alert(
        "Error",
        e.message || "Could not save profile. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.wordmark}>loam</Text>
        <Text style={styles.title}>Set up your profile</Text>
        <Text style={styles.subtitle}>
          This is how other people will find and recognize you.
        </Text>

        <View style={styles.uploaderContainer}>
          <View style={styles.imagePreviewWrapper}>
            {profileImage ? (
              <Image
                source={{ uri: profileImage }}
                style={styles.profileImage}
              />
            ) : (
              <View style={styles.profileImagePlaceholder} />
            )}
          </View>
          <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
            <Text style={styles.uploadButtonText}>
              {profileImage ? "Edit Profile Image" : "Add Profile Image"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          <View
            onLayout={(e) => {
              fieldY.current.username = e.nativeEvent.layout.y;
            }}
          >
            <TextInput
              style={styles.input}
              placeholder="Username"
              placeholderTextColor={colors.brown200}
              value={form.username}
              onChangeText={(v) =>
                updateField(
                  "username",
                  v.toLowerCase().replace(/[^a-z0-9_]/g, ""),
                )
              }
              autoCapitalize="none"
              onFocus={() => scrollToField("username")}
            />
          </View>
          <View
            onLayout={(e) => {
              fieldY.current.displayName = e.nativeEvent.layout.y;
            }}
          >
            <TextInput
              style={styles.input}
              placeholder="Display name"
              placeholderTextColor={colors.brown200}
              value={form.displayName}
              onChangeText={(v) => updateField("displayName", v)}
              onFocus={() => scrollToField("displayName")}
            />
          </View>
          <View
            onLayout={(e) => {
              fieldY.current.bio = e.nativeEvent.layout.y;
            }}
          >
            <TextInput
              style={[styles.input, styles.bioInput]}
              placeholder="Bio (optional)"
              placeholderTextColor={colors.brown200}
              value={form.bio}
              onChangeText={(v) => updateField("bio", v)}
              onFocus={() => scrollToField("bio")}
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleNext}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "Saving..." : "Next"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scroll: layout.screen,
  container: layout.screenContent,
  wordmark: layout.wordmark,
  title: {
    ...typography.h1,
    color: colors.brown900,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.hg16,
    color: colors.brown500,
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  uploaderContainer: {
    alignItems: "center",
    marginBottom: spacing.md,
  },
  imagePreviewWrapper: {
    width: 98,
    height: 98,
    marginBottom: spacing.sm,
  },
  profileImage: {
    width: 98,
    height: 98,
    borderRadius: 49,
  },
  profileImagePlaceholder: {
    width: 98,
    height: 98,
    borderRadius: 49,
    backgroundColor: colors.brown100,
  },
  uploadButton: {
    ...buttons.lime,
    width: "auto",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  uploadButtonText: {
    ...buttons.limeText,
  },
  form: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  input: inputs.input,
  bioInput: inputs.textarea,
  button: buttons.primary,
  buttonDisabled: buttons.disabled,
  buttonText: buttons.primaryText,
});
