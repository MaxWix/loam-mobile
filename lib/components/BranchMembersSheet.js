import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Pressable,
  Dimensions,
  PanResponder,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import ProfileImage from "./ProfileImage";
import Loader from "./Loader";
import { API_URL } from "../config";
import { colors, fonts, spacing } from "../theme";

const SCREEN_HEIGHT = Dimensions.get("window").height;
const MAX_SHEET_HEIGHT = SCREEN_HEIGHT * 0.7;

// Same thresholds as the other sheets — how far (px) or how fast (px/ms,
// PanResponder's unit) a downward drag must be on release to dismiss.
const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 1.2;

/**
 * Who's in a branch. Opened by tapping a post's branch pill.
 *
 * Each row is avatar + username, with a bud request button for anyone the
 * viewer isn't already connected to — a branch can contain people you
 * don't know yet (it's the owner's grouping of *their* connections), which
 * is the whole reason this is useful rather than just a member count.
 *
 * The list scrolls, but unlike CommentsSheet there's no need for
 * PanGestureHandler arbitration here: the drag lives on the header strip
 * only, so the ScrollView never competes for the same touch.
 */
export default function BranchMembersSheet({
  visible,
  onClose,
  branch,
  token,
}) {
  const [mounted, setMounted] = useState(false);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [requestingIds, setRequestingIds] = useState(new Set());

  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const dragStartValue = useRef(0);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      fetchMembers();
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
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [visible, branch?.id]);

  const fetchMembers = async () => {
    if (!branch?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/branches/${branch.id}/members`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
      }
    } catch (e) {
      console.warn("Failed to load branch members", e);
    } finally {
      setLoading(false);
    }
  };

  const sendRequest = async (userId) => {
    setRequestingIds((prev) => new Set([...prev, userId]));
    try {
      const res = await fetch(`${API_URL}/api/connections`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ receiver_id: userId }),
      });
      if (res.ok) {
        setMembers((prev) =>
          prev.map((m) =>
            m.id === userId ? { ...m, request_pending: true } : m,
          ),
        );
      }
    } catch (e) {
      console.warn("Bud request failed", e);
    } finally {
      setRequestingIds((prev) => {
        const s = new Set(prev);
        s.delete(userId);
        return s;
      });
    }
  };

  const dismissOrSnapBack = (dy, vy) => {
    if (dy > DISMISS_DISTANCE || vy > DISMISS_VELOCITY) {
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

  const shouldCaptureDrag = (_, g) =>
    g.dy > 4 && Math.abs(g.dy) > Math.abs(g.dx);

  // Drag lives on the header strip rather than the whole sheet, so it can
  // never fight the member list's scrolling for the same touch.
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: shouldCaptureDrag,
      onMoveShouldSetPanResponderCapture: shouldCaptureDrag,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        slideAnim.stopAnimation((value) => {
          dragStartValue.current = value;
        });
      },
      onPanResponderMove: (_, g) => {
        slideAnim.setValue(Math.max(0, dragStartValue.current + g.dy));
      },
      onPanResponderRelease: (_, g) => dismissOrSnapBack(g.dy, g.vy),
      onPanResponderTerminate: (_, g) => dismissOrSnapBack(g.dy, g.vy),
    }),
  ).current;

  const openProfile = (username) => {
    if (!username) return;
    onClose();
    router.push(`/(app)/user/${username}`);
  };

  if (!mounted) return null;

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

      <Animated.View
        style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
      >
        <View {...panResponder.panHandlers} collapsable={false}>
          <View style={styles.handle} />
          <View style={styles.titleRow}>
            {branch?.emoji ? (
              <Text style={styles.titleEmoji}>{branch.emoji}</Text>
            ) : null}
            <Text style={styles.title} numberOfLines={1}>
              {branch?.name || "Branch"}
            </Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <Loader size={56} />
          </View>
        ) : (
          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
          >
            {members.length === 0 ? (
              <Text style={styles.empty}>No one in this branch yet.</Text>
            ) : (
              members.map((m) => (
                <View key={m.id} style={styles.row}>
                  <TouchableOpacity
                    style={styles.rowLeft}
                    onPress={() => openProfile(m.username)}
                    disabled={!m.username || m.is_viewer}
                  >
                    <ProfileImage src={m.profile_img} variant="small" />
                    <View style={styles.rowText}>
                      <Text style={styles.rowUsername} numberOfLines={1}>
                        {m.username
                          ? `@${m.username}`
                          : m.display_name || "Someone"}
                      </Text>
                      {m.is_owner && (
                        <Text style={styles.rowMeta}>branch owner</Text>
                      )}
                    </View>
                  </TouchableOpacity>

                  {m.is_viewer ? (
                    <Text style={styles.rowStatus}>you</Text>
                  ) : m.already_connected ? (
                    <Text style={styles.rowStatus}>buds</Text>
                  ) : m.request_pending ? (
                    <Text style={styles.rowStatus}>requested</Text>
                  ) : (
                    <TouchableOpacity
                      style={styles.addButton}
                      onPress={() => sendRequest(m.id)}
                      disabled={requestingIds.has(m.id)}
                    >
                      <Text style={styles.addButtonText}>
                        {requestingIds.has(m.id) ? "…" : "add"}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )}
          </ScrollView>
        )}
      </Animated.View>
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
    maxHeight: MAX_SHEET_HEIGHT,
    backgroundColor: colors.brown50,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 32,
    shadowColor: colors.brown900,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.brown200,
    alignSelf: "center",
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  titleEmoji: {
    fontSize: 20,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    color: colors.brown900,
    flexShrink: 1,
  },
  loadingWrap: {
    paddingVertical: spacing.xl,
    alignItems: "center",
  },
  list: {
    flexGrow: 0,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  empty: {
    fontFamily: fonts.primary,
    fontSize: 14,
    color: colors.brown300,
    textAlign: "center",
    paddingVertical: spacing.xl,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  rowLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowUsername: {
    fontFamily: fonts.primaryBold,
    fontSize: 15,
    color: colors.brown700,
  },
  rowMeta: {
    fontFamily: fonts.primary,
    fontSize: 12,
    color: colors.brown300,
  },
  rowStatus: {
    fontFamily: fonts.primary,
    fontSize: 13,
    color: colors.brown300,
  },
  addButton: {
    backgroundColor: colors.lime500,
    borderRadius: 44,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
  },
  addButtonText: {
    fontFamily: fonts.primaryBold,
    fontSize: 13,
    color: colors.brown700,
  },
});
