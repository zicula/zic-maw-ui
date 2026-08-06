import { describe, test, expect, beforeEach } from "bun:test";
import { useFeedStatusStore, type AgentSnapshot } from "./feedStatusStore";
import type { PaneStatus } from "./types";

function snap(oracle: string, status: PaneStatus = "busy"): AgentSnapshot {
  return {
    oracle,
    status,
    updatedAt: Date.now(),
    sessionId: "s",
    project: "p",
    lastEvent: "PreToolUse",
  };
}

describe("useFeedStatusStore — agent snapshots (external agents)", () => {
  beforeEach(() => {
    useFeedStatusStore.setState({ agentStatuses: {} });
  });

  test("setAgentSnapshot adds entry under oracle key", () => {
    useFeedStatusStore.getState().setAgentSnapshot(snap("neo"));
    const entry = useFeedStatusStore.getState().agentStatuses.neo;
    expect(entry).toBeDefined();
    expect(entry.status).toBe("busy");
    expect(entry.lastEvent).toBe("PreToolUse");
  });

  test("setAgentSnapshot replaces existing entry for same oracle", () => {
    useFeedStatusStore.getState().setAgentSnapshot(snap("neo", "busy"));
    useFeedStatusStore.getState().setAgentSnapshot(snap("neo", "ready"));
    const entry = useFeedStatusStore.getState().agentStatuses.neo;
    expect(entry.status).toBe("ready");
  });

  test("setAgentSnapshots bulk replaces — prior entries cleared", () => {
    useFeedStatusStore.getState().setAgentSnapshot(snap("neo"));
    useFeedStatusStore.getState().setAgentSnapshot(snap("morpheus"));
    useFeedStatusStore.getState().setAgentSnapshots([snap("trinity")]);
    const keys = Object.keys(useFeedStatusStore.getState().agentStatuses).sort();
    expect(keys).toEqual(["trinity"]);
  });

  test("setAgentSnapshots with empty array clears all entries", () => {
    useFeedStatusStore.getState().setAgentSnapshot(snap("neo"));
    useFeedStatusStore.getState().setAgentSnapshot(snap("morpheus"));
    useFeedStatusStore.getState().setAgentSnapshots([]);
    expect(Object.keys(useFeedStatusStore.getState().agentStatuses)).toEqual([]);
  });

  test("removeAgentSnapshot deletes entry", () => {
    useFeedStatusStore.getState().setAgentSnapshot(snap("neo"));
    useFeedStatusStore.getState().removeAgentSnapshot("neo");
    expect(useFeedStatusStore.getState().agentStatuses.neo).toBeUndefined();
  });

  test("removeAgentSnapshot on missing oracle is a no-op", () => {
    useFeedStatusStore.getState().setAgentSnapshot(snap("neo"));
    useFeedStatusStore.getState().removeAgentSnapshot("ghost");
    expect(useFeedStatusStore.getState().agentStatuses.neo).toBeDefined();
  });

  test("getAgentSnapshot returns snapshot for known oracle", () => {
    useFeedStatusStore.getState().setAgentSnapshot(snap("neo", "idle"));
    expect(useFeedStatusStore.getState().getAgentSnapshot("neo")?.status).toBe("idle");
  });

  test("getAgentSnapshot returns undefined for unknown oracle", () => {
    expect(useFeedStatusStore.getState().getAgentSnapshot("ghost")).toBeUndefined();
  });
});
