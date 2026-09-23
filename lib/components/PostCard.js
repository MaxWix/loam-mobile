import { useState, useMemo } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Linking,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { router } from "expo-router";
import ProfileImage from "./ProfileImage";
import Input from "./Input";
import EmojiPickerSheet from "./EmojiPickerSheet";
import CommentTicker from "./CommentTicker";
import PostActionSheet from "./PostActionSheet";
import ReportSheet from "./ReportSheet";
import BranchMembersSheet from "./BranchMembersSheet";
import { useAuth } from "../stores/auth";
import { blockUser } from "../utils/moderation";
import { getColorHex, getOutlineHex } from "./BranchButton";
import { colors, fonts, spacing, radius } from "../theme";
import { timeAgo } from "../utils/timeAgo";
import { API_URL } from "../config";
import Reactions from "./Reactions";
import { buildReactionValue, DEFAULT_EMOJI_TONE } from "../utils/emojiAssets";
import {
  buildMusicLinkParams,
  listenLabel,
  DEFAULT_MUSIC_SERVICE,
} from "../utils/musicLinks";
import AddReactionIcon from "../../assets/AddReaction.svg";
import ZoomableImage from "./ZoomableImage";

// Category SVG icons — ported from PostCard.svelte
const READING_PATH =
  "M18.0571 32.0103C16.7438 30.9706 15.3212 30.1635 13.789 29.589C12.2569 29.0144 10.6701 28.7272 9.02853 28.7272C7.87945 28.7272 6.75088 28.8776 5.64283 29.1786C4.53479 29.4795 3.47462 29.9036 2.46233 30.4508C1.88778 30.7517 1.33376 30.7381 0.800257 30.4097C0.266752 30.0814 0 29.6027 0 28.9734V9.19269C0 8.89174 0.0752378 8.60447 0.225713 8.33088C0.376189 8.05728 0.601902 7.85209 0.902854 7.71529C2.16138 7.05867 3.47462 6.56621 4.84258 6.2379C6.21054 5.90959 7.60586 5.74543 9.02853 5.74543C10.6154 5.74543 12.168 5.95063 13.6864 6.36101C15.2049 6.7714 16.6618 7.38698 18.0571 8.20776V28.0705C19.4524 27.195 20.9161 26.5384 22.4482 26.1007C23.9803 25.6629 25.5261 25.4441 27.0856 25.4441C28.0705 25.4441 29.035 25.5261 29.9788 25.6903C30.9227 25.8544 31.8735 26.1007 32.831 26.429V6.73036C33.2414 6.86716 33.645 7.01079 34.0417 7.16127C34.4384 7.31175 34.8283 7.49642 35.2113 7.71529C35.5122 7.85209 35.738 8.05728 35.8884 8.33088C36.0389 8.60447 36.1141 8.89174 36.1141 9.19269V28.9734C36.1141 29.6027 35.8474 30.0814 35.3139 30.4097C34.7804 30.7381 34.2264 30.7517 33.6518 30.4508C32.6395 29.9036 31.5794 29.4795 30.4713 29.1786C29.3633 28.8776 28.2347 28.7272 27.0856 28.7272C25.4441 28.7272 23.8572 29.0144 22.3251 29.589C20.793 30.1635 19.3703 30.9706 18.0571 32.0103Z";
const LISTENING_PATH =
  "M6.42697 28.2787C4.65955 28.2787 3.14654 27.6633 1.88792 26.4327C0.629307 25.202 0 23.7226 0 21.9945C0 20.2664 0.629307 18.787 1.88792 17.5563C3.14654 16.3257 4.65955 15.7104 6.42697 15.7104C7.04288 15.7104 7.61194 15.7824 8.13413 15.9264C8.65632 16.0704 9.15843 16.2864 9.64045 16.5744V3.14207L28.9213 0V18.8524C28.9213 20.5806 28.292 22.06 27.0334 23.2906C25.7748 24.5213 24.2618 25.1366 22.4944 25.1366C20.727 25.1366 19.2139 24.5213 17.9553 23.2906C16.6967 22.06 16.0674 20.5806 16.0674 18.8524C16.0674 17.1243 16.6967 15.6449 17.9553 14.4143C19.2139 13.1836 20.727 12.5683 22.4944 12.5683C23.1103 12.5683 23.6794 12.6403 24.2015 12.7843C24.7237 12.9283 25.2258 13.1443 25.7079 13.4324V6.95184L12.8539 9.42622V21.9945C12.8539 23.7226 12.2246 25.202 10.966 26.4327C9.7074 27.6633 8.19438 28.2787 6.42697 28.2787Z";
