import type { AgentState } from "./types";
import type { FeedEvent } from "./feed";

/**
 * Resolve a feed event to the AgentState it belongs to.
 *
 * Three matching strategies, in priority order:
 * 1. Worktree match — projects ending in `wt-N-<name>` resolve to a window named
 *    `<oracle>-<name>`. NEVER falls back (prevents cross-contamination between
 *    main and worktree windows).
 * 2. Oracle-name match — tries `<oracle>-oracle` first (legacy convention),
 *    then `<oracle>` as-is.
 * 3. Project fallback — if #1 and #2 fail AND event has a project, match
 *    against `agent.project` (cwd basename / `wt:` prefix). This handles
 *    cases where the tmux window name doesn't match the oracle name but
 *    shares the same project directory.
 *
 * Cross-pane collision on project match returns the first match (deterministic).
 *
 * Pure function — no React hooks, no refs — for testability.
 */
export function matchAgentToEvent(
  event: Pick<FeedEvent, "oracle"> & { project?: string },
  agents: AgentState[],
): AgentState | undefined {
  const { oracle, project } = event;

  // 1. Worktree match — no fallback for worktrees
  const wtMatch = project?.match(/[.-]wt-(?:\d+-)?(.+)$/);
  if (wtMatch) {
    const windowName = `${oracle}-${wtMatch[1]}`.toLowerCase();
    return agents.find(a => a.name.toLowerCase() === windowName);
  }

  // 2. Oracle-name match — try with and without "-oracle" suffix
  const oracleLower = oracle.toLowerCase();
  const oracleMain = oracleLower.endsWith("-oracle")
    ? oracleLower
    : `${oracleLower}-oracle`;
  const byName =
    agents.find(a => a.name.toLowerCase() === oracleMain) ??
    agents.find(a => a.name.toLowerCase() === oracleLower);
  if (byName) return byName;

  // 3. Project fallback (case-insensitive) — first match wins.
  // event.project is a full path like "/Users/zic/.../zic-manga-app"; agent.project
  // is the cwd basename ("zic-manga-app"). Normalize both to basename before comparing.
  if (project) {
    const basename = project.includes("/") ? project.split("/").pop()! : project;
    const basenameLower = basename.toLowerCase();
    return agents.find(a => a.project?.toLowerCase() === basenameLower);
  }

  return undefined;
}
