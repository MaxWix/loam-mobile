import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
} from "react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { useAuth } from "../../../lib/stores/auth";
import Button from "../../../lib/components/Button";
import { colors, typography, spacing, fonts } from "../../../lib/theme";
import { API_URL } from "../../../lib/config";
import { MaterialIcons } from "@expo/vector-icons";

export default function EditProfileScreen() {
  const { supabase, session } = useAuth();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    display_name: "",
    username: "",
    bio: "",
  });
  const [profileImage, setProfileImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setProfile(data);
          setForm({
            display_name: data.display_name || "",
            username: data.username || "",
            bio: data.bio || "",
          });
        }
        setInitialLoading(false);
      });
  }, [session]);

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

  const handleSave = async () => {
    const { display_name, username } = form;

    if (!display_name || !username) {
      return Alert.alert("Missing fields", "Name and username are required.");
    }

    if (/[^a-zA-Z0-9_]/.test(username)) {
      return Alert.alert(
        "Invalid username",
        "Username can only contain letters, numbers, and underscores.",
      );
    }

    setLoading(true);
    try {
      const updates = {
        display_name,
        username: username.toLowerCase(),
        bio: form.bio || "",
      };

      if (profileImage) {
        const imageUrl = await uploadImage(profileImage);
        if (imageUrl) updates.profile_img = imageUrl;
      }

      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", session.user.id);

      if (error) return Alert.alert("Error", error.message);

      router.replace("/(app)/profile?refresh=" + Date.now());
    } catch (e) {
      Alert.alert("Error", e.message || "Could not save. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <View style={styles.loading}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const currentImage = profileImage || profile?.profile_img;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      {/* Header actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={12}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.brown500} />
        </TouchableOpacity>
        <Button
          size="small"
          variant="lime"
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? "Saving..." : "Save"}
        </Button>
      </View>

      {/* Profile image uploader */}
      <View style={styles.uploader}>
        <View style={styles.imageWrapper}>
          {currentImage ? (
            <Image source={{ uri: currentImage }} style={styles.profileImage} />
          ) : (
            <View style={styles.profileImagePlaceholder} />
          )}
        </View>
        <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
          <Text style={styles.uploadButtonText}>
            {currentImage ? "Edit Profile Image" : "Add Profile Image"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Edit fields */}
      <View style={styles.topField}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.nameInput}
          value={form.display_name}
          onChangeText={(v) =>
            setForm((prev) => ({ ...prev, display_name: v }))
          }
          placeholderTextColor={colors.brown200}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Username</Text>
        <TextInput
          style={styles.usernameInput}
          value={form.username}
          onChangeText={(v) =>
            setForm((prev) => ({
              ...prev,
              username: v.toLowerCase().replace(/[^a-z0-9_]/g, ""),
            }))
          }
          autoCapitalize="none"
          placeholderTextColor={colors.brown200}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Bio</Text>
        <TextInput
          style={styles.bioInput}
          value={form.bio}
          onChangeText={(v) => setForm((prev) => ({ ...prev, bio: v }))}
          multiline
          placeholderTextColor={colors.brown200}
          placeholder="Write something about yourself..."
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.brown50,
  },
  container: {
    paddingBottom: spacing.xxl,
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brown50,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingTop: 60,
    paddingBottom: spacing.md,
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  uploader: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  imageWrapper: {
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
    backgroundColor: colors.lime500,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 44,
  },
  uploadButtonText: {
    fontFamily: fonts.primaryBold,
    fontSize: 14,
    color: colors.brown500,
  },
  topField: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.green100,
  },
  field: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderColor: colors.green100,
  },
  label: {
    ...typography.hg12,
    color: colors.brown500,
    width: 60,
    flexShrink: 0,
    paddingTop: 4,
  },
  nameInput: {
    flex: 1,
    fontFamily: fonts.displayBold,
    fontSize: 24,
    color: colors.brown900,
    padding: 0,
  },
  usernameInput: {
    flex: 1,
    ...typography.hg16,
    color: colors.brown900,
    padding: 0,
  },
  bioInput: {
    flex: 1,
    ...typography.hg16,
    color: colors.brown900,
    padding: 0,
    minHeight: 60,
    textAlignVertical: "top",
  },
});
