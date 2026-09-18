import { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import { router } from "expo-router";
import { useAuth } from "../stores/auth";
import ProfileDetails from "./ProfileDetails";
import Tabs from "./Tabs";
import ProfileItem from "./ProfileItem";
import { colors, layout, spacing, typography } from "../theme";
import Loader from "./Loader";

const OWN_TAB_ITEMS = [
  { id: "profile", label: "Profile" },
  { id: "archive", label: "Archive" },
];

// Matches the categories posts are created with (see CreatePostScreen's
// POST_TABS) — "All" plus each post type, so the archive can be filtered
// down to just one kind of post.
const ARCHIVE_FILTERS = [
  { id: "all", label: "All" },
  { id: "text", label: "Text" },
  { id: "photo", label: "Photo" },
  { id: "listening", label: "Listening" },
  { id: "watching", label: "Watching" },
  { id: "reading", label: "Reading" },
];

const COLUMN_GAP = 12;
const SCREEN_PADDING = spacing.screenHorizontal * 2;
const COLUMN_WIDTH =
  (Dimensions.get("window").width - SCREEN_PADDING - COLUMN_GAP) / 2;

// How many items are rendered at once. Starts small so switching tabs is
// instant, then grows as the user scrolls near the bottom of what's
// currently rendered — see handleScroll below.
const REVEAL_BATCH_SIZE = 20;
// Start growing the rendered slice this many px before the user actually
// hits the bottom, so more content is ready before they get there.
const REVEAL_THRESHOLD_PX = 600;

function MasonryGrid({ items, onItemPress }) {
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

function FilterPills({ value, onChange }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterRow}
    >
      {ARCHIVE_FILTERS.map((filter) => {
        const active = value === filter.id;
        return (
          <TouchableOpacity
            key={filter.id}
            style={[styles.filterPill, active && styles.filterPillActive]}
            onPress={() => onChange(filter.id)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.filterPillText,
                active && styles.filterPillTextActive,
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// Renders either the logged-in user's own profile (username == null) or
// another user's profile (username set from the route param). Archive tab
// and its data are only ever fetched for the owner — a non-owner should
// never receive another user's archived posts over the wire, not just have
// them hidden in the UI. The real boundary is still Supabase RLS; this is
// the client-side half of that.
export default function ProfileScreenBody({ username, refreshKey }) {
  const { supabase, session } = useAuth();
  const [profile, setProfile] = useState(null);
  const [profileItems, setProfileItems] = useState([]);
  const [archivedItems, setArchivedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const [archiveFilter, setArchiveFilter] = useState("all");
  const [visibleCount, setVisibleCount] = useState(REVEAL_BATCH_SIZE);

  const isOwnProfile = username ? profile?.id === session?.user?.id : true;

  useEffect(() => {
    if (!session) return;
    setLoading(true);
    setNotFound(false);

    const fetchAll = async () => {
      const profileQuery = username
        ? supabase
            .from("profiles")
            .select("*")
            .eq("username", username)
            .single()
        : supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .single();

      const { data: profileData, error: profileError } = await profileQuery;

      if (profileError || !profileData) {
        setProfile(null);
        setNotFound(true);
        setLoading(false);
        return;
      }

      setProfile(profileData);
      const ownerView = profileData.id === session.user.id;

      const { data: posts } = await supabase
        .from("posts")
        .select("*")
        .eq("user_id", profileData.id)
        .eq("is_profile_item", true)
        .order("created_at", { ascending: false });

      if (posts) {
        setProfileItems(posts.filter((p) => !p.archived).slice(0, 10));
      }

      // Only ever ask for archived posts when looking at your own profile —
      // no reason to request another user's private archive at all.
      // Intentionally unfiltered on `archived`: the Archive tab is meant
      // to show a complete post history, including posts under 72 hours
      // old that have already been archived off the public feed.
      if (ownerView) {
        const { data: archivedPosts } = await supabase
          .from("posts")
          .select("*")
          .eq("user_id", profileData.id)
          .order("created_at", { ascending: false });

        setArchivedItems(archivedPosts || []);
      } else {
        setArchivedItems([]);
        setActiveTab("profile");
      }

      setLoading(false);
    };

    fetchAll();
  }, [session, username, refreshKey]);

  const filteredArchivedItems = useMemo(() => {
    if (archiveFilter === "all") return archivedItems;
    return archivedItems.filter((item) => item.category === archiveFilter);
  }, [archivedItems, archiveFilter]);

  const displayedItems =
    activeTab === "profile" ? profileItems : filteredArchivedItems;

  // Re-start the reveal from the top whenever the visible list changes
  // identity — switching tabs, changing the archive filter, or a fresh
  // fetch replacing the data.
  useEffect(() => {
    setVisibleCount(REVEAL_BATCH_SIZE);
  }, [activeTab, profileItems, filteredArchivedItems]);

  const handleItemPress = (item) => {
    router.push(`/(app)/posts/${item.id}`);
  };

  const visibleItems = displayedItems.slice(0, visibleCount);

  const handleScroll = useCallback(
    (e) => {
      if (visibleCount >= displayedItems.length) return;
      const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
      const distanceFromBottom =
        contentSize.height - (contentOffset.y + layoutMeasurement.height);
      if (distanceFromBottom < REVEAL_THRESHOLD_PX) {
        setVisibleCount((prev) =>
          Math.min(prev + REVEAL_BATCH_SIZE, displayedItems.length),
        );
      }
    },
    [visibleCount, displayedItems.length],
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Loader size={300} />
      </View>
    );
  }

  if (notFound) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.emptyText}>Couldn't find that profile.</Text>
      </View>
    );
  }

  const emptyText =
    activeTab === "profile"
      ? "No profile items yet."
      : archiveFilter === "all"
        ? "No archived posts yet."
        : `No archived ${ARCHIVE_FILTERS.find((f) => f.id === archiveFilter)?.label.toLowerCase()} posts yet.`;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      onScroll={handleScroll}
      scrollEventThrottle={200}
    >
      <ProfileDetails profile={profile} isOwnProfile={isOwnProfile} />

      {isOwnProfile && (
        <View style={styles.tabsContainer}>
          <Tabs
            items={OWN_TAB_ITEMS}
            value={activeTab}
            onChange={setActiveTab}
            center
          />
        </View>
      )}

      {isOwnProfile && activeTab === "archive" && (
        <FilterPills value={archiveFilter} onChange={setArchiveFilter} />
      )}

      {visibleItems.length > 0 ? (
        <MasonryGrid items={visibleItems} onItemPress={handleItemPress} />
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>{emptyText}</Text>
        </View>
      )}
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
  filterRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  filterPill: {
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: 20,
    backgroundColor: colors.brown100,
  },
  filterPillActive: {
    backgroundColor: colors.lime500,
  },
  filterPillText: {
    ...typography.hg14,
    color: colors.brown300,
  },
  filterPillTextActive: {
    color: colors.brown700,
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
});
