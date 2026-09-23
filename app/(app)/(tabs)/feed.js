import { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../../../lib/stores/auth";
import { API_URL } from "../../../lib/config";
import PostCard from "../../../lib/components/PostCard";
import Loader from "../../../lib/components/Loader";
import { DEFAULT_EMOJI_TONE } from "../../../lib/utils/emojiAssets";
import CommentsSheet from "../../../lib/components/CommentsSheet";
import EmojiPreferenceModal from "../../../lib/components/EmojiPreferenceModal";
import BranchSelector from "../../../lib/components/BranchSelector";
import BrownLettermark from "../../../assets/BrownLettermark.svg";
import WhiteOnBrownLogo from "../../../assets/whiteOnBrownLogo.svg";
import { colors, fonts, spacing } from "../../../lib/theme";
import FadeInScreen from "../../../lib/components/FadeInScreen";

// Same 72h cutoff logic used on the notifications screen, so the badge
// and the list agree on what counts as "new."
// Same blob shape used as the web app's notifications-bell mask
const BELL_BLOB_PATH =
  "M38.0571 18.4656C38.0571 28.1925 28.0073 37 16.9143 37C5.82125 37 0 28.1925 0 18.4656C0 8.7388 10.0498 0 21.1429 0C32.2359 0 38.0571 8.7388 38.0571 18.4656Z";

export default function FeedScreen() {
  const { session, supabase } = useAuth();
  const [viewerProfile, setViewerProfile] = useState(null);
  const [showEmojiPrefModal, setShowEmojiPrefModal] = useState(false);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentsPostId, setCommentsPostId] = useState(null);
  const [hasNotifications, setHasNotifications] = useState(false);
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState(null);
  const token = session?.access_token;

  const selectedBranch =
    branches.find((b) => b.id === selectedBranchId) || null;

  // Own profile lookup (not the joined /api/branches-style endpoints) —
  // same direct-Supabase pattern used for plain profile reads elsewhere in
  // the app. Currently only need emoji_skin_tone + profile_img, but this is
  // the same viewerProfile state already wired into the header avatar prop.
  const fetchViewerProfile = useCallback(async () => {
    if (!session?.user?.id) return;
    try {
      const { data } = await supabase
        .from("profiles")
        .select("profile_img, emoji_skin_tone, music_service")
        .eq("id", session.user.id)
        .single();
      if (data) {
        setViewerProfile(data);
        // Same trigger as web's +layout.svelte: prompt once, the first time
        // we see a profile with no tone set. Saving in the modal always
        // writes a real tone, so this naturally won't fire again after.
        if (data.emoji_skin_tone == null) {
          setShowEmojiPrefModal(true);
        }
      }
    } catch (e) {
      console.warn("Failed to load viewer profile", e);
    }
  }, [session?.user?.id, supabase]);

  const fetchBranches = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/branches`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const base = (data.branches || []).map((b) => ({
          id: b.id,
          name: b.name || "Unnamed",
          emoji: b.emoji || "✨",
          color: b.color || "B6AFA3",
          memberIds: (b.members || []).map((m) => m.id),
          members: b.members || [],
        }));

        // Branch member rows carry no profile_img — the member id is a
        // profile id, so join images in one profiles query across every
        // branch, then hand the enriched members to the pill facepile.
        const ids = [
          ...new Set(base.flatMap((b) => b.members.map((m) => m.id))),
        ].filter(Boolean);
        if (ids.length > 0) {
          const { data: profs } = await supabase
            .from("profiles")
            .select("id, username, profile_img")
            .in("id", ids);
          const byId = Object.fromEntries((profs || []).map((p) => [p.id, p]));
          setBranches(
            base.map((b) => ({
              ...b,
              members: b.members.map((m) => ({ ...m, ...(byId[m.id] || {}) })),
            })),
          );
        } else {
          setBranches(base);
        }
      }
    } catch (e) {
      console.warn("Failed to load branches", e);
    }
  }, [token, supabase]);

  // Deletion works directly from the feed (unlike creation, which routes
  // to Connections where the full member-picker UI lives). Throws on
  // failure so BranchSelector knows not to remove the chip locally when
  // the server delete didn't actually go through.
  const deleteBranchById = async (id) => {
    const res = await fetch(`${API_URL}/api/branches/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to delete branch.");
    setBranches((prev) => prev.filter((b) => b.id !== id));
    if (selectedBranchId === id) setSelectedBranchId(null);
  };

  // Posts from your buds, narrowed to whoever's in the selected branch.
  // "all buds" (no branch selected) shows everything, same as today.
  const visiblePosts = selectedBranch
    ? posts.filter((p) => selectedBranch.memberIds.includes(p.author?.id))
    : posts;

  // Mirrors the web app's notifications.store.js refreshNotifications() —
  // calls the same server endpoint so read/dismissal state is tracked on
  // the backend, instead of being recomputed (and always-true) client-side.
  const checkNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/notifications/summary`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const body = await res.json();
      setHasNotifications(!!body.hasNotifications);
    } catch (e) {
      console.warn("refreshNotifications failed", e);
    }
  }, [token]);

  const fetchFeed = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/feed`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("Feed status:", res.status);
      if (res.ok) {
        const data = await res.json();
        console.log("Feed posts count:", data.posts?.length);
        setPosts(data.posts || []);
      } else {
        const text = await res.text();
        console.log("Feed error response:", text);
        setError("Failed to load feed.");
      }
    } catch (e) {
      console.log("Feed fetch error:", e.message);
      setError("Could not connect.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Re-check every time the feed regains focus — e.g. after visiting
  // notifications and marking things read, coming back to the app, or
  // (importantly) returning here after creating a post, so the new post
  // actually shows up without needing a manual pull-to-refresh.
  useFocusEffect(
    useCallback(() => {
      checkNotifications();
      fetchBranches();
      fetchViewerProfile();
      fetchFeed();
    }, [checkNotifications, fetchBranches, fetchViewerProfile, fetchFeed]),
  );

  const openComments = (id) => {
    setCommentsPostId(id);
    setCommentsOpen(true);
  };

  const closeComments = () => {
    setCommentsOpen(false);
  };

  const handlePostRemoved = (postId) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  // Blocking hides everything of theirs immediately; the server keeps
  // them out of future feed responses.
  const handleAuthorBlocked = (authorId) => {
    setPosts((prev) => prev.filter((p) => p.author?.id !== authorId));
  };

  return (
    <FadeInScreen>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <BrownLettermark width={80} height={28} />
          <View style={styles.bellWrapper}>
            <TouchableOpacity
              style={styles.bellButton}
              onPress={() => router.push("/(app)/notifications")}
            >
              <Svg
                style={StyleSheet.absoluteFill}
                viewBox="0 0 39 37"
                preserveAspectRatio="none"
              >
                <Path d={BELL_BLOB_PATH} fill={colors.lime300} />
              </Svg>
              <MaterialIcons
                name="notifications"
                size={20}
                color={colors.brown500}
              />
            </TouchableOpacity>
            {hasNotifications && <View style={styles.notificationBadge} />}
          </View>
        </View>

        {loading ? (
          <View style={styles.centered}>
            <Loader size={300} />
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={fetchFeed} style={styles.retryButton}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.feedContent}>
            <View style={styles.branchRow}>
              <BranchSelector
                branches={branches}
                selectedBranchId={selectedBranchId}
                onSelectBranch={setSelectedBranchId}
                onAddBranch={() => router.push("/(app)/connections?create=1")}
                onDeleteBranch={async (id) => {
                  try {
                    await deleteBranchById(id);
                  } catch (e) {
                    Alert.alert("Error", "Failed to delete branch.");
                    throw e;
                  }
                }}
                allBudsIcon={WhiteOnBrownLogo}
              />
            </View>
            {visiblePosts.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>Nothing here yet</Text>
                <Text style={styles.emptySubtitle}>
                  {selectedBranch
                    ? `No recent posts from ${selectedBranch.name}.`
                    : "Posts from your mutual connections will appear here within 72 hours."}
                </Text>
              </View>
            ) : (
              visiblePosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  token={token}
                  branches={branches}
                  viewerEmojiTone={
                    viewerProfile?.emoji_skin_tone || DEFAULT_EMOJI_TONE
                  }
                  viewerMusicService={viewerProfile?.music_service}
                  onCommentsPress={openComments}
                  onRemoved={handlePostRemoved}
                  onAuthorBlocked={handleAuthorBlocked}
                  onToneChange={(t) =>
                    setViewerProfile((prev) => ({
                      ...(prev || {}),
                      emoji_skin_tone: t,
                    }))
                  }
                />
              ))
            )}

            {visiblePosts.length > 0 && (
              <View style={styles.caughtUp}>
                <View style={styles.caughtUpBubble}>
                  <Text style={styles.caughtUpText}>all caught up!</Text>
                </View>
              </View>
            )}
          </ScrollView>
        )}

        <CommentsSheet
          postId={commentsPostId}
          token={token}
          visible={commentsOpen}
          onClose={closeComments}
          viewerProfileImg={viewerProfile?.profile_img}
          viewerId={session?.user?.id}
        />

        <EmojiPreferenceModal
          isOpen={showEmojiPrefModal}
          onSaved={(tone) => {
            setViewerProfile((prev) => ({
              ...(prev || {}),
              emoji_skin_tone: tone,
            }));
            setShowEmojiPrefModal(false);
          }}
        />
      </View>
    </FadeInScreen>
  );
}

