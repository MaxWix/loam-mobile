import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
  PanResponder,
  LayoutAnimation,
  UIManager,
  Platform,
  Modal,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import BranchButton from "./BranchButton";
import { colors, fonts, spacing } from "../theme";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimentalAndroid
) {
  UIManager.setLayoutAnimationEnabledExperimentalAndroid(true);
}

const ORDER_STORAGE_KEY = "loam:branch_order";
const CHIP_WIDTH = 64; // BranchButton's fixed container width
const ITEM_STRIDE = CHIP_WIDTH + spacing.md; // + marginRight between chips
const LONG_PRESS_MS = 450;
const DRAG_THRESHOLD = 6; // px of movement before treating a touch as a drag, not a tap

// One draggable/deletable branch chip. This view is the *only* interactive
// surface for the chip — BranchButton is rendered with disableTouch so
// there's no nested TouchableOpacity competing with this PanResponder for
// gesture ownership, which was the root cause of taps/drags not working
// in the previous version.
//
// Gesture outcomes:
//   tap, not in edit mode        -> select this branch
//   tap, in edit mode            -> request delete for this branch
//   press-and-hold (no movement) -> enter edit mode
//   drag, in edit mode           -> live reorder
function DraggableBranchChip({
  branch,
  index,
  orderLength,
  editMode,
  isSelected,
  onSelect,
  onEnterEditMode,
  onReorderLive,
  onRequestDelete,
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const longPressTimer = useRef(null);
  const movedRef = useRef(false);
  // Tracks whether THIS specific press-down is the one whose long-press
  // timer just flipped edit mode on. Without this, releasing that same
  // long-press (finger never moved) would immediately be read as "a tap
  // while in edit mode" and delete the chip you just long-pressed.
  const justEnteredEditModeRef = useRef(false);
  // The g.dx value at the moment of the last live-reorder swap. Movement
  // is measured relative to this, not from the start of the whole drag —
  // otherwise, once a swap moves the chip to a new slot, the old
  // cumulative offset would stack on top of that new position and the
  // chip would visually overshoot past your finger.
  const baseDxRef = useRef(0);

  // The PanResponder below is created exactly once via useRef, so its
  // handlers would otherwise permanently close over whatever these values
  // were on the very first render. Mirror everything that changes over
  // time into refs and read `.current` inside the handlers.
  const indexRef = useRef(index);
  const editModeRef = useRef(editMode);
  const orderLengthRef = useRef(orderLength);
  const onReorderLiveRef = useRef(onReorderLive);
  const onSelectRef = useRef(onSelect);
  const onEnterEditModeRef = useRef(onEnterEditMode);
  const onRequestDeleteRef = useRef(onRequestDelete);
  const branchRef = useRef(branch);

  useEffect(() => {
    indexRef.current = index;
  }, [index]);
  useEffect(() => {
    editModeRef.current = editMode;
  }, [editMode]);
  useEffect(() => {
    orderLengthRef.current = orderLength;
  }, [orderLength]);
  useEffect(() => {
    onReorderLiveRef.current = onReorderLive;
  }, [onReorderLive]);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);
  useEffect(() => {
    onEnterEditModeRef.current = onEnterEditMode;
  }, [onEnterEditMode]);
  useEffect(() => {
    onRequestDeleteRef.current = onRequestDelete;
  }, [onRequestDelete]);
  useEffect(() => {
    branchRef.current = branch;
  }, [branch]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: () => {
        movedRef.current = false;
        justEnteredEditModeRef.current = false;
        baseDxRef.current = 0;
        if (!editModeRef.current) {
          longPressTimer.current = setTimeout(() => {
            justEnteredEditModeRef.current = true;
            onEnterEditModeRef.current();
          }, LONG_PRESS_MS);
        }
      },

      onPanResponderMove: (_, g) => {
        if (
          Math.abs(g.dx) > DRAG_THRESHOLD ||
          Math.abs(g.dy) > DRAG_THRESHOLD
        ) {
          movedRef.current = true;
          if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
          }
        }
        if (!editModeRef.current) return;

        const visualOffset = g.dx - baseDxRef.current;
        translateX.setValue(visualOffset);

        const shift = Math.round(visualOffset / ITEM_STRIDE);
        if (shift === 0) return;
        const targetIndex = Math.max(
          0,
          Math.min(orderLengthRef.current - 1, indexRef.current + shift),
        );
        if (targetIndex !== indexRef.current) {
          onReorderLiveRef.current(indexRef.current, targetIndex);
          // Rebase: the chip's rendered slot is about to jump to its new
          // position, so reset the offset baseline to "here" rather than
          // letting the old displacement keep applying on top of it.
          baseDxRef.current = g.dx;
          translateX.setValue(0);
        }
      },

      onPanResponderRelease: () => {
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          tension: 200,
          friction: 20,
        }).start();

        if (!movedRef.current && !justEnteredEditModeRef.current) {
          if (editModeRef.current) {
            onRequestDeleteRef.current(branchRef.current);
          } else {
            onSelectRef.current();
          }
        }
      },

      onPanResponderTerminate: () => {
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
        Animated.timing(translateX, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }).start();
      },
    }),
  ).current;

  return (
    <Animated.View
      style={[
        styles.branchItem,
        { transform: [{ translateX }] },
        editMode && styles.branchItemJiggling,
      ]}
      {...panResponder.panHandlers}
    >
      <BranchButton branch={branch} isSelected={isSelected} disableTouch />
      {editMode && (
        // Purely decorative — no onPress of its own. Deleting is
        // triggered by tapping anywhere on the chip while in edit mode
        // (handled above in onPanResponderRelease), which avoids nesting
        // a second touchable inside this PanResponder's view.
        <View style={styles.minusBadge} pointerEvents="none">
          <Text style={styles.minusBadgeText}>–</Text>
        </View>
      )}
    </Animated.View>
  );
}

