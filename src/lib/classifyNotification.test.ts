import { describe, test, expect } from "bun:test";
import { classifyNotification } from "./classifyNotification";
import type { FeedEvent } from "./feed";

function ev(
  overrides: Partial<Pick<FeedEvent, "event" | "message" | "data">> = {},
): Pick<FeedEvent, "event" | "message" | "data"> {
  return { event: "Notification", message: "", ...overrides };
}

describe("classifyNotification — notification_type (preferred)", () => {
  test("agent_needs_input → input", () => {
    expect(classifyNotification(ev({ data: { notificationType: "agent_needs_input" } })))
      .toBe("input");
  });

  test("worker_permission_prompt → plan", () => {
    expect(classifyNotification(ev({ data: { notificationType: "worker_permission_prompt" } })))
      .toBe("plan");
  });

  test("idle_prompt → attention", () => {
    expect(classifyNotification(ev({ data: { notificationType: "idle_prompt" } })))
      .toBe("attention");
  });

  test("agent_completed → null (reports state, asks nothing)", () => {
    expect(classifyNotification(ev({ data: { notificationType: "agent_completed" } })))
      .toBeNull();
  });

  test("unknown type → null, does NOT fall back to prose matching", () => {
    // The prose would match "approval", but an explicit type is authoritative:
    // a future non-ask type must not be smuggled into the Inbox by its wording.
    expect(classifyNotification(ev({
      data: { notificationType: "some_future_status" },
      message: "needs your approval",
    }))).toBeNull();
  });

  test("type wins over contradicting prose", () => {
    expect(classifyNotification(ev({
      data: { notificationType: "agent_needs_input" },
      message: "needs your approval",
    }))).toBe("input");
  });
});

describe("classifyNotification — message fallback (legacy feeds)", () => {
  test("'waiting for your input' → input", () => {
    expect(classifyNotification(ev({ message: "Claude is waiting for your input" })))
      .toBe("input");
  });

  test("'waiting for input' → input", () => {
    expect(classifyNotification(ev({ message: "waiting for input" })))
      .toBe("input");
  });

  test("'needs your approval' → plan", () => {
    expect(classifyNotification(ev({ message: "Claude needs your approval" })))
      .toBe("plan");
  });

  test("'needs your attention' → attention", () => {
    expect(classifyNotification(ev({ message: "Claude needs your attention" })))
      .toBe("attention");
  });

  test("approval is checked before attention (not downgraded)", () => {
    expect(classifyNotification(ev({ message: "needs your attention for approval" })))
      .toBe("plan");
  });

  test("unrelated prose → null", () => {
    expect(classifyNotification(ev({ message: "build finished successfully" })))
      .toBeNull();
  });

  test("empty message → null", () => {
    expect(classifyNotification(ev({ message: "" }))).toBeNull();
  });

  test("empty data object falls through to prose", () => {
    expect(classifyNotification(ev({ data: {}, message: "waiting for your input" })))
      .toBe("input");
  });
});

describe("classifyNotification — non-Notification events", () => {
  test("Stop event → null even with matching prose", () => {
    expect(classifyNotification({
      event: "Stop",
      message: "waiting for your input",
    })).toBeNull();
  });

  test("PreToolUse → null even with a notification type", () => {
    expect(classifyNotification({
      event: "PreToolUse",
      message: "",
      data: { notificationType: "agent_needs_input" },
    })).toBeNull();
  });
});