const styles = StyleSheet.create({
  branchRow: {
    height: 108,
    alignSelf: "stretch",
    marginHorizontal: -spacing.xl, // match whatever feedContent uses
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 56,
    paddingHorizontal: spacing.screenHorizontal,
    paddingBottom: spacing.md,
    backgroundColor: colors.white200,
    borderBottomWidth: 1,
    borderBottomColor: colors.brown100,
  },
  bellWrapper: {
    position: "relative",
  },
  bellButton: {
    width: 39,
    height: 37,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "visible",
  },
  notificationBadge: {
    position: "absolute",
    top: -3,
    right: -3,
    width: 16,
    height: 16,
    borderRadius: 20,
    backgroundColor: "#D32F2F",
    borderWidth: 2,
    borderColor: colors.white200,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  errorText: {
    fontFamily: fonts.primary,
    fontSize: 15,
    color: colors.brown300,
  },
  retryButton: {
    backgroundColor: colors.brown500,
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
    borderRadius: 44,
  },
  retryText: {
    fontFamily: fonts.primaryBold,
    fontSize: 14,
    color: colors.white200,
  },
  feedContent: {
    paddingTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingBottom: 100,
    alignItems: "center",
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 80,
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  emptyTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 20,
    color: colors.brown500,
  },
  emptySubtitle: {
    fontFamily: fonts.primary,
    fontSize: 15,
    color: colors.brown300,
    textAlign: "center",
    lineHeight: 22,
  },
  caughtUp: {
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
    alignItems: "center",
  },
  caughtUpBubble: {
    backgroundColor: colors.lime300,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 44,
  },
  caughtUpText: {
    fontFamily: fonts.primaryBold,
    fontSize: 13,
    color: colors.green500,
  },
});