export default function BranchSelector({
  branches,
  selectedBranchId,
  onSelectBranch,
  onAddBranch,
  onDeleteBranch,
  allBudsIcon: AllBudsIcon,
}) {
  const [order, setOrder] = useState([]); // array of branch ids, in display order
  const [editMode, setEditMode] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // branch pending confirm
  const [deleting, setDeleting] = useState(false);

  // Reconcile the persisted order with whatever branches currently exist:
  // keep stored ids that are still around (in their stored order), then
  // append any new ones at the end. Runs whenever the branch list itself
  // changes (create/delete/refetch) — not on every render.
  useEffect(() => {
    (async () => {
      const ids = branches.map((b) => b.id);
      let stored = [];
      try {
        const raw = await AsyncStorage.getItem(ORDER_STORAGE_KEY);
        stored = raw ? JSON.parse(raw) : [];
      } catch (e) {
        stored = [];
      }
      const kept = stored.filter((id) => ids.includes(id));
      const added = ids.filter((id) => !kept.includes(id));
      setOrder([...kept, ...added]);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branches.map((b) => b.id).join(",")]);

  const persistOrder = useCallback((nextOrder) => {
    AsyncStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(nextOrder)).catch(
      () => {},
    );
  }, []);

  const handleReorderLive = useCallback(
    (fromIndex, toIndex) => {
      setOrder((prev) => {
        if (fromIndex === toIndex) return prev;
        const next = [...prev];
        const [moved] = next.splice(fromIndex, 1);
        next.splice(toIndex, 0, moved);
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        persistOrder(next);
        return next;
      });
    },
    [persistOrder],
  );

  const orderedBranches = order
    .map((id) => branches.find((b) => b.id === id))
    .filter(Boolean);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await onDeleteBranch(deleteTarget.id);
      setOrder((prev) => {
        const next = prev.filter((id) => id !== deleteTarget.id);
        persistOrder(next);
        return next;
      });
    } catch (e) {
      // Parent already surfaces its own error to the user — leave the
      // chip in place here so local state doesn't drift from reality.
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEnabled={!editMode}
        contentContainerStyle={styles.row}
      >
        {/* All buds — never draggable, never deletable, always a plain
            tap target regardless of edit mode. */}
        <View style={styles.branchItem}>
          <BranchButton
            branch={{ id: "all", name: "all buds", color: "B6AFA3" }}
            icon={AllBudsIcon}
            isSelected={!selectedBranchId}
            onPress={() => onSelectBranch(null)}
          />
        </View>

        {orderedBranches.map((branch, index) => (
          <DraggableBranchChip
            key={branch.id}
            branch={branch}
            index={index}
            orderLength={order.length}
            editMode={editMode}
            isSelected={selectedBranchId === branch.id}
            onSelect={() => onSelectBranch(branch.id)}
            onEnterEditMode={() => setEditMode(true)}
            onReorderLive={handleReorderLive}
            onRequestDelete={setDeleteTarget}
          />
        ))}

        {/* Add — hidden while in edit mode */}
        {!editMode && (
          <View style={styles.branchItem}>
            <BranchButton isAdd onPress={onAddBranch} />
          </View>
        )}
      </ScrollView>

      {editMode && (
        <TouchableOpacity
          style={styles.doneRow}
          onPress={() => setEditMode(false)}
        >
          <Text style={styles.doneText}>Done</Text>
        </TouchableOpacity>
      )}

      {/* Delete confirmation */}
      <Modal
        visible={!!deleteTarget}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteTarget(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              Delete "{deleteTarget?.name}"?
            </Text>
            <Text style={styles.modalMessage}>
              This will remove the branch and its members. This can't be undone.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setDeleteTarget(null)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirm}
                onPress={confirmDelete}
                disabled={deleting}
              >
                <Text style={styles.modalConfirmText}>
                  {deleting ? "Deleting..." : "Delete"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  branchItem: {
    marginRight: spacing.md,
    position: "relative",
  },
  branchItemJiggling: {
    // Subtle "you're in edit mode now" affordance — intentionally not a
    // full iOS-style wiggle animation, to keep this dependency-free.
    opacity: 0.92,
  },
  minusBadge: {
    position: "absolute",
    top: -6,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.clay500,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.white200,
  },
  minusBadgeText: {
    color: colors.white200,
    fontSize: 16,
    fontFamily: fonts.primaryBold,
    lineHeight: 18,
  },
  doneRow: {
    alignItems: "flex-end",
    paddingHorizontal: spacing.screenHorizontal,
    paddingBottom: spacing.sm,
  },
  doneText: {
    fontFamily: fonts.primaryBold,
    fontSize: 14,
    color: colors.brown500,
  },
  modalOverlay: {
    flex: 1,
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
    maxWidth: 340,
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