const WATCHING_PATH =
  "M3.58333 0L7.16667 7.16667H12.5417L8.95833 0H12.5417L16.125 7.16667H21.5L17.9167 0H21.5L25.0833 7.16667H30.4583L26.875 0H32.25C33.2354 0 34.079 0.350868 34.7807 1.0526C35.4825 1.75434 35.8333 2.59792 35.8333 3.58333V25.0833C35.8333 26.0688 35.4825 26.9123 34.7807 27.6141C34.079 28.3158 33.2354 28.6667 32.25 28.6667H3.58333C2.59792 28.6667 1.75434 28.3158 1.0526 27.6141C0.350868 26.9123 0 26.0688 0 25.0833V3.58333C0 2.59792 0.350868 1.75434 1.0526 1.0526C1.75434 0.350868 2.59792 0 3.58333 0ZM3.58333 10.75V25.0833H32.25V10.75H3.58333Z";
const CARD_BLOB_PATH =
  "M8.89625 347.555C-8.76673 336.514 4.74257 81.5901 8.16367 21.794C8.5866 14.4018 13.9813 8.49062 21.3318 7.59935C53.6813 3.67685 150.966 -4.93056 334.343 3.73077C373.519 5.58116 359.107 276.701 355.063 342.04C354.563 350.115 348.148 356.384 340.066 356.742C279.454 359.425 42.3656 368.476 8.89625 347.555Z";

const BG_COLORS = {
  F5F5E1: colors.lime300,
  F5EDEB: colors.clay100,
  ECEDE2: colors.green100,
  F3EEE4: colors.brown100,
};

const BADGE_COLORS = {
  F5F5E1: { bg: colors.lime500, fg: colors.lime700 },
  F5EDEB: { bg: colors.clay300, fg: colors.clay500 },
  ECEDE2: { bg: colors.green300, fg: colors.green500 },
  F3EEE4: { bg: colors.brown300, fg: colors.brown500 },
};

const BUTTON_COLORS = {
  F5F5E1: colors.lime700,
  F5EDEB: colors.clay500,
  ECEDE2: colors.green00,
  F3EEE4: colors.brown300,
};

function getDisplaySubtitle(subtitle, category) {
  if (!subtitle) return "";
  if (category === "watching") {
    const match = subtitle.match(/(19|20)\d{2}/);
    return match ? match[0] : subtitle;
  }
  if (category === "listening") {
    const parts = subtitle.split("•");
    return (parts.length > 1 ? parts.slice(1).join("•") : subtitle).trim();
  }
  return subtitle;
}

function isPlaceholderImage(url) {
  if (!url) return true;
  if (url.includes("via.placeholder.com/1000x1000?text=No+Image")) return true;
  if (url.includes("placehold.co/100x150")) return true;
  return false;
}

