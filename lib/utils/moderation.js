// Reports + blocks. Both write straight to Supabase under RLS (same
// direct-supabase pattern as profile reads) — no SvelteKit endpoint needed
// to file a report or a block. What the API *is* responsible for is
// honoring blocks server-side: filtering both directions out of the feed,
// comments, reactions, requests, and contact matching. See
// docs/supabase-moderation.sql.

export const REPORT_REASONS = [
  "Spam",
  "Harassment or bullying",
  "Hate or violence",
  "Nudity or sexual content",
  "Something else",
];

/**
 * File a report. targetType: 'post' | 'comment' | 'user'.
 */
export async function submitReport(
  supabase,
  { reporterId, targetType, targetId, reason },
) {
  const { error } = await supabase.from("reports").insert({
    reporter_id: reporterId,
    target_type: targetType,
    target_id: targetId,
    reason,
  });
  if (error) throw error;
}

/**
 * Block a user. Upsert so re-blocking someone already blocked isn't an
 * error (e.g. blocked from a post card, then again from their profile).
 */
export async function blockUser(supabase, blockerId, blockedId) {
  const { error } = await supabase
    .from("user_blocks")
    .upsert(
      { blocker_id: blockerId, blocked_id: blockedId },
      { onConflict: "blocker_id,blocked_id" },
    );
  if (error) throw error;
}

export async function unblockUser(supabase, blockerId, blockedId) {
  const { error } = await supabase
    .from("user_blocks")
    .delete()
    .eq("blocker_id", blockerId)
    .eq("blocked_id", blockedId);
  if (error) throw error;
}

/**
 * The viewer's block list with joined profiles, newest first, for the
 * Blocked Users settings screen.
 */
export async function fetchBlockedProfiles(supabase, blockerId) {
  const { data, error } = await supabase
    .from("user_blocks")
    .select(
      "blocked_id, created_at, profile:profiles!user_blocks_blocked_id_fkey(id, username, display_name, profile_img)",
    )
    .eq("blocker_id", blockerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}
