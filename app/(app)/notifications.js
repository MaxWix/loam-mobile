import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useAuth } from "../../lib/stores/auth";
import ProfileImage from "../../lib/components/ProfileImage";
import Loader from "../../lib/components/Loader";
import { colors, fonts, spacing } from "../../lib/theme";
import { timeAgo } from "../../lib/utils/timeAgo";
import { API_URL } from "../../lib/config";
import {
  parseReactionValue,
  resolveEmojiComponent,
} from "../../lib/utils/emojiAssets";

function toUTCms(timestamp) {
  if (!timestamp) return 0;
  let iso = timestamp;
  if (
    !timestamp.endsWith("Z") &&
    !timestamp.includes("+") &&
    !timestamp.includes("-", 10)
  ) {
    iso = timestamp.replace(" ", "T") + "Z";
  }
  return new Date(iso).getTime();
}

function displayName(profile) {
  if (!profile) return "Someone";
  return (
    profile.display_name ||
    profile.username ||
    `${profile.first_name || ""} ${profile.last_name || ""}`.trim() ||
    "Someone"
  );
}

function getActionText(notif) {
  if (notif.type === "connection_request") return "sent you a bud request";
  if (notif.type === "reply") return "replied to your comment on";
  if (notif.type === "comment") return "commented on";
  if (notif.type === "reaction") return "reacted to";
  if (notif.type === "new_bud") return "and you are now buds!";
  return "";
}

function getProfile(notif) {
  if (notif.type === "connection_request") return notif.profile;
  if (notif.type === "comment" || notif.type === "reply") return notif.author;
  if (notif.type === "reaction") return notif.user;
  if (notif.type === "new_bud") return notif.profile;
  return null;
}

// Buckets by calendar day rather than fixed 24h windows, so "Today" means
// "since local midnight" and matches what people actually expect — not
// "within the last 24 hours." Uses toUTCms so Postgres timestamps without
// a trailing Z (parsed as local time otherwise) don't throw the boundary
// off by the local UTC offset.
function groupByDate(notifications) {
  const now = new Date();
  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
  const twoDaysAgoStart = todayStart - 2 * 24 * 60 * 60 * 1000;

  const groups = { today: [], yesterday: [], twoDaysAgo: [] };
  for (const notif of notifications) {
    const t = toUTCms(notif.created_at);
    if (t >= todayStart) groups.today.push(notif);
    else if (t >= yesterdayStart) groups.yesterday.push(notif);
    else if (t >= twoDaysAgoStart) groups.twoDaysAgo.push(notif);
    // Anything older falls outside the 72h window already filtered
    // upstream, so there's no "older" bucket to catch here.
  }
  return groups;
}

function Section({ title, notifications, onAccept, onDecline, processingIds }) {
  if (!notifications.length) return null;
  return (
    <View style={styles.section}>
      <Text style={styles.sectionHeader}>{title}</Text>
      {notifications.map((notif) =>
        notif.type === "connection_request" ? (
          <ConnectionRequestItem
            key={notif.id}
            notif={notif}
            onAccept={onAccept}
            onDecline={onDecline}
            processing={processingIds.has(notif.id)}
          />
        ) : (
          <NotificationItem key={notif.id} notif={notif} />
        ),
      )}
    </View>
  );
}

