import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  FlatList,
  StyleSheet,
  Dimensions,
} from "react-native";
import { useAuth } from "../../lib/stores/auth";
import ProfileDetails from "../../lib/components/ProfileDetails";
import Button from "../../lib/components/Button";
import Tabs from "../../lib/components/Tabs";
import ProfileItem from "../../lib/components/ProfileItem";
import { colors, layout, spacing, typography } from "../../lib/theme";
import { useLocalSearchParams } from "expo-router";

const TAB_ITEMS = [
  { id: "profile", label: "Profile" },
  { id: "archive", label: "Archive" },
];

const COLUMN_GAP = 12;
const SCREEN_PADDING = spacing.screenHorizontal * 2;
const COLUMN_WIDTH =
  (Dimensions.get("window").width - SCREEN_PADDING - COLUMN_GAP) / 2;

function MasonryGrid({ items, onItemPress }) {
  // Split items into two columns
  const leftColumn = items.filter((_, i) => i % 2 === 0);
  const rightColumn = items.filter((_, i) => i % 2 !== 0);

  return (
    <View style={styles.masonry}>
      <View style={styles.masonryColumn}>
        {leftColumn.map((item) => (
          <ProfileItem
            key={item.id}
            item={item}
            onPress={() => onItemPress(item)}
          />
        ))}
      </View>
      <View style={styles.masonryColumn}>
        {rightColumn.map((item) => (
          <ProfileItem
            key={item.id}
            item={item}
            onPress={() => onItemPress(item)}
          />
        ))}
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const { supabase, session } = useAuth();
  const [profile, setProfile] = useState(null);
  const [profileItems, setProfileItems] = useState([]);
  const [archivedItems, setArchivedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("profile");
  const { refresh } = useLocalSearchParams();

  useEffect(() => {
    if (!session) return;

    const fetchAll = async () => {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      setProfile(profileData);

      const { data: posts } = await supabase
        .from("posts")
        .select("*")
        .eq("user_id", session.user.id)
        .eq("is_profile_item", true)
        .order("created_at", { ascending: false });

      if (posts) {
        setProfileItems(posts.filter((p) => !p.archived).slice(0, 10));
        setArchivedItems(posts.filter((p) => p.archived));
      }

      setLoading(false);
    };

    fetchAll();
  }, [session, refresh]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleItemPress = (item) => {
    // Navigate to post detail — to be built later
    console.log("pressed item", item.id);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const displayedItems = activeTab === "profile" ? profileItems : archivedItems;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <ProfileDetails profile={profile} isOwnProfile={true} />

      <View style={styles.tabsContainer}>
        <Tabs
          items={TAB_ITEMS}
          value={activeTab}
          onChange={setActiveTab}
          center
        />
      </View>

      {displayedItems.length > 0 ? (
        <MasonryGrid items={displayedItems} onItemPress={handleItemPress} />
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            {activeTab === "profile"
              ? "No profile items yet."
              : "No archived posts yet."}
          </Text>
        </View>
      )}

      <View style={styles.logoutSection}>
        <Button variant="ghost" onPress={handleLogout}>
          Log out
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: layout.screen,
  container: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: 60,
    paddingBottom: spacing.xxl,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brown50,
  },
  tabsContainer: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  masonry: {
    flexDirection: "row",
    gap: COLUMN_GAP,
  },
  masonryColumn: {
    width: COLUMN_WIDTH,
  },
  emptyState: {
    paddingTop: spacing.xl,
    alignItems: "center",
  },
  emptyText: {
    ...typography.hg14,
    color: colors.brown300,
  },
  logoutSection: {
    marginTop: spacing.xl,
  },
});
