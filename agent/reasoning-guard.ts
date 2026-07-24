/**
 * Reasoning Loop Guardrail
 *
 * Prevents the agent from getting stuck in analysis/reasoning loops by
 * injecting a hard limit into the system prompt on every turn.
 *
 * Uses the before_agent_start hook to append guardrail text to the system prompt.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const GUARDRAIL = `
⚠️ REASONING LIMIT — DO NOT IGNORE:
You have a maximum of 3 reasoning steps per task. After 3 steps, you MUST act.
If you find yourself re-analyzing the same point, STOP and proceed with what you know.
When in doubt, choose the simplest path that makes progress. Never re-examine the same decision twice.
If you catch yourself going in circles, stop immediately and take the next concrete action.`;

export default function(pi: ExtensionAPI) {
  pi.on("before_agent_start", async (event) => {
    event.systemPrompt = event.systemPrompt + GUARDRAIL;
  });
}
