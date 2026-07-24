/**
 * Time Extension
 *
 * Native replacement for the `mcp-server-time` MCP server (removes a `uvx`
 * install). Gives the agent current time in any IANA timezone and simple
 * timezone conversion, using only the built-in Intl API.
 *
 * Tools:
 *   get_current_time  — current time in a given timezone
 *   convert_time      — convert a time between two timezones
 *
 * Zero external dependencies.
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const LOCAL_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

function partsInTz(date: Date, timeZone: string): Record<string, string> {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    weekday: "short",
    timeZoneName: "short",
  });
  const out: Record<string, string> = {};
  for (const p of fmt.formatToParts(date)) out[p.type] = p.value;
  return out;
}

function describe(date: Date, timeZone: string): string {
  const p = partsInTz(date, timeZone);
  const hour = p.hour === "24" ? "00" : p.hour;
  return `${p.year}-${p.month}-${p.day} ${hour}:${p.minute}:${p.second} ${p.weekday} (${p.timeZoneName}) [${timeZone}]`;
}

/** Validate a timezone by attempting to format with it. */
function validTz(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export default function timeExtension(pi: ExtensionAPI) {
  pi.registerTool({
    name: "get_current_time",
    label: "Current Time",
    description:
      "Get the current date and time in a given IANA timezone (e.g. 'America/New_York', 'Asia/Tokyo', 'UTC'). Defaults to the local timezone.",
    promptSnippet: "Use get_current_time to get the current time in any timezone.",
    parameters: {
      type: "object",
      properties: {
        timezone: {
          type: "string",
          description: `IANA timezone name. Defaults to local (${LOCAL_TZ}).`,
        },
      },
      required: [],
    },
    async execute(_id, params) {
      const tz = ((params.timezone as string) || LOCAL_TZ).trim();
      if (!validTz(tz)) {
        return {
          content: [{ type: "text", text: `Unknown timezone: "${tz}". Use an IANA name like "America/New_York".` }],
          details: { tool: "get_current_time", error: "invalid_timezone" },
          isError: true,
        };
      }
      const now = new Date();
      return {
        content: [{ type: "text", text: describe(now, tz) }],
        details: { tool: "get_current_time", timezone: tz, iso: now.toISOString(), epochMs: now.getTime() },
      };
    },
  });

  pi.registerTool({
    name: "convert_time",
    label: "Convert Time",
    description:
      "Show the current instant (or a given ISO timestamp) in two timezones side by side. Useful for scheduling across regions.",
    promptSnippet: "Use convert_time to compare a time across two timezones.",
    parameters: {
      type: "object",
      properties: {
        from: { type: "string", description: "Source IANA timezone (e.g. 'America/Los_Angeles')." },
        to: { type: "string", description: "Target IANA timezone (e.g. 'Europe/London')." },
        time: { type: "string", description: "Optional ISO-8601 timestamp. Defaults to now." },
      },
      required: ["from", "to"],
    },
    async execute(_id, params) {
      const from = (params.from as string).trim();
      const to = (params.to as string).trim();
      for (const [label, tz] of [["from", from], ["to", to]] as const) {
        if (!validTz(tz)) {
          return {
            content: [{ type: "text", text: `Unknown ${label} timezone: "${tz}".` }],
            details: { tool: "convert_time", error: "invalid_timezone" },
            isError: true,
          };
        }
      }
      const raw = (params.time as string)?.trim();
      const date = raw ? new Date(raw) : new Date();
      if (Number.isNaN(date.getTime())) {
        return {
          content: [{ type: "text", text: `Invalid time: "${raw}". Use an ISO-8601 timestamp.` }],
          details: { tool: "convert_time", error: "invalid_time" },
          isError: true,
        };
      }
      const text = `${describe(date, from)}\n= ${describe(date, to)}`;
      return {
        content: [{ type: "text", text }],
        details: { tool: "convert_time", from, to, iso: date.toISOString() },
      };
    },
  });
}
