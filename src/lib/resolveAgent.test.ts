import { describe, test, expect } from "bun:test";
import { matchAgentToEvent } from "./resolveAgent";
import type { AgentState } from "./types";

function makeAgent(overrides: Partial<AgentState>): AgentState {
  return {
    target: "tmux:1.0",
    name: "main",
    session: "s",
    windowIndex: 0,
    active: false,
    preview: "",
    status: "ready",
    project: "main",
    source: "local",
    ...overrides,
  };
}

function makeEvent(oracle: string, project?: string) {
  return { oracle, project };
}

describe("matchAgentToEvent", () => {
  test("worktree match — finds agent with <oracle>-<leaf>", () => {
    // regex extracts leaf after `.wt-N-`, so windowName = "zic-manga-app-feature"
    const agents = [makeAgent({ name: "zic-manga-app-feature" })];
    expect(matchAgentToEvent(makeEvent("zic-manga-app", "/p/zic-manga-app.wt-1-feature"), agents))
      .toBe(agents[0]);
  });

  test("worktree match with numeric prefix — strips wt-N- correctly", () => {
    const agents = [makeAgent({ name: "zic-manga-app-name" })];
    expect(matchAgentToEvent(makeEvent("zic-manga-app", "/p/zic-manga-app.wt-7-name"), agents))
      .toBe(agents[0]);
  });

  test("worktree no-match returns undefined (no fallback)", () => {
    const agents = [makeAgent({ name: "zic-manga-app", project: "zic-manga-app" })];
    // Event has worktree pattern but no agent matches "zic-manga-app-orphan"
    expect(matchAgentToEvent(makeEvent("zic-manga-app", "/p/zic-manga-app.wt-1-orphan"), agents))
      .toBeUndefined();
  });

  test("oracle-name match with -oracle suffix", () => {
    const agents = [makeAgent({ name: "zic-manga-app-oracle" })];
    expect(matchAgentToEvent(makeEvent("zic-manga-app", "/p"), agents))
      .toBe(agents[0]);
  });

  test("oracle-name match without -oracle suffix", () => {
    const agents = [makeAgent({ name: "zic-manga-app" })];
    expect(matchAgentToEvent(makeEvent("zic-manga-app", "/p"), agents))
      .toBe(agents[0]);
  });

  test("project fallback — finds agent by matching project field", () => {
    // The bug case: oracle=unnamed-zic-manga-app, window=zic-manga-app (no oracle suffix)
    // Oracle-name match fails, project fallback succeeds.
    const agents = [makeAgent({ name: "zic-manga-app", project: "zic-manga-app" })];
    expect(matchAgentToEvent(makeEvent("unnamed-zic-manga-app", "/p/zic-manga-app"), agents))
      .toBe(agents[0]);
  });

  test("project fallback — case-insensitive match", () => {
    const agents = [makeAgent({ name: "Zic-Manga-App", project: "Zic-Manga-App" })];
    expect(matchAgentToEvent(makeEvent("unnamed-something", "/p/zic-manga-app"), agents))
      .toBe(agents[0]);
  });

  test("project fallback — no project on event returns undefined", () => {
    const agents = [makeAgent({ name: "x", project: "zic-manga-app" })];
    expect(matchAgentToEvent(makeEvent("anything", undefined), agents))
      .toBeUndefined();
  });

  test("project fallback — no matching agent returns undefined", () => {
    const agents = [makeAgent({ name: "x", project: "other-project" })];
    expect(matchAgentToEvent(makeEvent("anything", "/p/zic-manga-app"), agents))
      .toBeUndefined();
  });

  test("empty agents array returns undefined", () => {
    expect(matchAgentToEvent(makeEvent("anything", "/p/zic-manga-app"), []))
      .toBeUndefined();
  });

  test("cross-pane collision — first match wins (deterministic)", () => {
    const a1 = makeAgent({ name: "window-1", project: "shared" });
    const a2 = makeAgent({ name: "window-2", project: "shared" });
    expect(matchAgentToEvent(makeEvent("anything", "/p/shared"), [a1, a2]))
      .toBe(a1);
  });

  test("oracle-name preferred over project fallback", () => {
    const byName = makeAgent({ name: "my-oracle", project: "other" });
    const byProject = makeAgent({ name: "unrelated", project: "target" });
    // oracle-name match on "my-oracle" should win over project "target"
    expect(matchAgentToEvent(makeEvent("my-oracle", "/p/target"), [byProject, byName]))
      .toBe(byName);
  });
});
