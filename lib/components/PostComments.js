import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import ProfileImage from "./ProfileImage";
import { API_URL } from "../config";
import { timeAgo } from "../utils/timeAgo";
import { colors, fonts, spacing } from "../theme";

// Same fetch/submit/reply behavior as CommentsSheet, and the same comment
// row markup — just rendered as a plain section instead of an animated
// bottom sheet, so it can sit inline below a PostCard in a normal page
// layout. Deliberately not wrapped in its own ScrollView: this is meant
// to live inside the parent screen's ScrollView, and nesting a vertical
// ScrollView inside another one causes scroll-gesture conflicts in RN.
//
// `onInputFocus` lets the parent screen scroll the input into view once
// the keyboard opens — this component can't do it itself, since the
// ScrollView it lives in belongs to the parent.
export default function PostComments({
  postId,
  token,
  viewerProfileImg,
  onInputFocus,
}) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const textInputRef = useRef(null);

  useEffect(() => {
    if (postId) fetchComments();
  }, [postId]);

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

  const handleReply = (commentId, authorName) => {
    setReplyingTo({ commentId, authorName });
    textInputRef.current?.focus();
  };

  const cancelReply = () => {
    setReplyingTo(null);
    setNewComment("");
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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Comments</Text>

      {loading ? (
        <ActivityIndicator
          color={colors.brown500}
          style={{ marginTop: spacing.lg }}
        />
      ) : comments.length === 0 ? (
        <Text style={styles.noComments}>No comments yet. Be the first!</Text>
      ) : (
        comments.map((comment) => (
          <View key={comment.id} style={styles.comment}>
            <ProfileImage
              src={comment.author?.profile_img}
              variant="smallest"
            />
            <View style={styles.commentBody}>
              <View style={styles.commentMeta}>
                <Text style={styles.commentAuthor}>
                  {comment.author?.username ||
                    comment.author?.display_name ||
                    "Anonymous"}
                </Text>
                <Text style={styles.commentTime}>
                  {timeAgo(comment.created_at)}
                </Text>
              </View>
              <Text style={styles.commentContent}>{comment.content}</Text>
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
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        ))
      )}

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

      <View style={styles.commentInput}>
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
          onFocus={onInputFocus}
          multiline
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!newComment.trim() || submitting) && styles.sendButtonDisabled,
          ]}
          onPress={submitComment}
          disabled={!newComment.trim() || submitting}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
    paddingHorizontal: spacing.lg,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    color: colors.brown900,
    marginBottom: spacing.md,
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
  replyLink: {
    fontFamily: fonts.primary,
    fontSize: 11,
    color: colors.brown300,
    marginTop: 2,
  },
  replyingToBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.brown100,
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  replyingToText: {
    fontFamily: fonts.primary,
    fontSize: 13,
    color: colors.brown500,
  },
  cancelReply: {
    fontFamily: fonts.primaryBold,
    fontSize: 14,
    color: colors.brown300,
  },
  commentInput: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.brown100,
    marginTop: spacing.sm,
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
});
