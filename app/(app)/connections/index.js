import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useAuth } from "../../../lib/stores/auth";
import { API_URL } from "../../../lib/config";
import ProfileImage from "../../../lib/components/ProfileImage";
import SearchBar from "../../../lib/components/SearchBar";
import NotificationOverrideModal from "../../../lib/components/NotificationOverrideModal";
import Button from "../../../lib/components/Button";
import BranchSelector from "../../../lib/components/BranchSelector";
import WhiteOnBrownLogo from "../../../assets/whiteOnBrownLogo.svg";
import { colors, fonts, spacing, radius } from "../../../lib/theme";

// Sentinel id for a branch that only exists locally and hasn't been
// saved to the server yet. Nothing is written to the database until the
// user explicitly hits save, so abandoning a new branch costs nothing.
const DRAFT_ID = "__draft__";

export default function ConnectionsScreen() {
  const { session } = useAuth();
  const params = useLocalSearchParams();
  const [pendingAutoCreate, setPendingAutoCreate] = useState(false);
  const [showBranchNotifications, setShowBranchNotifications] = useState(false);
  const [allConnections, setAllConnections] = useState([]);
  const [filteredConnections, setFilteredConnections] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [pendingIds, setPendingIds] = useState(new Set());
  const [requestingIds, setRequestingIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [removeModalOpen, setRemoveModalOpen] = useState(false);
  const [selectedBudToRemove, setSelectedBudToRemove] = useState(null);
  const [removing, setRemoving] = useState(false);
  const [editEmoji, setEditEmoji] = useState("");
  const [editName, setEditName] = useState("");
  const [savingBranch, setSavingBranch] = useState(false);
  const [deleteBranchModalOpen, setDeleteBranchModalOpen] = useState(false);
  const [deletingBranch, setDeletingBranch] = useState(false);
  const [creatingBranch, setCreatingBranch] = useState(false);
  const [discardModalOpen, setDiscardModalOpen] = useState(false);
  const pendingActionRef = useRef(null);
  const token = session?.access_token;
  const currentUserId = session?.user?.id;
  const searchTimeout = useRef(null);

  const selectedBranch =
    branches.find((b) => b.id === selectedBranchId) || null;
  const isDraft = selectedBranchId === DRAFT_ID;

  // Keep the inline emoji/name fields in sync whenever the selected
  // branch changes (including right after toggling members, since we
  // update `branches` in place rather than refetching).
  useEffect(() => {
    if (selectedBranch) {
      setEditEmoji(selectedBranch.emoji || "");
      setEditName(selectedBranch.name || "");
    }
    setSearchQuery("");
    setSearchResults([]);
  }, [selectedBranchId]);

  // Auto-save the title/emoji shortly after the user stops typing. Skips
  // entirely if nothing's actually changed from what's stored (so simply
  // selecting a branch doesn't trigger a save) or if the name is
  // momentarily blank mid-edit (silent — no alert while typing).
  useEffect(() => {
    if (!selectedBranchId || isDraft || !selectedBranch) return;
    if (!editName.trim()) return;
    if (
      editEmoji === selectedBranch.emoji &&
      editName === selectedBranch.name
    ) {
      return;
    }
    const t = setTimeout(() => {
      saveBranchDetails({ silent: true });
    }, 600);
    return () => clearTimeout(t);
  }, [editEmoji, editName, selectedBranchId]);

  const connectedById = useMemo(() => {
    const map = new Map();
    for (const c of allConnections) map.set(c.user_id, c);
    return map;
  }, [allConnections]);

  const loadConnections = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const authHeader = { Authorization: `Bearer ${token}` };
      const [connRes, branchRes] = await Promise.all([
        fetch(`${API_URL}/api/connections`, { headers: authHeader }),
        fetch(`${API_URL}/api/branches`, { headers: authHeader }),
      ]);

      if (connRes.ok) {
        const data = await connRes.json();
        setAllConnections(data.connections || []);
      }

      if (branchRes.ok) {
        const data = await branchRes.json();
        console.log("Branches loaded:", JSON.stringify(data.branches, null, 2));
        setBranches(
          (data.branches || []).map((b) => ({
            id: b.id,
            name: b.name || "Unnamed",
            emoji: b.emoji || "📁",
            color: b.color || "B6AFA3",
            memberIds: (b.members || []).map((m) => m.id),
          })),
        );
      }
    } catch (e) {
      console.error("Failed to load connections", e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Runs on initial mount and every time this tab regains focus — e.g.
  // after accepting a bud request from notifications, or coming back
  // from a profile visit — so the list never goes stale.
  useFocusEffect(
    useCallback(() => {
      // Arm on every focus where the param is present, not just on first
      // mount — tabs stay mounted when you switch away in Expo Router, so
      // a one-shot "already triggered" guard would permanently block a
      // second "+" tap later in the same session.
      if (params?.create) setPendingAutoCreate(true);
      loadConnections();
    }, [loadConnections, params?.create]),
  );

  // Deep-link from feed's "+" button (?create=1): jump straight into the
  // branch-creation editor instead of just landing on this screen. Waits
  // for loadConnections to actually finish (loading === false) — its
  // branch fetch does a full setBranches(...) replace, not a merge, so
  // triggering the draft before that resolves would have it wiped out
  // the instant the real list arrives.
  useEffect(() => {
    if (pendingAutoCreate && !loading) {
      setPendingAutoCreate(false);
      handleCreateBranch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAutoCreate, loading]);

  // Local bud list — only used when the search box is empty, filtered
  // by the selected branch's members if one is selected (members-first,
  // then everyone else, both alphabetical).
  useEffect(() => {
    const memberSet = selectedBranch ? new Set(selectedBranch.memberIds) : null;

    const sorted = [...allConnections].sort((a, b) => {
      if (memberSet) {
        const aIn = memberSet.has(a.user_id) ? 1 : 0;
        const bIn = memberSet.has(b.user_id) ? 1 : 0;
        if (bIn - aIn !== 0) return bIn - aIn;
      }
      const nameA = (a.display_name || "").toLowerCase();
      const nameB = (b.display_name || "").toLowerCase();
      return nameA.localeCompare(nameB);
    });
    setFilteredConnections(sorted);
  }, [allConnections, selectedBranchId, branches]);

  // Global user search — hits the same endpoint the web app uses
  const runSearch = useCallback(
    async (query) => {
      if (!token) return;
      setSearching(true);
      try {
        const res = await fetch(
          `${API_URL}/api/users/search?q=${encodeURIComponent(query)}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (res.ok) {
          const data = await res.json();
          setSearchResults((data || []).filter((u) => u.id !== currentUserId));
        }
      } catch (e) {
        console.error("User search failed", e);
      } finally {
        setSearching(false);
      }
    },
    [token, currentUserId],
  );

  const isBranchMode = !!selectedBranch;

  const handleSearch = (text) => {
    setSearchQuery(text);
    // While editing a branch, search should just filter the existing
    // connections list locally — no need to hit the global user-search
    // endpoint, since you can only add/remove people you're already
    // connected with as branch members.
    if (isBranchMode) return;

    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    const trimmed = text.trim();
    if (!trimmed) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    searchTimeout.current = setTimeout(() => runSearch(trimmed), 400);
  };

  // Local, always-available filter over the connections list — used for
  // the plain bud list and for branch-edit mode search.
  const visibleConnections = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return filteredConnections;
    return filteredConnections.filter((c) =>
      (c.display_name || "").toLowerCase().includes(q),
    );
  }, [filteredConnections, searchQuery]);

  // Global search only kicks in when there's no branch selected — with a
  // branch selected, search always means "filter my connections."
  const isGlobalSearchMode = !isBranchMode && searchQuery.trim().length > 0;

  const showRemoveBudModal = (connection) => {
    setSelectedBudToRemove(connection);
    setRemoveModalOpen(true);
  };

  const confirmRemove = async () => {
    const bud = selectedBudToRemove;
    if (!bud) return;
    setRemoving(true);
    try {
      const res = await fetch(
        `${API_URL}/api/connections/${bud.connection_id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (res.ok) {
        setAllConnections((prev) =>
          prev.filter((c) => c.connection_id !== bud.connection_id),
        );
      } else {
        Alert.alert("Error", "Failed to remove bud.");
      }
    } catch (e) {
      Alert.alert("Error", "Something went wrong.");
    } finally {
      setRemoving(false);
      setRemoveModalOpen(false);
      setSelectedBudToRemove(null);
    }
  };

  const sendBudRequest = async (userId) => {
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
        setPendingIds((prev) => new Set([...prev, userId]));
      } else {
        const data = await res.json().catch(() => ({}));
        Alert.alert("Error", data.error || "Could not send request.");
      }
    } catch (e) {
      Alert.alert("Error", "Something went wrong.");
    } finally {
      setRequestingIds((prev) => {
        const s = new Set(prev);
        s.delete(userId);
        return s;
      });
    }
  };

  // Auto-save — for a branch that already exists server-side, this fires
  // shortly after typing stops (see the debounce effect below) and also
  // immediately on blur as a safety net. `silent` is used by the debounce
  // path so a momentarily-blank name field (mid-edit) doesn't pop an
  // alert; onBlur still warns if you actually leave it empty.
  const saveBranchDetails = async ({ silent = false } = {}) => {
    if (!selectedBranchId || isDraft) return;
    if (!editName.trim()) {
      if (!silent) Alert.alert("Required", "Branch name is required.");
      return;
    }
    setSavingBranch(true);
    try {
      const res = await fetch(`${API_URL}/api/branches/${selectedBranchId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: editName, emoji: editEmoji }),
      });
      if (res.ok) {
        setBranches((prev) =>
          prev.map((b) =>
            b.id === selectedBranchId
              ? { ...b, name: editName, emoji: editEmoji }
              : b,
          ),
        );
      } else if (!silent) {
        Alert.alert("Error", "Failed to save branch.");
      }
    } catch (e) {
      if (!silent) Alert.alert("Error", "Failed to save branch.");
    } finally {
      setSavingBranch(false);
    }
  };

  // Toggling a bud in/out of the currently selected branch — updates the
  // branch's memberIds in place so the checkbox list and the sort order
  // both react immediately without a full refetch.
  const toggleBranchMember = async (memberId, next) => {
    if (!selectedBranchId) return;

    // Draft branches don't exist server-side yet, so membership is just
    // local state until save — no requests, nothing to roll back.
    if (isDraft) {
      setBranches((prev) =>
        prev.map((b) => {
          if (b.id !== DRAFT_ID) return b;
          const ids = next
            ? [...new Set([...b.memberIds, memberId])]
            : b.memberIds.filter((id) => id !== memberId);
          return { ...b, memberIds: ids };
        }),
      );
      return;
    }

    const rollback = branches;
    setBranches((prev) =>
      prev.map((b) => {
        if (b.id !== selectedBranchId) return b;
        const ids = next
          ? [...new Set([...b.memberIds, memberId])]
          : b.memberIds.filter((id) => id !== memberId);
        return { ...b, memberIds: ids };
      }),
    );

    try {
      const url = next
        ? `${API_URL}/api/branches/${selectedBranchId}/members`
        : `${API_URL}/api/branches/${selectedBranchId}/members/${memberId}`;

      const res = await fetch(url, {
        method: next ? "POST" : "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          ...(next ? { "Content-Type": "application/json" } : {}),
        },
        ...(next ? { body: JSON.stringify({ member_id: memberId }) } : {}),
      });

      if (!res.ok) {
        setBranches(rollback);
        Alert.alert("Error", "Failed to update member.");
      }
    } catch (e) {
      setBranches(rollback);
      Alert.alert("Error", "Failed to update member.");
    }
  };

  // Shared by both delete paths: the explicit "delete" button in the
  // edit row (which uses its own confirm modal below), and BranchSelector's
  // long-press-then-minus-badge flow (which has its own confirm modal).
  // Throws on failure so BranchSelector knows not to remove the chip
  // locally when the server delete didn't actually succeed.
  const deleteBranchById = async (id) => {
    const res = await fetch(`${API_URL}/api/branches/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to delete branch.");
    setBranches((prev) => prev.filter((b) => b.id !== id));
    if (selectedBranchId === id) setSelectedBranchId(null);
  };

  const deleteBranch = async () => {
    if (!selectedBranchId) {
      setDeleteBranchModalOpen(false);
      return;
    }
    setDeletingBranch(true);
    try {
      await deleteBranchById(selectedBranchId);
    } catch (e) {
      Alert.alert("Error", "Failed to delete branch.");
    } finally {
      setDeletingBranch(false);
      setDeleteBranchModalOpen(false);
    }
  };

  // Tapping "+" only creates a *local* draft — nothing is written to the
  // server until the user hits save. Abandoning it therefore costs
  // nothing and leaves no orphan rows behind.
  const handleCreateBranch = () => {
    if (isDraft) return; // already drafting one
    setBranches((prev) => [
      ...prev,
      {
        id: DRAFT_ID,
        name: "",
        emoji: "",
        color: "F5F5E1",
        memberIds: [],
      },
    ]);
    setSelectedBranchId(DRAFT_ID);
  };

  const discardDraft = () => {
    setBranches((prev) => prev.filter((b) => b.id !== DRAFT_ID));
  };

  const draftHasContent = () => {
    const draft = branches.find((b) => b.id === DRAFT_ID);
    if (!draft) return false;
    return !!(editName.trim() || editEmoji.trim() || draft.memberIds.length);
  };

  // Wraps any action that would navigate away from an unsaved draft. If
  // the draft has real content, confirm first; if it's untouched, just
  // drop it silently and continue.
  const leaveDraftThen = (proceed) => {
    if (!isDraft) {
      proceed();
      return;
    }
    if (draftHasContent()) {
      pendingActionRef.current = proceed;
      setDiscardModalOpen(true);
      return;
    }
    discardDraft();
    proceed();
  };

  const confirmDiscard = () => {
    discardDraft();
    setDiscardModalOpen(false);
    const act = pendingActionRef.current;
    pendingActionRef.current = null;
    act?.();
  };

  // Persists the draft: create the branch, then add each member that was
  // selected while drafting, then swap the local draft for the real row.
  const saveNewBranch = async () => {
    const draft = branches.find((b) => b.id === DRAFT_ID);
    if (!draft || creatingBranch) return;
    if (!editName.trim()) {
      Alert.alert("Required", "Branch name is required.");
      return;
    }
    setCreatingBranch(true);
    try {
      const res = await fetch(`${API_URL}/api/branches`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: editName.trim(),
          emoji: editEmoji || "✨",
          color: draft.color,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        Alert.alert("Error", data.error || "Failed to create branch.");
        return;
      }
      const data = await res.json();
      const newId = data.branch?.id;

      // Add everyone the user checked off while the branch was a draft.
      await Promise.all(
        draft.memberIds.map((memberId) =>
          fetch(`${API_URL}/api/branches/${newId}/members`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ member_id: memberId }),
          }),
        ),
      );

      setBranches((prev) =>
        prev.map((b) =>
          b.id === DRAFT_ID
            ? {
                id: newId,
                name: editName.trim(),
                emoji: editEmoji || "✨",
                color: draft.color,
                memberIds: draft.memberIds,
              }
            : b,
        ),
      );
      setSelectedBranchId(newId);
    } catch (e) {
      Alert.alert("Error", "Failed to create branch.");
    } finally {
      setCreatingBranch(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => leaveDraftThen(() => router.back())}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
      </View>

      {/* Branch filter row — long-press any branch to enter delete/reorder
          mode (minus badges appear, drag to reorder). The draft branch
          (unsaved, being created) isn't part of this — it has its own
          explicit save/cancel buttons in the edit row below, so it's
          filtered out of what BranchSelector manages. */}
      <BranchSelector
        branches={branches.filter((b) => b.id !== DRAFT_ID)}
        selectedBranchId={selectedBranchId}
        onSelectBranch={(id) => leaveDraftThen(() => setSelectedBranchId(id))}
        onAddBranch={handleCreateBranch}
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

      {selectedBranch && (
        <View style={styles.branchEditRow}>
          <TextInput
            style={styles.branchEmojiInput}
            value={editEmoji}
            onChangeText={(text) => {
              // Keep only the first grapheme so multi-codepoint emoji
              // (skin tones, ZWJ sequences) come through as one character.
              if (!text) return setEditEmoji("");
              const seg =
                typeof Intl !== "undefined" && Intl.Segmenter
                  ? [...new Intl.Segmenter().segment(text)][0]?.segment
                  : text.slice(0, 2);
              setEditEmoji(seg || text.slice(0, 2));
            }}
            onBlur={saveBranchDetails}
            placeholder="🙂"
            placeholderTextColor={colors.brown300}
            maxLength={4}
          />
          <TextInput
            style={styles.branchNameInput}
            value={editName}
            onChangeText={setEditName}
            onBlur={saveBranchDetails}
            placeholder="Branch name"
            placeholderTextColor={colors.brown300}
          />
          {isDraft ? (
            <>
              <TouchableOpacity
                style={styles.branchDiscardButton}
                onPress={() => leaveDraftThen(() => setSelectedBranchId(null))}
              >
                <Text style={styles.branchDiscardButtonText}>cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.branchSaveButton}
                onPress={saveNewBranch}
                disabled={creatingBranch}
              >
                <Text style={styles.branchSaveButtonText}>
                  {creatingBranch ? "saving..." : "save"}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={styles.branchDeleteButton}
              onPress={() => setDeleteBranchModalOpen(true)}
            >
              <Text style={styles.branchDeleteButtonText}>delete</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Branch-scope notification exceptions. Skipped while drafting —
          an unsaved branch has no real id to attach an override to. */}
      {selectedBranch && !isDraft && (
        <View style={styles.branchOverrideWrapper}>
          <TouchableOpacity
            style={styles.branchNotificationsButton}
            onPress={() => setShowBranchNotifications(true)}
          >
            <Text style={styles.branchNotificationsText}>notifications</Text>
          </TouchableOpacity>
        </View>
      )}

      {selectedBranch && !isDraft && (
        <NotificationOverrideModal
          visible={showBranchNotifications}
          onClose={() => setShowBranchNotifications(false)}
          scopeType="branch"
          scopeId={selectedBranch.id}
          scopeLabel={`${selectedBranch.emoji || ""} ${selectedBranch.name}`.trim()}
        />
      )}

      <View style={styles.searchWrapper}>
        <SearchBar
          key={selectedBranchId || "all"}
          placeholder={
            isBranchMode ? "Search your buds..." : "Search all users..."
          }
          onSearch={handleSearch}
        />
      </View>

      <View style={styles.countRow}>
        <Text style={styles.countText}>
          {selectedBranch
            ? `${selectedBranch.memberIds.length} bud${selectedBranch.memberIds.length !== 1 ? "s" : ""} in this branch`
            : `${visibleConnections.length} bud${visibleConnections.length !== 1 ? "s" : ""}`}
        </Text>
      </View>

      {isGlobalSearchMode ? (
        searching ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.brown500} size="large" />
          </View>
        ) : searchResults.length === 0 ? (
          <View style={styles.centered}>
            <Text style={styles.emptyText}>No users found</Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
          >
            {searchResults.map((user) => {
              const connection = connectedById.get(user.id);
              const isPending = pendingIds.has(user.id);
              const isRequesting = requestingIds.has(user.id);

              return (
                <View key={user.id} style={styles.card}>
                  <TouchableOpacity
                    style={styles.cardInfo}
                    onPress={() => router.push(`/(app)/user/${user.username}`)}
                  >
                    <ProfileImage
                      src={user.profile_img}
                      alt={user.display_name}
                      variant="small"
                    />
                    <Text style={styles.cardName} numberOfLines={1}>
                      {user.display_name || user.username}
                    </Text>
                  </TouchableOpacity>

                  {connection ? (
                    <Button
                      variant="clay"
                      size="small"
                      onPress={() => showRemoveBudModal(connection)}
                    >
                      remove bud
                    </Button>
                  ) : isPending ? (
                    <Button variant="gray" size="small" disabled>
                      requested
                    </Button>
                  ) : (
                    <Button
                      variant="lime"
                      size="small"
                      onPress={() => sendBudRequest(user.id)}
                      disabled={isRequesting}
                    >
                      {isRequesting ? "sending..." : "request bud"}
                    </Button>
                  )}
                </View>
              );
            })}
          </ScrollView>
        )
      ) : loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.brown500} size="large" />
        </View>
      ) : visibleConnections.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No buds found</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {visibleConnections.map((connection) => (
            <View key={connection.connection_id} style={styles.card}>
              <TouchableOpacity
                style={styles.cardInfo}
                onPress={() =>
                  router.push(`/(app)/user/${connection.username}`)
                }
              >
                <ProfileImage
                  src={connection.profile_img}
                  alt={connection.display_name}
                  variant="small"
                />
                <Text style={styles.cardName} numberOfLines={1}>
                  {connection.display_name}
                </Text>
              </TouchableOpacity>

              {selectedBranch ? (
                <TouchableOpacity
                  style={[
                    styles.checkShape,
                    selectedBranch.memberIds.includes(connection.user_id) &&
                      styles.checkShapeActive,
                  ]}
                  onPress={() =>
                    toggleBranchMember(
                      connection.user_id,
                      !selectedBranch.memberIds.includes(connection.user_id),
                    )
                  }
                >
                  {selectedBranch.memberIds.includes(connection.user_id) && (
                    <Text style={styles.checkMark}>✓</Text>
                  )}
                </TouchableOpacity>
              ) : (
                <Button
                  variant="clay"
                  size="small"
                  onPress={() => showRemoveBudModal(connection)}
                >
                  remove bud
                </Button>
              )}
            </View>
          ))}
        </ScrollView>
      )}

      {/* Remove confirmation modal */}
      {removeModalOpen && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Remove Bud?</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to remove{" "}
              {selectedBudToRemove?.display_name || ""} from your buds?
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => {
                  setRemoveModalOpen(false);
                  setSelectedBudToRemove(null);
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirm}
                onPress={confirmRemove}
                disabled={removing}
              >
                <Text style={styles.modalConfirmText}>
                  {removing ? "Removing..." : "Remove"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Discard unsaved new branch */}
      {discardModalOpen && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Discard new branch?</Text>
            <Text style={styles.modalMessage}>
              This branch hasn't been saved yet. If you leave now, it won't be
              created.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => {
                  pendingActionRef.current = null;
                  setDiscardModalOpen(false);
                }}
              >
                <Text style={styles.modalCancelText}>Keep editing</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirm}
                onPress={confirmDiscard}
              >
                <Text style={styles.modalConfirmText}>Discard</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Delete branch confirmation modal */}
      {deleteBranchModalOpen && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Delete branch?</Text>
            <Text style={styles.modalMessage}>
              This will remove the branch and its members.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setDeleteBranchModalOpen(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirm}
                onPress={deleteBranch}
                disabled={deletingBranch}
              >
                <Text style={styles.modalConfirmText}>
                  {deletingBranch ? "Deleting..." : "Delete"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 56,
    paddingHorizontal: spacing.screenHorizontal,
    paddingBottom: spacing.sm,
  },
  backText: {
    fontFamily: fonts.primary,
    fontSize: 16,
    color: colors.brown500,
  },
  branchOverrideWrapper: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.sm,
    alignItems: "flex-start",
  },
  branchNotificationsButton: {
    borderWidth: 1,
    borderColor: colors.brown200,
    borderRadius: 44,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
  },
  branchNotificationsText: {
    fontFamily: fonts.primary,
    fontSize: 13,
    color: colors.brown500,
  },
  branchEditRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.sm,
  },
  branchEmojiInput: {
    width: 48,
    height: 48,
    textAlign: "center",
    fontSize: 22,
    borderRadius: 24,
    backgroundColor: colors.white400,
  },
  branchNameInput: {
    flex: 1,
    height: 44,
    paddingHorizontal: spacing.md,
    borderRadius: 22,
    backgroundColor: colors.white400,
    fontFamily: fonts.primary,
    fontSize: 15,
    color: colors.brown900,
  },
  branchSaveButton: {
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderRadius: 22,
    backgroundColor: colors.lime500,
  },
  branchSaveButtonText: {
    fontFamily: fonts.primaryBold,
    fontSize: 13,
    color: colors.brown700,
  },
  branchDiscardButton: {
    paddingVertical: 10,
    paddingHorizontal: spacing.sm,
    borderRadius: 22,
  },
  branchDiscardButtonText: {
    fontFamily: fonts.primary,
    fontSize: 13,
    color: colors.brown300,
  },
  branchDeleteButton: {
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderRadius: 22,
    backgroundColor: colors.clay300,
  },
  branchDeleteButtonText: {
    fontFamily: fonts.primaryBold,
    fontSize: 13,
    color: colors.brown700,
  },
  checkShape: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.brown200,
    alignItems: "center",
    justifyContent: "center",
  },
  checkShapeActive: {
    backgroundColor: colors.lime300,
    borderColor: colors.lime300,
  },
  checkMark: {
    color: colors.white200,
    fontSize: 16,
    fontWeight: "700",
  },
  searchWrapper: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.md,
  },
  countRow: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingVertical: spacing.sm,
  },
  countText: {
    fontFamily: fonts.primaryBold,
    fontSize: 14,
    color: colors.brown500,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontFamily: fonts.primary,
    fontSize: 14,
    color: colors.green300,
  },
  list: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingBottom: 100,
    gap: spacing.sm,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    borderRadius: 16,
    paddingVertical: spacing.sm,
  },
  cardInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
    minWidth: 0,
  },
  cardName: {
    fontFamily: fonts.primary,
    fontSize: 16,
    color: colors.brown500,
    flexShrink: 1,
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  modalCard: {
    backgroundColor: colors.brown50,
    borderRadius: 24,
    padding: spacing.xl,
    width: "100%",
    gap: spacing.md,
  },
  modalTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 20,
    color: colors.brown900,
  },
  modalMessage: {
    fontFamily: fonts.primary,
    fontSize: 15,
    color: colors.brown500,
    lineHeight: 22,
  },
  modalActions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  modalCancel: {
    flex: 1,
    borderWidth: 2,
    borderColor: colors.brown300,
    borderRadius: 44,
    paddingVertical: 14,
    alignItems: "center",
  },
  modalCancelText: {
    fontFamily: fonts.primaryBold,
    fontSize: 14,
    color: colors.brown500,
  },
  modalConfirm: {
    flex: 1,
    backgroundColor: colors.clay500,
    borderRadius: 44,
    paddingVertical: 14,
    alignItems: "center",
  },
  modalConfirmText: {
    fontFamily: fonts.primaryBold,
    fontSize: 14,
    color: colors.white200,
  },
});
