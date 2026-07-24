/**
 * pi-status — Minimal status bar for Pi
 *
 * Shows:
 * - Token progress: ████░░░░░░░░░░░░░░░░ 45K/262K (17%)
 * - Tokens/sec during generation: 12.3 tok/s
 *
 * Events listened to:
 *   agent_start / agent_end / agent_settled
 *   message_update / message_end
 *   model_select
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Container, Text } from "@earendil-works/pi-tui";

// ── State ──────────────────────────────────────────────────────────────────

const state = {
  agentActive: false,
  contextTokens: 0,
  contextWindow: 0,
  outputTokens: 0,
  modelId: "",
  // Tokens/sec tracking
  lastOutputTokens: 0,
  lastRateTime: 0,
  smoothedTps: 0,
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function progressBar(fraction: number, width: number): string {
  const filled = Math.round(fraction * width);
  const empty = width - filled;
  return "█".repeat(Math.max(0, filled)) + "░".repeat(Math.max(0, empty));
}

// Exponential moving average for smooth TPS
function smoothTps(current: number, prev: number, alpha: number = 0.15): number {
  return alpha * current + (1 - alpha) * prev;
}

// ── Widget ─────────────────────────────────────────────────────────────────

function createStatusWidget(tui: any, theme: any) {
  const container = new Container();
  let cachedContent = "";

  function rebuild(ui: any) {
    container.clear();
    const th = ui?.theme ?? theme;
    const barWidth = 20;

    if (state.contextWindow > 0) {
      const fraction = Math.min(state.contextTokens / state.contextWindow, 1);
      const pct = Math.round(fraction * 100);
      const bar = progressBar(fraction, barWidth);

      let line = th.fg("dim", `${bar} `);
      line += th.fg("dim", `${formatTokens(state.contextTokens)}/${formatTokens(state.contextWindow)} `);
      line += th.fg(pct > 90 ? "error" : pct > 75 ? "warning" : "dim", `(${pct}%)`);

      // Tokens/sec during generation
      if (state.agentActive && state.smoothedTps > 0.5) {
        line += `  `;
        line += th.fg("success", `${state.smoothedTps.toFixed(1)} tok/s`);
      }

      cachedContent = line;
    } else {
      cachedContent = th.fg("dim", "no model");
    }

    container.addChild(new Text(cachedContent, 1, 0));
  }

  rebuild(undefined);

  return {
    render: (width: number) => container.render(width),
    invalidate: (ui?: any) => {
      rebuild(ui);
      tui.requestRender();
    },
  };
}

// ── Extension ──────────────────────────────────────────────────────────────

export default function (pi: ExtensionAPI) {
  let invalidateFn: ((ui: any) => void) | undefined;
  let uiRef: any;

  // ── Agent lifecycle ────────────────────────────────────────────────────

  pi.on("agent_start", () => {
    state.agentActive = true;
    invalidateFn?.(uiRef);
  });

  pi.on("agent_end", () => {
    state.agentActive = false;
    invalidateFn?.(uiRef);
  });

  pi.on("agent_settled", () => {
    state.agentActive = false;
    invalidateFn?.(uiRef);
  });

  // ── Messages ───────────────────────────────────────────────────────────

  pi.on("message_update", (event: any) => {
    try {
      if (event.message?.role === "assistant") {
        // Get usage from the streaming partial (carries real-time token counts)
        const usage = event.assistantMessageEvent?.partial?.usage;
        if (usage && typeof usage.output === "number") {
          const now = Date.now();

          // Track output tokens for TPS calculation
          if (state.lastRateTime > 0 && usage.output > state.lastOutputTokens) {
            const dt = (now - state.lastRateTime) / 1000;
            if (dt > 0) {
              const rawTps = (usage.output - state.lastOutputTokens) / dt;
              state.smoothedTps = smoothTps(rawTps, state.smoothedTps);
            }
          }

          state.lastOutputTokens = usage.output;
          state.lastRateTime = now;
          state.outputTokens = usage.output;
        }

        invalidateFn?.(uiRef);
      }
    } catch {
      // Silently ignore — don't crash the agent loop
    }
  });

  pi.on("message_end", (event: any) => {
    try {
      if (event.message?.role === "assistant") {
        const usage = event.message.usage;
        if (usage && typeof usage.output === "number") {
          state.outputTokens = usage.output;
        }
        invalidateFn?.(uiRef);
      }
    } catch {
      // Silently ignore
    }
  });

  // ── Model / thinking changes ───────────────────────────────────────────

  pi.on("model_select", (event: any) => {
    try {
      state.modelId = `${event.model?.provider}/${event.model?.id}`;
      invalidateFn?.(uiRef);
    } catch {
      // Silently ignore
    }
  });

  // ── Register widget on session start ───────────────────────────────────

  let usageInterval: ReturnType<typeof setInterval> | null = null;

  pi.on("session_start", async (_event: any, ctx: any) => {
    try {
      // Get initial state
      if (ctx.model) {
        state.modelId = `${ctx.model.provider}/${ctx.model.id}`;
        state.contextWindow = ctx.model.contextWindow || 0;
      }

      // Store UI reference for theme access
      uiRef = ctx.ui;

      // Create widget inside the factory so it captures the real TUI (which owns
      // requestRender); ctx.ui is the ExtensionUIContext and has no requestRender.
      ctx.ui.setWidget("pi-status", (tui: any, theme: any) => {
        const widget = createStatusWidget(tui, theme);
        invalidateFn = widget.invalidate.bind(widget);
        return widget;
      }, { placement: "belowEditor" });

      // Poll context usage every 500ms to keep token count fresh
      if (usageInterval) clearInterval(usageInterval);
      usageInterval = setInterval(() => {
        try {
          const usage = ctx.getContextUsage?.();
          if (usage && usage.tokens !== null) {
            state.contextTokens = usage.tokens;
            if (usage.contextWindow) {
              state.contextWindow = usage.contextWindow;
            }
            invalidateFn?.(uiRef);
          }
        } catch {
          // ctx is stale (session replaced) — interval will be cleared on next session_start
        }
      }, 500);
    } catch {
      // Silently ignore session_start failures
    }
  });

  // ── Toggle command ─────────────────────────────────────────────────────

  let widgetVisible = true;

  pi.registerCommand("status", {
    description: "Toggle pi-status bar visibility",
    handler: async (_args: any, ctx: any) => {
      if (widgetVisible) {
        ctx.ui.setWidget("pi-status", undefined);
        widgetVisible = false;
        ctx.ui.notify("Status bar hidden", "info");
      } else {
        uiRef = ctx.ui;
        ctx.ui.setWidget("pi-status", (tui: any, theme: any) => {
          const widget = createStatusWidget(tui, theme);
          invalidateFn = widget.invalidate.bind(widget);
          return widget;
        }, { placement: "belowEditor" });
        widgetVisible = true;
        ctx.ui.notify("Status bar shown", "info");
      }
    },
  });
}
