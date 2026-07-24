/**
 * /remember — Manually commit facts, preferences, or lessons to pi-memory.
 *
 * With no args: opens an editor for the user to type what to remember.
 * With args: sends the text as a user message for the agent to process
 * using the memory_remember tool (guided by the remember skill).
 *
 * Uses the custom pi-memory extension (no external dependencies).
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  pi.registerCommand("remember", {
    description: "Manually commit facts, preferences, or lessons to memory",
    handler: async (args, ctx) => {
      const input = args?.trim();

      if (!input) {
        // Open editor for user to type what to remember
        const text = await ctx.ui.editor("Remember", {
          prompt: "What should I remember?\n\nExamples:\n  I prefer bun over npm for package management\n  Always use conventional commits\n  This project uses Dagger for dependency injection\n  Don't use echo >> for daily notes, use sed instead\n\nSave & close when done.",
          initialValue: "",
        });
        if (!text || !text.trim()) {
          ctx.ui.notify("Nothing to remember", "warning");
          return;
        }

        // Send as user message — the agent will use the remember skill
        // to call memory_remember with the appropriate type/key/value
        await ctx.sendUserMessage(`Remember this: ${text.trim()}`);
        return;
      }

      // Direct args — send as user message for agent to process
      await ctx.sendUserMessage(`Remember this: ${input}`);
    },
  });
}