function NotificationItem({ notif }) {
  const profile = getProfile(notif);
  const name = displayName(profile);
  const action = getActionText(notif);
  const detail = notif.type === "reaction" ? notif.emoji : notif.content;

  // Reactions are stored as "key:tone" and resolve to a custom SVG.
  // Reactions saved before the custom picker existed are plain unicode —
  // parseReactionValue returns null for those, and we fall back to
  // rendering the original character as text (same rule as Reactions.js).
  const reactionParsed =
    notif.type === "reaction" ? parseReactionValue(notif.emoji) : null;
  const ReactionIcon = reactionParsed
    ? resolveEmojiComponent(reactionParsed.key, reactionParsed.tone)
    : null;

  const content = (
    <>
      <ProfileImage src={profile?.profile_img} variant="small" />
      <View style={styles.notifBody}>
        <Text style={styles.notifText}>
          <Text style={styles.notifName}>{name} </Text>
          <Text>{action}</Text>
          {notif.post_title ? (
            <Text style={styles.notifBold}> "{notif.post_title}"</Text>
          ) : null}
        </Text>
        {notif.type === "reaction" ? (
          ReactionIcon ? (
            <ReactionIcon
              width={22}
              height={22}
              style={styles.notifDetailEmojiIcon}
            />
          ) : detail ? (
            <Text style={styles.notifDetailEmoji}>{detail}</Text>
          ) : null
        ) : (
          detail && (
            <Text style={styles.notifDetail} numberOfLines={2}>
              {detail}
            </Text>
          )
        )}
        <Text style={styles.notifTime}>{timeAgo(notif.created_at)}</Text>
      </View>
    </>
  );

  if (notif.post_id) {
    return (
      <TouchableOpacity
        style={styles.notifItem}
        onPress={() => router.push(`/(app)/posts/${notif.post_id}`)}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={styles.notifItem}>{content}</View>;
}

function ConnectionRequestItem({ notif, onAccept, onDecline, processing }) {
  const profile = getProfile(notif);
  const name = displayName(profile);

  return (
    <View style={styles.requestItem}>
      <ProfileImage src={profile?.profile_img} variant="small" />
      <View style={styles.requestBody}>
        <Text style={styles.notifText}>
          <Text style={styles.notifName}>{name} </Text>
          <Text>wants to be buds</Text>
        </Text>
        <Text style={styles.notifTime}>{timeAgo(notif.created_at)}</Text>
      </View>
      <View style={styles.requestActions}>
        <TouchableOpacity
          style={[styles.acceptBtn, processing && styles.btnDisabled]}
          onPress={() => onAccept(notif.id)}
          disabled={processing}
        >
          <Text style={styles.acceptBtnText}>Accept</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.declineBtn, processing && styles.btnDisabled]}
          onPress={() => onDecline(notif.id)}
          disabled={processing}
        >
          <Text style={styles.declineBtnText}>Decline</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function NotificationsScreen() {
  const { supabase, session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [processingIds, setProcessingIds] = useState(new Set());

  const fetchNotifications = useCallback(async () => {
    if (!session) return;
    const userId = session.user.id;
    setLoading(true);

    try {
      await fetch(`${API_URL}/api/notifications/read`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      }).catch(() => {});

      // Connection requests
      const { data: incomingRows } = await supabase
        .from("connections")
        .select("id, requester_id, status")
        .eq("receiver_id", userId)
        .eq("status", "requested");

      const requesterIds = (incomingRows || [])
        .map((r) => r.requester_id)
        .filter(Boolean);
      let incomingProfiles = [];
      if (requesterIds.length > 0) {
        const { data: p } = await supabase
          .from("profiles")
          .select(
            "id, display_name, first_name, last_name, profile_img, username",
          )
          .in("id", requesterIds);
        incomingProfiles = p || [];
      }
      const profilesById = Object.fromEntries(
        incomingProfiles.map((p) => [p.id, p]),
      );
      const incoming = (incomingRows || []).map((r) => ({
        id: r.id,
        type: "connection_request",
        created_at: new Date().toISOString(),
        profile: profilesById[r.requester_id] || null,
      }));

      // User's posts
      const { data: posts } = await supabase
        .from("posts")
        .select("id, title")
        .eq("user_id", userId);
      const postIds = (posts || []).map((p) => p.id).filter(Boolean);
      const postTitlesById = Object.fromEntries(
        (posts || []).map((p) => [p.id, p.title]),
      );

      let comments = [];
      let reactions = [];

      if (postIds.length > 0) {
        const { data: c } = await supabase
          .from("comments")
          .select(
            "id, post_id, user_id, content, created_at, parent_comment_id",
          )
          .in("post_id", postIds)
          .neq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(20);
        comments = c || [];

        const { data: r } = await supabase
          .from("reactions")
          .select("id, post_id, user_id, emoji, created_at")
          .in("post_id", postIds)
          .neq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(20);
        reactions = r || [];
      }

      // Replies to my comments
      const { data: myComments } = await supabase
        .from("comments")
        .select("id, post_id")
        .eq("user_id", userId);
      const myCommentIds = (myComments || []).map((c) => c.id).filter(Boolean);

      if (myCommentIds.length > 0) {
        const { data: replyRows } = await supabase
          .from("comments")
          .select(
            "id, post_id, user_id, content, created_at, parent_comment_id",
          )
          .in("parent_comment_id", myCommentIds)
          .neq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(20);
        const existingIds = new Set(comments.map((c) => c.id));
        for (const row of replyRows || []) {
          if (!existingIds.has(row.id)) comments.push(row);
        }
      }

      // Fetch actor profiles
      if (comments.length > 0 || reactions.length > 0) {
        const actorIds = [
          ...new Set([
            ...comments.map((x) => x.user_id),
            ...reactions.map((x) => x.user_id),
          ]),
        ].filter(Boolean);

        let actorProfiles = [];
        if (actorIds.length > 0) {
          const { data: ap } = await supabase
            .from("profiles")
            .select(
              "id, display_name, first_name, last_name, profile_img, username",
            )
            .in("id", actorIds);
          actorProfiles = ap || [];
        }
        const actorsById = Object.fromEntries(
          actorProfiles.map((p) => [p.id, p]),
        );

        const knownIds = new Set(postIds);
        const extraIds = [...new Set(comments.map((c) => c.post_id))].filter(
          (id) => id && !knownIds.has(id),
        );
        if (extraIds.length > 0) {
          const { data: extraPosts } = await supabase
            .from("posts")
            .select("id, title")
            .in("id", extraIds);
          for (const p of extraPosts || []) postTitlesById[p.id] = p.title;
        }

        comments = comments.map((c) => ({
          ...c,
          type: c.parent_comment_id ? "reply" : "comment",
          author: actorsById[c.user_id] || null,
          post_title: postTitlesById[c.post_id] || "a post",
        }));
        reactions = reactions.map((r) => ({
          ...r,
          type: "reaction",
          user: actorsById[r.user_id] || null,
          post_title: postTitlesById[r.post_id] || "a post",
        }));
      }

      // New buds (last 72h)
      const seventyTwoHoursAgo = new Date(
        Date.now() - 72 * 60 * 60 * 1000,
      ).toISOString();
      const { data: newBudRows } = await supabase
        .from("connections")
        .select(
          "id, created_at, requester:requester_id(id, username, display_name, profile_img), receiver:receiver_id(id, username, display_name, profile_img)",
        )
        .eq("status", "approved")
        .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`)
        .gt("created_at", seventyTwoHoursAgo)
        .order("created_at", { ascending: false });

      const newBuds = (newBudRows || []).map((conn) => {
        const isRequester = conn.requester?.id === userId;
        const other = isRequester ? conn.receiver : conn.requester;
        return {
          id: `bud-${conn.id}`,
          type: "new_bud",
          created_at: conn.created_at,
          profile: other,
        };
      });

      // Filter to last 72h and sort newest first — uses toUTCms so
      // Postgres timestamps without a trailing Z are parsed as UTC,
      // not local time (which was letting >72h items slip through).
      const cutoff = Date.now() - 72 * 60 * 60 * 1000;
      const all = [...incoming, ...newBuds, ...comments, ...reactions]
        .filter((n) => toUTCms(n.created_at) >= cutoff)
        .sort((a, b) => toUTCms(b.created_at) - toUTCms(a.created_at));

      setNotifications(all);
    } catch (e) {
      console.error("Notifications error", e);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const acceptRequest = async (requestId) => {
    setProcessingIds((prev) => new Set([...prev, requestId]));
    try {
      const res = await fetch(
        `${API_URL}/api/connections/${requestId}/accept`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}` },
        },
      );
      if (res.ok) {
        fetchNotifications();
      } else {
        Alert.alert("Error", "Failed to accept request.");
      }
    } catch (e) {
      Alert.alert("Error", "Something went wrong.");
    } finally {
      setProcessingIds((prev) => {
        const s = new Set(prev);
        s.delete(requestId);
        return s;
      });
    }
  };

  const declineRequest = async (requestId) => {
    setProcessingIds((prev) => new Set([...prev, requestId]));
    try {
      const res = await fetch(
        `${API_URL}/api/connections/${requestId}/reject`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}` },
        },
      );
      if (res.ok) {
        fetchNotifications();
      } else {
        Alert.alert("Error", "Failed to decline request.");
      }
    } catch (e) {
      Alert.alert("Error", "Something went wrong.");
    } finally {
      setProcessingIds((prev) => {
        const s = new Set(prev);
        s.delete(requestId);
        return s;
      });
    }
  };

  const grouped = groupByDate(notifications);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.brown500} size="large" />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.empty}>No notifications yet.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Section
            title="Today"
            notifications={grouped.today}
            onAccept={acceptRequest}
            onDecline={declineRequest}
            processingIds={processingIds}
          />
          <Section
            title="Yesterday"
            notifications={grouped.yesterday}
            onAccept={acceptRequest}
            onDecline={declineRequest}
            processingIds={processingIds}
          />
          <Section
            title="2 Days Ago"
            notifications={grouped.twoDaysAgo}
            onAccept={acceptRequest}
            onDecline={declineRequest}
            processingIds={processingIds}
          />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 56,
    paddingHorizontal: spacing.screenHorizontal,
    paddingBottom: spacing.md,
    backgroundColor: colors.white200,
    borderBottomWidth: 1,
    borderBottomColor: colors.brown100,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 20,
    color: colors.brown500,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    fontFamily: fonts.primary,
    fontSize: 14,
    color: colors.green300,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  section: {
    borderBottomWidth: 1,
    borderBottomColor: colors.brown100,
  },
  sectionHeader: {
    fontFamily: fonts.primaryBold,
    fontSize: 16,
    color: colors.brown500,
    paddingHorizontal: spacing.screenHorizontal,
    paddingVertical: spacing.md,
  },
  notifItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    paddingHorizontal: spacing.screenHorizontal,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.brown100,
  },
  notifBody: {
    flex: 1,
    gap: 2,
  },
  notifText: {
    fontFamily: fonts.primary,
    fontSize: 13,
    color: colors.brown500,
    lineHeight: 18,
  },
  notifName: {
    fontFamily: fonts.primaryBold,
    color: colors.brown700,
  },
  notifBold: {
    fontFamily: fonts.primaryBold,
  },
  notifDetail: {
    fontFamily: fonts.primary,
    fontSize: 12,
    color: colors.brown300,
    lineHeight: 16,
    marginTop: 2,
  },
  notifTime: {
    fontFamily: fonts.primary,
    fontSize: 11,
    color: colors.brown300,
    marginTop: 4,
  },
  notifEmoji: {
    fontSize: 22,
  },
  requestItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.screenHorizontal,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.brown100,
  },
  requestBody: {
    flex: 1,
    gap: 2,
  },
  requestActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  acceptBtn: {
    backgroundColor: colors.brown500,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: 44,
  },
  acceptBtnText: {
    fontFamily: fonts.primaryBold,
    fontSize: 12,
    color: colors.white200,
  },
  declineBtn: {
    borderWidth: 1,
    borderColor: colors.brown300,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: 44,
  },
  declineBtnText: {
    fontFamily: fonts.primaryBold,
    fontSize: 12,
    color: colors.brown300,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  notifDetailEmoji: {
    fontSize: 22,
    lineHeight: 28,
    marginTop: 4,
  },
  notifDetailEmojiIcon: {
    marginTop: 4,
  },
});
