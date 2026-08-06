import { create } from "zustand";
import type { PaneStatus } from "./types";

/**
 * Snapshot of a single agent's status as reported by the server.
 * Keyed by oracle name (not tmux target) so external agents without a pane
 * can still carry status. Mirrors server `AgentStatusEntry`.
 */
export interface AgentSnapshot {
  oracle: string;
  status: PaneStatus;
  updatedAt: number;
  sessionId: string;
  project: string;
  /** Last event that caused this status */
  lastEvent: string;
}

interface FeedStatusStore {
  /** target → PaneStatus (legacy tmux-pane-keyed map) */
  statuses: Record<string, PaneStatus>;
  setStatus: (target: string, status: PaneStatus) => void;
  getStatus: (target: string) => PaneStatus;
  /** oracle → AgentSnapshot (server-pushed, includes external agents) */
  agentStatuses: Record<string, AgentSnapshot>;
  setAgentSnapshot: (snapshot: AgentSnapshot) => void;
  /** Bulk replace — server snapshot is authoritative, replace not merge */
  setAgentSnapshots: (snapshots: AgentSnapshot[]) => void;
  removeAgentSnapshot: (oracle: string) => void;
  getAgentSnapshot: (oracle: string) => AgentSnapshot | undefined;
}

export const useFeedStatusStore = create<FeedStatusStore>()((set, get) => ({
  statuses: {},
  setStatus: (target, status) => set((s) => {
    if (s.statuses[target] === status) return s;
    return { statuses: { ...s.statuses, [target]: status } };
  }),
  getStatus: (target) => get().statuses[target] || "idle",

  // External-agent snapshot map (mirrors server `agentStatusStore`).
  agentStatuses: {},
  setAgentSnapshot: (snapshot) => set((s) => ({
    agentStatuses: { ...s.agentStatuses, [snapshot.oracle]: snapshot },
  })),
  setAgentSnapshots: (snapshots) => set(() => {
    const next: Record<string, AgentSnapshot> = {};
    for (const snap of snapshots) next[snap.oracle] = snap;
    return { agentStatuses: next };
  }),
  removeAgentSnapshot: (oracle) => set((s) => {
    if (!(oracle in s.agentStatuses)) return s;
    const next = { ...s.agentStatuses };
    delete next[oracle];
    return { agentStatuses: next };
  }),
  getAgentSnapshot: (oracle) => get().agentStatuses[oracle],
}));

/** Hook: subscribe to a single agent's status (no re-render from other agents) */
export function useAgentStatus(target: string): PaneStatus {
  return useFeedStatusStore((s) => s.statuses[target] || "idle");
}

/** Hook: get live status for an agent object (replaces stale agent.status) */
export function useLiveStatus(agent: { target: string }): PaneStatus {
  return useFeedStatusStore((s) => s.statuses[agent.target] || "idle");
}

/** Hook: subscribe to ALL statuses — use for aggregate counts (dashboard, fleet) */
export function useAllStatuses(): Record<string, PaneStatus> {
  return useFeedStatusStore((s) => s.statuses);
}

/** Hook: get all external-agent snapshots (oracle-keyed) */
export function useAgentSnapshots(): Record<string, AgentSnapshot> {
  return useFeedStatusStore((s) => s.agentStatuses);
}
