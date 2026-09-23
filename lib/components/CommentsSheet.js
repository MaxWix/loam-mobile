import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Keyboard,
  Platform,
  Modal,
  Animated,
  Pressable,
  Dimensions,
  PanResponder,
} from "react-native";
import {
  PanGestureHandler,
  State,
  ScrollView,
} from "react-native-gesture-handler";
import ProfileImage from "./ProfileImage";
import ReportSheet from "./ReportSheet";
import { API_URL } from "../config";
import { timeAgo } from "../utils/timeAgo";
import { colors, fonts, spacing } from "../theme";
import {
  parseReactionValue,
  resolveEmojiComponent,
} from "../utils/emojiAssets";
import { router } from "expo-router";
const SCREEN_HEIGHT = Dimensions.get("window").height;
const KB_ANIM_DURATION = 160;

// How far (px) or how fast (px/s) a downward drag needs to be on release
// to count as "dismiss" rather than "snap back open."
// Note: react-native-gesture-handler reports velocity in px/second, unlike
// PanResponder's px/ms, so this threshold is 1000x the old PanResponder value.
const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 1200;

const SHEET_HEIGHT = SCREEN_HEIGHT * 0.7;
const MAX_SHEET_HEIGHT = SCREEN_HEIGHT * 0.92;

export default function CommentsSheet({
  postId,
  token,
  visible,
  onClose,
  viewerProfileImg,
  viewerId,
}) {
  const [mounted, setMounted] = useState(false);
  const [comments, setComments] = useState([]);
  // { id } of the comment being reported, or null. Rendered as a nested
  // Modal inside this sheet's Modal, which both platforms allow.
  const [reportTarget, setReportTarget] = useState(null);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  // Height/padding shifts driven by the keyboard can't be native-driven,
  // and the sheet's own open/close transform already is — mixing drivers
  // on one node isn't allowed, so this animates a *different* view (the
  // inner wrapper below) instead of fighting over the same one. Drives
  // 0 -> 1 and the actual height/padding values are interpolated off it.
  const kbProgress = useRef(new Animated.Value(0)).current;
  // Mirrors web's overlayReactorDetails/overlayCanViewReactors: a strip of
  // who reacted to the post, shown above the comment list. Only the post's
  // owner can see who reacted (server-gated via can_view_reactors), same
  // as web.
  const [reactorDetails, setReactorDetails] = useState([]);
  const [canViewReactors, setCanViewReactors] = useState(false);
  const textInputRef = useRef(null);
  const scrollRef = useRef(null);
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const scrollOffset = useRef(0);
  const dragStartValue = useRef(0);
  // Tracks whether the current gesture actually engaged the sheet (started
  // while the list was scrolled to the top). If the list wasn't at the top
  // when the drag began, this stays false and release is a no-op, leaving
  // the ScrollView to handle the touch normally.
  const isDraggingSheet = useRef(false);
  const focusTimer = useRef(null);

  const openProfile = (username) => {
    if (!username) return;
    onClose();
    router.push(`/(app)/user/${username}`);
  };

  useEffect(() => {
    if (visible) {
      setMounted(true);
      setComments([]);
      setReactorDetails([]);
      setCanViewReactors(false);
      fetchComments();
      fetchReactorDetails();
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 80,
          friction: 12,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
      focusTimer.current = setTimeout(() => {
        textInputRef.current?.focus();
      }, 350);
    } else {
      clearTimeout(focusTimer.current);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
    return () => clearTimeout(focusTimer.current);
  }, [visible, postId]);

  const dismissOrSnapBack = (dy, vy) => {
    const shouldDismiss = dy > DISMISS_DISTANCE || vy > DISMISS_VELOCITY;
    if (shouldDismiss) {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 200,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) onClose();
      });
    } else {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }).start();
    }
  };

  // --- Handle + title strip: unchanged, plain PanResponder always wins
  // here since there's no native ScrollView underneath to compete with. ---
  const shouldCaptureDrag = (_, gestureState) =>
    gestureState.dy > 4 &&
    Math.abs(gestureState.dy) > Math.abs(gestureState.dx);

  const handleResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: shouldCaptureDrag,
      onMoveShouldSetPanResponderCapture: shouldCaptureDrag,
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: () => {
        slideAnim.stopAnimation((value) => {
          dragStartValue.current = value;
        });
      },
      onPanResponderMove: (_, gestureState) => {
        const next = dragStartValue.current + gestureState.dy;
        slideAnim.setValue(Math.max(0, next));
      },
      onPanResponderRelease: (_, gestureState) => {
        dismissOrSnapBack(gestureState.dy, gestureState.vy * 1000);
      },
    }),
  ).current;

  // --- Sheet body: react-native-gesture-handler's PanGestureHandler runs
  // simultaneously with the ScrollView's native gesture recognizer instead
  // of trying to steal the touch through the plain JS responder system,
  // which is what a bare PanResponder can't reliably do against a native
  // ScrollView (especially on iOS). We only actually move the sheet when
  // the list is scrolled to the top; otherwise this is a no-op and the
  // ScrollView scrolls normally. ---
  const onSheetGestureEvent = ({ nativeEvent }) => {
    if (scrollOffset.current > 0) return;
    if (!isDraggingSheet.current) {
      isDraggingSheet.current = true;
      dragStartValue.current = 0;
    }
    slideAnim.setValue(Math.max(0, nativeEvent.translationY));
  };

  const onSheetHandlerStateChange = ({ nativeEvent }) => {
    if (
      nativeEvent.state === State.END ||
      nativeEvent.state === State.CANCELLED
    ) {
      if (isDraggingSheet.current) {
        dismissOrSnapBack(nativeEvent.translationY, nativeEvent.velocityY);
      }
      isDraggingSheet.current = false;
    }
  };

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates?.height ?? 0);
      Animated.timing(kbProgress, {
        toValue: 1,
        duration: KB_ANIM_DURATION,
        useNativeDriver: false,
      }).start();
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      Animated.timing(kbProgress, {
        toValue: 0,
        duration: KB_ANIM_DURATION,
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished) setKeyboardHeight(0);
      });
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleReply = (commentId, authorName) => {
    setReplyingTo({ commentId, authorName });
    textInputRef.current?.focus();
  };

  const cancelReply = () => {
    setReplyingTo(null);
    setNewComment("");
  };

  const fetchComments = async () => {
    if (!postId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/posts/${postId}/comments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
      }
    } catch (e) {
      console.error("Comments error", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchReactorDetails = async () => {
    if (!postId) return;
    try {
      const res = await fetch(
        `${API_URL}/api/posts/${postId}/reactions?detailed=1`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.ok) {
        const body = await res.json();
        setCanViewReactors(!!body.can_view_reactors);
        setReactorDetails(body.reactor_details || []);
      }
    } catch (e) {
      console.warn("Failed to fetch reactor details", e);
    }
  };

  const submitComment = async () => {
    if (!newComment.trim() || !postId) return;
    setSubmitting(true);
    try {
      const url = replyingTo
        ? `${API_URL}/api/comments/${replyingTo.commentId}/replies`
        : `${API_URL}/api/posts/${postId}/comments`;

      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: newComment.trim() }),
      });
      if (res.ok) {
        setNewComment("");
        setReplyingTo(null);
        fetchComments();
      }
    } catch (e) {
      console.error("Submit comment error", e);
    } finally {
      setSubmitting(false);
    }
  };
  if (!mounted) return null;

  // Interpolated off kbProgress (0 = keyboard closed, 1 = fully open) so
  // the sheet's height/padding tween smoothly instead of snapping.
  const targetHeight = Math.min(
    SHEET_HEIGHT + keyboardHeight,
    MAX_SHEET_HEIGHT,
  );
  const sheetHeight = kbProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [SHEET_HEIGHT, targetHeight],
  });
  const sheetPaddingBottom = kbProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, keyboardHeight],
  });
  const inputPaddingBottom = kbProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [32, spacing.md],
  });

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <PanGestureHandler
        onGestureEvent={onSheetGestureEvent}
        onHandlerStateChange={onSheetHandlerStateChange}
        simultaneousHandlers={scrollRef}
        activeOffsetY={10}
        failOffsetX={[-20, 20]}
      >
        {/* Outer view: owns only the open/close transform (native-driven).
            No height or padding here — those live one level in, so the two
            animation drivers never fight over the same node. */}
        <Animated.View
          style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
        >
          {/* Inner view: owns the keyboard-driven height/padding
              (JS-driven, since layout props can't be native-driven). */}
          <Animated.View
            style={{ height: sheetHeight, paddingBottom: sheetPaddingBottom }}
          >
            {/* Drag handle + title — always draggable via plain PanResponder,
                regardless of scroll position. */}
            <View {...handleResponder.panHandlers} collapsable={false}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>Comments</Text>
            </View>

            {canViewReactors && reactorDetails.length > 0 && (
              <>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.reactorsScroll}
                  contentContainerStyle={styles.reactorsStrip}
                >
                  {reactorDetails.map((r) => {
                    const parsed = parseReactionValue(r.emoji);
                    const EmojiIcon = parsed
                      ? resolveEmojiComponent(parsed.key, parsed.tone)
                      : null;
                    return (
                      <View
                        key={`${r.user_id}-${r.emoji}`}
                        style={styles.reactorChip}
                      >
                        <ProfileImage
                          src={r.author?.profile_img}
                          alt={
                            r.author?.display_name ||
                            r.author?.username ||
                            "Reactor"
                          }
                          variant="small"
                        />
                        <View style={styles.reactorEmojiBadge}>
                          {EmojiIcon ? (
                            <EmojiIcon width={14} height={14} />
                          ) : (
                            <Text style={styles.reactorEmojiText}>
                              {r.emoji}
                            </Text>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>
                <View style={styles.reactorsDivider} />
              </>
            )}

            <ScrollView
              ref={scrollRef}
              style={styles.commentsList}
              contentContainerStyle={styles.commentsContent}
              keyboardShouldPersistTaps="handled"
              onScroll={(e) => {
                scrollOffset.current = e.nativeEvent.contentOffset.y;
              }}
              scrollEventThrottle={16}
              bounces={false}
              overScrollMode="never"
            >
              {loading ? (
                <ActivityIndicator
                  color={colors.brown500}
                  style={{ marginTop: spacing.lg }}
                />
              ) : comments.length === 0 ? (
                <Text style={styles.noComments}>
                  No comments yet. Be the first!
                </Text>
              ) : (
                comments.map((comment) => (
                  <View key={comment.id} style={styles.comment}>
                    <ProfileImage
                      src={comment.author?.profile_img}
                      variant="smallest"
                    />
                    <View style={styles.commentBody}>
                      <View style={styles.commentMeta}>
                        <TouchableOpacity
                          onPress={() => openProfile(comment.author?.username)}
                        >
                          <Text style={styles.commentAuthor}>
                            {comment.author?.username ||
                              comment.author?.display_name ||
                              "Anonymous"}
                          </Text>
                        </TouchableOpacity>
                        <Text style={styles.commentTime}>
                          {timeAgo(comment.created_at)}
                        </Text>
                      </View>
                      <Text style={styles.commentContent}>
                        {comment.content}
                      </Text>
                      <View style={styles.commentActions}>
                        <TouchableOpacity
                          onPress={() =>
                            handleReply(
                              comment.id,
                              comment.author?.username ||
                                comment.author?.display_name ||
                                "Anonymous",
                            )
                          }
                        >
                          <Text style={styles.replyLink}>reply</Text>
                        </TouchableOpacity>
                        {!!comment.author?.id &&
                          comment.author.id !== viewerId && (
                            <TouchableOpacity
                              onPress={() =>
                                setReportTarget({ id: comment.id })
                              }
                            >
                              <Text style={styles.replyLink}>report</Text>
                            </TouchableOpacity>
                          )}
                      </View>
                      {(comment.replies || []).length > 0 && (
                        <View style={styles.repliesList}>
                          {comment.replies.map((reply) => (
                            <View key={reply.id} style={styles.reply}>
                              <ProfileImage
                                src={reply.author?.profile_img}
                                variant="smallest"
                              />
                              <View style={styles.commentBody}>
                                <View style={styles.commentMeta}>
                                  <Text style={styles.commentAuthor}>
                                    {reply.author?.username ||
                                      reply.author?.display_name ||
                                      "Anonymous"}
                                  </Text>
                                  <Text style={styles.commentTime}>
                                    {timeAgo(reply.created_at)}
                                  </Text>
                                </View>
                                <Text style={styles.commentContent}>
                                  {reply.content}
                                </Text>
                                <View style={styles.commentActions}>
                                  <TouchableOpacity
                                    onPress={() =>
                                      handleReply(
                                        comment.id,
                                        reply.author?.username ||
                                          reply.author?.display_name ||
                                          "Anonymous",
                                      )
                                    }
                                  >
                                    <Text style={styles.replyLink}>reply</Text>
                                  </TouchableOpacity>
                                  {!!reply.author?.id &&
                                    reply.author.id !== viewerId && (
                                      <TouchableOpacity
                                        onPress={() =>
                                          setReportTarget({ id: reply.id })
                                        }
                                      >
                                        <Text style={styles.replyLink}>
                                          report
                                        </Text>
                                      </TouchableOpacity>
                                    )}
                                </View>
                              </View>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  </View>
                ))
              )}
            </ScrollView>

            <View>
              {replyingTo && (
                <View style={styles.replyingToBanner}>
                  <Text style={styles.replyingToText}>
                    Replying to {replyingTo.authorName}
                  </Text>
                  <TouchableOpacity onPress={cancelReply}>
                    <Text style={styles.cancelReply}>✕</Text>
                  </TouchableOpacity>
                </View>
              )}
              <Animated.View
                style={[
                  styles.commentInput,
                  { paddingBottom: inputPaddingBottom },
                ]}
              >
                <ProfileImage src={viewerProfileImg} variant="small" />
                <TextInput
                  ref={textInputRef}
                  style={styles.commentTextInput}
                  placeholder={
                    replyingTo
                      ? `Reply to ${replyingTo.authorName}...`
                      : "Write a comment..."
                  }
                  placeholderTextColor={colors.brown200}
                  value={newComment}
                  onChangeText={setNewComment}
                  multiline
                />
                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    (!newComment.trim() || submitting) &&
                      styles.sendButtonDisabled,
                  ]}
                  onPress={submitComment}
                  disabled={!newComment.trim() || submitting}
                >
                  <Text style={styles.sendButtonText}>Send</Text>
                </TouchableOpacity>
              </Animated.View>
            </View>
          </Animated.View>
        </Animated.View>
      </PanGestureHandler>

      <ReportSheet
        visible={!!reportTarget}
        onClose={() => setReportTarget(null)}
        targetType="comment"
        targetId={reportTarget?.id}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.brown50,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: colors.brown900,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
    overflow: "hidden",
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.brown200,
    alignSelf: "center",
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  sheetTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    color: colors.brown900,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  reactorsScroll: {
    // Explicit height so this ScrollView can't default to filling leftover
    // flexible space in the sheet — without this, each reactorChip below
    // stretches to match, and the absolutely-positioned badge (anchored to
    // the chip's bottom edge) ends up pinned near the bottom of that huge
    // stretched box instead of tucked against the avatar.
    height: 44,
    flexGrow: 0,
  },
  reactorsStrip: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  reactorChip: {
    position: "relative",
  },
  reactorEmojiBadge: {
    position: "absolute",
    right: -2,
    bottom: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.lime500,
    borderWidth: 2,
    borderColor: colors.brown50,
    alignItems: "center",
    justifyContent: "center",
  },
  reactorEmojiText: {
    fontSize: 12,
  },
  reactorsDivider: {
    height: 1,
    backgroundColor: colors.brown100,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  commentsList: {
    flex: 1,
  },
  commentsContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  noComments: {
    fontFamily: fonts.primary,
    fontSize: 14,
    color: colors.brown300,
    textAlign: "center",
    paddingVertical: spacing.xl,
  },
  comment: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  commentBody: {
    flex: 1,
    gap: 2,
  },
  commentMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  commentAuthor: {
    fontFamily: fonts.displayBold,
    fontSize: 12,
    color: colors.brown500,
  },
  commentTime: {
    fontFamily: fonts.primary,
    fontSize: 11,
    color: colors.brown300,
  },
  commentContent: {
    fontFamily: fonts.primary,
    fontSize: 13,
    color: colors.brown500,
    lineHeight: 18,
  },
  repliesList: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  reply: {
    flexDirection: "row",
    gap: spacing.sm,
    marginLeft: spacing.sm,
  },
  commentInput: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.brown100,
  },
  commentTextInput: {
    flex: 1,
    fontFamily: fonts.primary,
    fontSize: 15,
    color: colors.brown900,
    maxHeight: 80,
  },
  sendButton: {
    backgroundColor: colors.lime500,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    borderRadius: 44,
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  sendButtonText: {
    fontFamily: fonts.primaryBold,
    fontSize: 13,
    color: colors.brown700,
  },
  commentActions: {
    flexDirection: "row",
    gap: spacing.md,
  },
  replyLink: {
    fontFamily: fonts.primary,
    fontSize: 11,
    color: colors.brown300,
    marginTop: 2,
  },
  cancelReply: {
    fontFamily: fonts.primaryBold,
    fontSize: 14,
    color: colors.brown300,
  },
  replyingToBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.brown100,
  },
  replyingToText: {
    fontFamily: fonts.primary,
    fontSize: 13,
    color: colors.brown500,
  },
});
