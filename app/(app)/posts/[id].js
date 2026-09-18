import { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../../../lib/stores/auth";
import PostCard from "../../../lib/components/PostCard";
import PostComments from "../../../lib/components/PostComments";
import FadeInScreen from "../../../lib/components/FadeInScreen";
import { DEFAULT_EMOJI_TONE } from "../../../lib/utils/emojiAssets";
import { API_URL } from "../../../lib/config";
import { colors, fonts, spacing } from "../../../lib/theme";
import ReactorsStrip from "../../../lib/components/ReactorStrip";

// Single-post version of the feed: same PostCard, same reactions/comments
// behavior, just for one post reached from a profile item or a
// post-related notification rather than the scrolling list. Fetches the
// post + author + branch directly via Supabase (same join pattern used
// elsewhere for one-off reads), and reactions via the same REST endpoint
// PostCard itself calls when adding a new one, so the shape matches
// exactly what PostCard already expects from the feed.
export default function PostDetailScreen() {
  const { id } = useLocalSearchParams();
  const { supabase, session } = useAuth();
  const [post, setPost] = useState(null);
  const [viewerProfile, setViewerProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const scrollRef = useRef(null);
  const commentsYRef = useRef(0);
  const [reactorDetails, setReactorDetails] = useState([]);
  const [canViewReactors, setCanViewReactors] = useState(false);

  const token = session?.access_token;

  const fetchPost = useCallback(async () => {
    if (!id || !session?.user?.id) return;
    setLoading(true);
    setNotFound(false);

    try {
      const [postResult, viewerResult, reactionsRes, reactorsRes] =
        await Promise.all([
          supabase.from("posts").select("*").eq("id", id).single(),
          supabase
            .from("profiles")
            .select("emoji_skin_tone, profile_img")
            .eq("id", session.user.id)
            .single(),
          fetch(`${API_URL}/api/posts/${id}/reactions`, {
            headers: { Authorization: `Bearer ${session.access_token}` },
          }).catch(() => null),
          fetch(`${API_URL}/api/posts/${id}/reactions?detailed=1`, {
            headers: { Authorization: `Bearer ${session.access_token}` },
          }).catch(() => null),
        ]);

      if (postResult.error || !postResult.data) {
        console.warn("Post lookup failed:", postResult.error);
        setNotFound(true);
        return;
      }

      const postData = postResult.data;

      // Separate queries for author + branch, rather than an embedded
      // PostgREST join — matches the pattern already proven to work
      // elsewhere in this app (ProfileScreenBody), and avoids depending
      // on a specific FK relationship shape being recognized correctly.
      const [authorResult, branchResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, username, display_name, profile_img")
          .eq("id", postData.user_id)
          .single(),
        postData.branch_id
          ? supabase
              .from("branches")
              .select("id, name, emoji, color")
              .eq("id", postData.branch_id)
              .single()
          : Promise.resolve({ data: null }),
      ]);

      let reactions = [];
      if (reactionsRes?.ok) {
        const body = await reactionsRes.json();
        reactions = body.reactions || [];
      }

      if (reactorsRes?.ok) {
        const body = await reactorsRes.json();
        setCanViewReactors(!!body.can_view_reactors);
        setReactorDetails(body.reactor_details || []);
      } else {
        setCanViewReactors(false);
        setReactorDetails([]);
      }

      setPost({
        ...postData,
        author: authorResult.data || null,
        branch: branchResult.data || null,
        is_owner: postData.user_id === session.user.id,
        reactions,
      });
      setViewerProfile(viewerResult.data || null);
    } catch (e) {
      console.warn("Failed to load post", e);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [id, session?.user?.id, session?.access_token, supabase]);

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  // The post is gone (archived/deleted) — nothing left to show here.
  const handleRemoved = () => {
    router.back();
  };

  // The comment input is the last thing on the page, so scrolling to the
  // end brings it into view. Delayed because KeyboardAvoidingView hasn't
  // shrunk the scroll area yet at the moment focus fires — scrolling
  // immediately would target the pre-keyboard layout and land short.
  const handleCommentInputFocus = () => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 250);
  };

  return (
    <FadeInScreen>
      <View style={styles.backRow}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={12}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.brown500} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.brown500} size="large" />
        </View>
      ) : notFound || !post ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Couldn't find that post.</Text>
        </View>
      ) : (
        // Unlike CommentsSheet — where the sheet is absolutely positioned at
        // bottom: 0 and KeyboardAvoidingView can't help — everything here is
        // in normal flow, so KAV works as intended: it shrinks this area by
        // the keyboard's height and the ScrollView adjusts around it.
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <PostCard
              post={post}
              token={token}
              viewerEmojiTone={
                viewerProfile?.emoji_skin_tone || DEFAULT_EMOJI_TONE
              }
              onCommentsPress={() =>
                scrollRef.current?.scrollTo({
                  y: commentsYRef.current,
                  animated: true,
                })
              }
              onRemoved={handleRemoved}
            />

            <View
              style={styles.commentsSection}
              onLayout={(e) => {
                commentsYRef.current = e.nativeEvent.layout.y;
              }}
            >
              {canViewReactors && reactorDetails.length > 0 && (
                <>
                  <ReactorsStrip
                    reactors={reactorDetails}
                    badgeBorderColor={colors.white200} // match this screen's background
                  />
                  <View style={styles.reactorsDivider} />
                </>
              )}

              <PostComments
                postId={post.id}
                token={token}
                viewerProfileImg={viewerProfile?.profile_img}
                onInputFocus={handleCommentInputFocus}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </FadeInScreen>
  );
}

const styles = StyleSheet.create({
  reactorsDivider: {
    height: 1,
    backgroundColor: colors.brown100,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  flex: {
    flex: 1,
  },
  backRow: {
    paddingTop: 56,
    paddingHorizontal: spacing.screenHorizontal,
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
  },
  emptyText: {
    fontFamily: fonts.primary,
    fontSize: 15,
    color: colors.brown300,
  },
  scrollContent: {
    paddingTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingBottom: 100,
    alignItems: "center",
  },
  commentsSection: {
    width: "100%",
    marginTop: spacing.sm,
  },
});
