import type { AskType } from "./types";
import type { FeedEvent } from "./feed";

/**
 * Which Claude Code notifications are a request aimed at a human.
 *
 * `notification_type` is a closed enum the agent sends verbatim, so it is what
 * the Inbox classifies on. The message text beside it is English prose that
 * changes between releases — matching on that is how the Inbox stayed empty
 * even for agents that were plainly blocked.
 *
 * Types deliberately absent (they report state, they do not ask for anything):
 * agent_completed, auth_success, computer_use_enter/exit, elicitation_*,
 * push_notification. Adding them would turn the Inbox into a log.
 */
const TYPE_TO_ASK: Record<string, AskType> = {
  agent_needs_input: "input",
  worker_permission_prompt: "plan",
  idle_prompt: "attention",
};

/**
 * Fallback for feeds produced before the reporter forwarded notification_type
 * (and for any sender that only has the prose). Order matters: "approval" is
 * checked before the looser "attention" so an approval request is not
 * downgraded.
 */
function classifyByMessage(message: string): AskType | null {
  const msg = message.toLowerCase();
  if (msg.includes("waiting for your input") || msg.includes("waiting for input")) return "input";
  if (msg.includes("needs your approval") || msg.includes("approval")) return "plan";
  if (msg.includes("needs your attention") || msg.includes("attention")) return "attention";
  return null;
}

/**
 * Classify a Notification feed event into the kind of ask it represents,
 * or null when it is not asking a human for anything.
 *
 * Pure function — no store access, no hooks — for testability.
 */
export function classifyNotification(
  event: Pick<FeedEvent, "event" | "message" | "data">,
): AskType | null {
  if (event.event !== "Notification") return null;

  const notificationType = event.data?.notificationType;
  if (notificationType) {
    // A known type classifies; an unknown one is a deliberate "not an ask",
    // NOT a reason to fall back to guessing at the prose.
    return TYPE_TO_ASK[notificationType] ?? null;
  }

  return classifyByMessage(event.message || "");
}
