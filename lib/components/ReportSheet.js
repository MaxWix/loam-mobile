import { useState } from "react";
import { Alert } from "react-native";
import PostActionSheet from "./PostActionSheet";
import { useAuth } from "../stores/auth";
import { REPORT_REASONS, submitReport } from "../utils/moderation";

/**
 * Reason picker + submit for reporting a post, comment, or user.
 * Renders the same bottom sheet the post menu uses, so it can be dropped
 * anywhere — including inside another Modal (CommentsSheet), since a
 * Modal nested within an open Modal's hierarchy is fine on both platforms.
 *
 * @param {boolean} visible
 * @param {() => void} onClose
 * @param {'post'|'comment'|'user'} targetType
 * @param {string} targetId
 */
export default function ReportSheet({
  visible,
  onClose,
  targetType,
  targetId,
}) {
  const { supabase, session } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const handleReason = async (reason) => {
    if (submitting || !session?.user?.id || !targetId) return;
    setSubmitting(true);
    try {
      await submitReport(supabase, {
        reporterId: session.user.id,
        targetType,
        targetId,
        reason,
      });
      onClose();
      Alert.alert(
        "Report received",
        "Thanks for letting us know. We review reports within 24 hours and remove anything that breaks our rules.",
      );
    } catch (e) {
      console.warn("Report failed", e);
      Alert.alert("Error", "Couldn't send that report. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PostActionSheet
      visible={visible}
      onClose={onClose}
      title="Why are you reporting this?"
      actions={REPORT_REASONS.map((reason) => ({
        label: reason,
        onPress: () => handleReason(reason),
        disabled: submitting,
      }))}
    />
  );
}