export default function PostCard({
  post,
  onCommentsPress,
  onRemoved,
  onAuthorBlocked,
  token,
  branches,
  viewerEmojiTone = DEFAULT_EMOJI_TONE,
  viewerMusicService = DEFAULT_MUSIC_SERVICE,
  onToneChange,
}) {
  const { supabase, session } = useAuth();
  const [reactions, setReactions] = useState(post.reactions || []);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showReportSheet, setShowReportSheet] = useState(false);
  const [showBranchMembers, setShowBranchMembers] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [musicLinkLoading, setMusicLinkLoading] = useState(false);
  // Tracks the emoji value that was just added so <Reactions> can pop the
  // matching bubble in. Cleared shortly after so re-adding the same emoji
  // later retriggers the animation instead of being seen as "unchanged."
  const [justAddedEmoji, setJustAddedEmoji] = useState(null);
  // Unlike justAddedEmoji, this never auto-clears — it's not for triggering
  // the pop animation, it's for keeping whichever reaction the viewer most
  // recently touched leftmost among their own reactions. Needed because
  // the post-reaction server refresh (see addReaction below) can return
  // groups in a different order than the optimistic update used, which
  // would otherwise silently undo the "newest mine reaction is leftmost"
  // positioning the moment that response lands.
  const [lastMineEmoji, setLastMineEmoji] = useState(null);

  // `post` is a prop — it can't be mutated directly, so an edited
  // title/caption needs its own local state to display immediately
  // after a save, same pattern as `reactions` above.
  const [localTitle, setLocalTitle] = useState(post.title || "");
  const [localSubtitle, setLocalSubtitle] = useState(post.subtitle || "");
  const [localCaption, setLocalCaption] = useState(post.caption || "");
  // Same "post is a prop, needs local state to reflect a save immediately"
  // pattern as the fields above — whether this post also shows on the
  // owner's profile grid.
  const [localIsProfileItem, setLocalIsProfileItem] = useState(
    !!post.is_profile_item,
  );
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(localTitle);
  const [editCaption, setEditCaption] = useState(localCaption);
  const [editSaving, setEditSaving] = useState(false);

  const color = (post.color || "F3EEE4").replace(/^#/, "").toUpperCase();
  const bgColor = BG_COLORS[color] || "#F3EEE4";
  const badgeColors = BADGE_COLORS[color] || BADGE_COLORS["F3EEE4"];
  const buttonBg = BUTTON_COLORS[color] || BUTTON_COLORS["F3EEE4"];
  const category = (post.category || "").toLowerCase();
  const hasMedia = !isPlaceholderImage(post.media_url);
  const displaySubtitle = getDisplaySubtitle(localSubtitle, category);

  // Media posts (reading/listening/watching) have their title pulled from
  // an external source (Spotify, TMDB, a book search) at creation time —
  // it isn't something a person types, so it isn't something they should
  // be able to edit afterward. Only the caption, which is always theirs,
  // stays editable for those. Photo and text posts have no external
  // source for the title, so both fields are editable.
  const isMediaCategory =
    category === "reading" ||
    category === "listening" ||
    category === "watching";

  // Show the listen chip on any listening post we can build a link for:
  // new posts have external_id, old ones at least have a title to search.
  const showListenChip =
    category === "listening" && !!(post.external_id || localTitle);

  // Support either shape the feed API might hand back: a fully joined
  // `branch` object on the post, or just a bare `branch_id` that we
  // resolve against the branches list already loaded on the feed screen.
  const postBranch =
    post.branch || branches?.find((b) => b.id === post.branch_id) || null;

  const authHeader = { Authorization: `Bearer ${token}` };

  const buttonFlips = useMemo(
    () => [
      {
        scaleX: Math.random() > 0.5 ? -1 : 1,
        scaleY: Math.random() > 0.5 ? -1 : 1,
      },
    ],
    [],
  );

  const openMusicLink = async () => {
    if (musicLinkLoading) return;
    const service = viewerMusicService || DEFAULT_MUSIC_SERVICE;

    // Fast path: viewer wants Spotify and the post already stores its URL.
    // Linking hands https://open.spotify.com/... to the Spotify app when
    // it's installed, otherwise the browser.
    if (service === "spotify" && post.external_url) {
      Linking.openURL(post.external_url).catch(() => {});
      return;
    }

    setMusicLinkLoading(true);
    try {
      // Use localTitle/localSubtitle so an edited post resolves with the
      // text currently on screen, not the stale prop.
      const params = buildMusicLinkParams(
        { ...post, title: localTitle, subtitle: localSubtitle },
        service,
      );
      const res = await fetch(`${API_URL}/api/music-link?${params}`, {
        headers: authHeader,
      });
      if (!res.ok) throw new Error(`music-link ${res.status}`);
      const data = await res.json();
      if (data.url) await Linking.openURL(data.url);
    } catch (e) {
      console.error("Failed to resolve music link", e);
      Alert.alert("Hmm", "Couldn't open that right now. Try again in a bit.");
    } finally {
      setMusicLinkLoading(false);
    }
  };

  const addReaction = async (emojiKey) => {
    setShowEmojiPicker(false);
    const emoji = buildReactionValue(emojiKey, viewerEmojiTone);

    // Figure out add-vs-remove against current state *before* the optimistic
    // update, so the pop animation only fires when a reaction is actually
    // being added (not when tapping an existing one off).
    const existingBefore = reactions.find((r) => r.emoji === emoji);
    const isAdding = !existingBefore || !existingBefore.reacted_by_viewer;

    // Optimistic update
    setReactions((prev) => {
      const existing = prev.find((r) => r.emoji === emoji);
      if (existing) {
        return prev
          .map((r) =>
            r.emoji === emoji
              ? {
                  ...r,
                  count: r.count + (r.reacted_by_viewer ? -1 : 1),
                  reacted_by_viewer: !r.reacted_by_viewer,
                }
              : r,
          )
          .filter((r) => r.count > 0);
      }
      return [...prev, { emoji, count: 1, reacted_by_viewer: true }];
    });

    if (isAdding) {
      setJustAddedEmoji(emoji);
      setLastMineEmoji(emoji);
      setTimeout(() => {
        setJustAddedEmoji((cur) => (cur === emoji ? null : cur));
      }, 500);
    }

    try {
      await fetch(`${API_URL}/api/posts/${post.id}/reactions`, {
        method: "POST",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      });
      // Refresh from server
      const res = await fetch(`${API_URL}/api/posts/${post.id}/reactions`, {
        headers: authHeader,
      });
      if (res.ok) {
        const data = await res.json();
        setReactions(data.reactions || []);
      }
    } catch (e) {
      console.error("Reaction error", e);
    }
  };

  const handleBlockAuthor = () => {
    setShowActionMenu(false);
    const name = post.author?.username || "this user";
    Alert.alert(
      `Block @${name}?`,
      "You won't see each other's posts or comments, and they won't be able to send you requests. You can unblock them in Settings.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block",
          style: "destructive",
          onPress: async () => {
            try {
              await blockUser(supabase, session.user.id, post.author.id);
              onAuthorBlocked?.(post.author.id);
            } catch (e) {
              console.warn("Block failed", e);
              Alert.alert("Error", "Couldn't block right now. Try again.");
            }
          },
        },
      ],
    );
  };

  const handleEditStart = () => {
    setShowActionMenu(false);
    setEditTitle(localTitle);
    setEditCaption(localCaption);
    setIsEditing(true);
  };

  const handleEditCancel = () => {
    setIsEditing(false);
  };

  const handleEditSave = async () => {
    // Title is only part of the edit for non-media posts — media titles
    // come from the external source and were never in this form to begin
    // with, so there's nothing to validate or send for them.
    let trimmedTitle = localTitle;
    if (!isMediaCategory) {
      trimmedTitle = editTitle.trim();
      if (!trimmedTitle) {
        return Alert.alert("Required", "Please write a title.");
      }
    }
    const trimmedCaption = editCaption.trim();

    setEditSaving(true);
    try {
      const body = { caption: trimmedCaption };
      if (!isMediaCategory) body.title = trimmedTitle;

      const res = await fetch(`${API_URL}/api/posts/${post.id}`, {
        method: "PATCH",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        if (!isMediaCategory) setLocalTitle(trimmedTitle);
        setLocalCaption(trimmedCaption);
        setIsEditing(false);
      } else {
        const data = await res.json().catch(() => ({}));
        Alert.alert("Error", data.error || "Could not update post.");
      }
    } catch (e) {
      Alert.alert("Error", "Something went wrong.");
    } finally {
      setEditSaving(false);
    }
  };

  const handleToggleProfileItem = async () => {
    setShowActionMenu(false);
    const nextValue = !localIsProfileItem;
    setActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/posts/${post.id}`, {
        method: "PATCH",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ is_profile_item: nextValue }),
      });
      if (res.ok) {
        setLocalIsProfileItem(nextValue);
      } else {
        const data = await res.json().catch(() => ({}));
        Alert.alert("Error", data.error || "Could not update this post.");
      }
    } catch (e) {
      Alert.alert("Error", "Something went wrong.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleArchive = async () => {
    setShowActionMenu(false);
    Alert.alert("Archive post?", "Your post will move to your archive.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Archive",
        onPress: async () => {
          setActionLoading(true);
          try {
            const res = await fetch(`${API_URL}/api/posts/${post.id}`, {
              method: "PATCH",
              headers: { ...authHeader, "Content-Type": "application/json" },
              body: JSON.stringify({ archived: true }),
            });
            if (res.ok) onRemoved?.(post.id, "archived");
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const handleDelete = async () => {
    setShowActionMenu(false);
    Alert.alert("Delete post?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setActionLoading(true);
          try {
            const res = await fetch(`${API_URL}/api/posts/${post.id}`, {
              method: "DELETE",
              headers: authHeader,
            });
            if (res.ok) onRemoved?.(post.id, "deleted");
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardBody}>
        <Svg
          style={StyleSheet.absoluteFill}
          viewBox="0 0 361 361"
          preserveAspectRatio="xMidYMid slice"
          pointerEvents="none"
        >
          <Path d={CARD_BLOB_PATH} fill={bgColor} />
        </Svg>
        {/* Header — one tight row: author + time on the left, branch
            lockup and quiet ••• on the right. Username and branch name
            both truncate; the branch gives way first. */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.authorLink}
            disabled={post.is_owner || !post.author?.username}
            onPress={() => router.push(`/(app)/user/${post.author.username}`)}
          >
            <ProfileImage src={post.author?.profile_img} variant="small" />
            <Text style={styles.username} numberOfLines={1}>
              {post.author?.username || "Anonymous"}
            </Text>
            <Text style={styles.timestamp}>{timeAgo(post.created_at)}</Text>
          </TouchableOpacity>

          {postBranch && (
            <TouchableOpacity
              style={styles.branchRow}
              onPress={() => setShowBranchMembers(true)}
              activeOpacity={0.6}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              accessibilityRole="button"
              accessibilityLabel={`See who's in ${postBranch.name}`}
            >
              {/* <Text style={styles.branchTagEmoji}>{postBranch.emoji}</Text> */}
              {/* <Text
                style={[
                  styles.branchTagText,
                  { color: getOutlineHex(postBranch.color) },
                ]}
                numberOfLines={1}
              >
                {postBranch.name}
              </Text> */}
              {(postBranch.members || []).length > 0 && (
                <View style={styles.branchFaces}>
                  {postBranch.members.slice(0, 3).map((m, i) => (
                    <View
                      key={m.id || i}
                      style={i > 0 ? styles.branchFaceOverlap : null}
                    >
                      <ProfileImage src={m.profile_img} variant="tiny" />
                    </View>
                  ))}
                </View>
              )}
              <Text
                style={[
                  styles.branchChevron,
                  { color: getOutlineHex(postBranch.color) },
                ]}
              >
                ›
              </Text>
            </TouchableOpacity>
          )}

          {!isEditing && (
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => setShowActionMenu((v) => !v)}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
            >
              <Text style={[styles.menuDots, { color: buttonBg }]}>•••</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Media */}
        {hasMedia && (
          <View style={styles.mediaWrapper}>
            <View style={styles.mediaClip}>
              <ZoomableImage
                source={{ uri: post.media_url }}
                style={styles.media}
                resizeMode="cover"
              />
            </View>
            {/* Category badge */}
            {isMediaCategory && (
              <View
                style={[
                  styles.categoryBadge,
                  { backgroundColor: badgeColors.bg },
                ]}
              >
                <Svg
                  width={16}
                  height={16}
                  viewBox={
                    category === "reading"
                      ? "0 0 37 33"
                      : category === "listening"
                        ? "0 0 29 29"
                        : "0 0 36 29"
                  }
                >
                  <Path
                    d={
                      category === "reading"
                        ? READING_PATH
                        : category === "listening"
                          ? LISTENING_PATH
                          : WATCHING_PATH
                    }
                    fill={badgeColors.fg}
                  />
                </Svg>
              </View>
            )}
            {/* Reactions on media */}
            {reactions.length > 0 && (
              <View style={styles.reactionsOnMedia}>
                <Reactions
                  reactions={reactions}
                  color={color}
                  justAddedEmoji={justAddedEmoji}
                  lastMineEmoji={lastMineEmoji}
                />
              </View>
            )}
          </View>
        )}

        {/* Content */}
        <View style={styles.content}>
          {isEditing ? (
            <View style={styles.editFields}>
              {/* Title only editable for non-media posts — a media post's
                  title comes from the external source it was created
                  from, not something typed here. */}
              {!isMediaCategory && (
                <Input
                  value={editTitle}
                  onChangeText={setEditTitle}
                  placeholder="Write a title"
                  organic
                  autoFocus
                />
              )}
              <Input
                value={editCaption}
                onChangeText={setEditCaption}
                placeholder="Write a caption"
                organic
                autoFocus={isMediaCategory}
              />
              <View style={styles.editActions}>
                <TouchableOpacity
                  style={[styles.editBtn, styles.editBtnCancel]}
                  onPress={handleEditCancel}
                  disabled={editSaving}
                >
                  <Text style={styles.editBtnCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.editBtn, styles.editBtnSave]}
                  onPress={handleEditSave}
                  disabled={editSaving}
                >
                  <Text style={styles.editBtnSaveText}>
                    {editSaving ? "Saving..." : "Save"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              {localTitle ? (
                <Text style={styles.title}>{localTitle}</Text>
              ) : null}
              {displaySubtitle ? (
                <Text style={styles.subtitle}>{displaySubtitle}</Text>
              ) : null}
              {localCaption ? (
                <Text style={styles.caption}>{localCaption}</Text>
              ) : null}
              {showListenChip && (
                <TouchableOpacity
                  style={[styles.listenChip, { backgroundColor: buttonBg }]}
                  onPress={openMusicLink}
                  disabled={musicLinkLoading}
                  activeOpacity={0.8}
                >
                  <Svg width={12} height={12} viewBox="0 0 29 29">
                    <Path d={LISTENING_PATH} fill={colors.white200} />
                  </Svg>
                  <Text style={styles.listenChipText}>
                    {musicLinkLoading
                      ? "Opening…"
                      : listenLabel(viewerMusicService)}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        {/* Reactions on text-only posts */}
        {!hasMedia && reactions.length > 0 && (
          <Reactions
            reactions={reactions}
            color={color}
            justAddedEmoji={justAddedEmoji}
            lastMineEmoji={lastMineEmoji}
          />
        )}

        {/* Footer */}
        <View style={styles.footer}>
          {/* Emoji picker trigger — opens EmojiPickerSheet, a bottom
                sheet modal (see below), instead of an anchored popover.
                Always slides up from the screen's own bottom, so there's
                no longer any "not enough room above the card" edge case
                to handle regardless of where this button sits on screen. */}
          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: buttonBg },
              {
                transform: [
                  { scaleX: buttonFlips[0].scaleX },
                  { scaleY: buttonFlips[0].scaleY },
                ],
              },
            ]}
            onPress={() => setShowEmojiPicker(true)}
          >
            <AddReactionIcon
              width={22}
              height={22}
              style={{
                transform: [
                  { scaleX: buttonFlips[0].scaleX },
                  { scaleY: buttonFlips[0].scaleY },
                ],
              }}
            />
          </TouchableOpacity>

          {/* Comment ticker — replaces what used to be a comment button.
              Cycles through recent comments (bundled with the feed
              response, not fetched per card) and opens the sheet on tap.
              Falls back to an "Add a comment" prompt when there are none,
              so the affordance is never missing. */}
          <CommentTicker
            comments={post.comment_preview || []}
            count={post.comment_count || 0}
            onPress={() => onCommentsPress?.(post.id)}
            textColor={colors.white200}
            backgroundColor={buttonBg}
            seed={post.id}
          />
        </View>
      </View>

      {/* Action menu — a reusable bottom sheet (swipe down, tap the
          backdrop, or Cancel to dismiss). Actions are passed as data so
          the sheet itself stays generic and reusable. */}
      <PostActionSheet
        visible={showActionMenu}
        onClose={() => setShowActionMenu(false)}
        actions={
          post.is_owner
            ? [
                {
                  label: "Edit",
                  onPress: handleEditStart,
                  disabled: actionLoading,
                },
                {
                  label: localIsProfileItem
                    ? "Remove from Profile"
                    : "Save to Profile",
                  onPress: handleToggleProfileItem,
                  disabled: actionLoading,
                },
                {
                  label: "Archive",
                  onPress: handleArchive,
                  disabled: actionLoading,
                },
                {
                  label: "Delete",
                  onPress: handleDelete,
                  danger: true,
                  disabled: actionLoading,
                },
              ]
            : [
                {
                  label: "Report post",
                  onPress: () => {
                    setShowActionMenu(false);
                    // Sequential Modals: let the menu's close animation
                    // finish before mounting the next Modal — overlapping
                    // them glitches on iOS.
                    setTimeout(() => setShowReportSheet(true), 320);
                  },
                },
                {
                  label: `Block @${post.author?.username || "user"}`,
                  danger: true,
                  onPress: handleBlockAuthor,
                },
              ]
        }
      />

      <ReportSheet
        visible={showReportSheet}
        onClose={() => setShowReportSheet(false)}
        targetType="post"
        targetId={post.id}
      />

      {/* Branch members — opened by tapping the branch pill above. A
          branch can include people the viewer hasn't connected to yet
          (it's the owner's grouping of their own connections), so each
          row offers a bud request. */}
      {postBranch && (
        <BranchMembersSheet
          visible={showBranchMembers}
          onClose={() => setShowBranchMembers(false)}
          branch={postBranch}
          token={token}
        />
      )}

      <EmojiPickerSheet
        visible={showEmojiPicker}
        onClose={() => setShowEmojiPicker(false)}
        onSelect={addReaction}
        viewerEmojiTone={viewerEmojiTone}
        onToneChange={onToneChange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
    marginBottom: spacing.md,
    position: "relative",
  },
  cardBody: {
    padding: spacing.lg,
    position: "relative",
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  authorLink: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  branchRow: {
    flexShrink: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  branchTagEmoji: {
    fontSize: 12,
  },
  branchTagText: {
    fontFamily: fonts.primaryBold,
    fontSize: 12,
    flexShrink: 1,
  },
  branchFaces: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 2,
  },
  branchFaceOverlap: {
    marginLeft: -8,
  },
  branchChevron: {
    fontFamily: fonts.primaryBold,
    fontSize: 14,
    marginTop: -1,
  },
  username: {
    fontFamily: fonts.displayBold,
    fontSize: 13,
    color: colors.brown500,
    flexShrink: 1,
  },
  menuButton: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  menuDots: {
    fontSize: 13,
    letterSpacing: 1,
  },
  mediaWrapper: {
    borderRadius: 8,
    overflow: "visible",
    marginBottom: spacing.md,
    position: "relative",
  },
  mediaClip: {
    borderRadius: 8,
    overflow: "hidden",
  },
  media: {
    width: "100%",
    aspectRatio: 1,
  },
  reactionsOnMedia: {
    position: "absolute",
    bottom: -18, // half of the 36px circle height
    left: 0,
  },
  categoryBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  content: {
    marginBottom: spacing.md,
    gap: 4,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 16,
    color: colors.brown500,
  },
  subtitle: {
    fontFamily: fonts.primary,
    fontSize: 13,
    color: colors.brown500,
  },
  caption: {
    fontFamily: fonts.primary,
    fontSize: 13,
    color: colors.brown500,
    lineHeight: 18,
  },
  listenChip: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    marginTop: 6,
    // Organic blob radius, same family as the footer action buttons
    borderTopLeftRadius: 22,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 22,
  },
  listenChipText: {
    fontFamily: fonts.primaryBold,
    fontSize: 12,
    color: colors.white200,
  },
  editFields: {
    width: "100%",
  },
  editActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
    marginTop: -4,
  },
  editBtn: {
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    borderRadius: 44,
  },
  editBtnCancel: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.brown300,
  },
  editBtnCancelText: {
    fontFamily: fonts.primaryBold,
    fontSize: 13,
    color: colors.brown300,
  },
  editBtnSave: {
    backgroundColor: colors.brown500,
  },
  editBtnSaveText: {
    fontFamily: fonts.primaryBold,
    fontSize: 13,
    color: colors.white200,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: "auto",
  },
  footerLeft: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "center",
  },
  actionButton: {
    width: 36,
    height: 36,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 22,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonIcon: {
    fontSize: 18,
  },
  timestamp: {
    fontFamily: fonts.primary,
    fontSize: 12,
    color: colors.brown500,
  },
});
