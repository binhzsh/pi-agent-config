/**
 * Web Fetch Extension
 *
 * Native replacement for the `mcp-server-fetch` MCP server (removes a `uvx`
 * install). Fetches a URL and returns readable text — HTML is stripped to
 * plain text; JSON/text is returned as-is. Pairs with the SearXNG search
 * extension (search finds URLs, this reads them).
 *
 * Tool:
 *   web_fetch — fetch a URL and return its text content
 *
 * Safety: only http/https, blocks obvious internal metadata endpoints,
 * 15s timeout, response size cap. Zero external dependencies.
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const TIMEOUT_MS = 15_000;
const MAX_BYTES = 2_000_000; // 2 MB cap before decoding
const DEFAULT_MAX_CHARS = 20_000;
const USER_AGENT = "pi-web-fetch/1.0 (+local agent)";

/** Block cloud metadata / obviously dangerous hosts. */
function isBlockedHost(host: string): boolean {
  const h = host.toLowerCase();
  return (
    h === "169.254.169.254" || // AWS/GCP/Azure metadata
    h === "metadata.google.internal"
  );
}

function stripHtml(html: string): string {
  let s = html;
  // Drop non-content blocks entirely.
  s = s.replace(/<script[\s\S]*?<\/script>/gi, " ");
  s = s.replace(/<style[\s\S]*?<\/style>/gi, " ");
  s = s.replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");
  s = s.replace(/<!--[\s\S]*?-->/g, " ");
  // Preserve some structure.
  s = s.replace(/<\/(p|div|section|article|li|tr|h[1-6]|br)>/gi, "\n");
  s = s.replace(/<li[^>]*>/gi, "\n- ");
  // Strip remaining tags.
  s = s.replace(/<[^>]+>/g, " ");
  // Decode a handful of common entities.
  s = s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&mdash;/gi, "—")
    .replace(/&hellip;/gi, "…");
  // Collapse whitespace.
  s = s.replace(/[ \t\f\v]+/g, " ").replace(/\n\s*\n\s*\n+/g, "\n\n");
  return s.trim();
}

function titleOf(html: string): string | undefined {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? m[1].trim().replace(/\s+/g, " ") : undefined;
}

export default function webFetchExtension(pi: ExtensionAPI) {
  pi.registerTool({
    name: "web_fetch",
    label: "Web Fetch",
    description:
      "Fetch a URL over http/https and return its content as readable text. HTML is converted to plain text; JSON and text are returned as-is. Use after web_search to read a page.",
    promptSnippet: "Use web_fetch to read the contents of a URL.",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string", description: "The http(s) URL to fetch." },
        maxChars: {
          type: "number",
          description: `Max characters to return (default ${DEFAULT_MAX_CHARS}).`,
        },
      },
      required: ["url"],
    },
    async execute(_id, params) {
      const rawUrl = String(params.url || "").trim();
      const maxChars = Math.max(500, Number(params.maxChars) || DEFAULT_MAX_CHARS);

      let url: URL;
      try {
        url = new URL(rawUrl);
      } catch {
        return err(`Invalid URL: "${rawUrl}"`);
      }
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        return err(`Only http/https URLs are allowed (got ${url.protocol}).`);
      }
      if (isBlockedHost(url.hostname)) {
        return err(`Refusing to fetch internal/metadata host: ${url.hostname}`);
      }

      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
      try {
        const res = await fetch(url.toString(), {
          signal: ctrl.signal,
          redirect: "follow",
          headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/json,text/plain,*/*" },
        });
        if (!res.ok) {
          return err(`HTTP ${res.status} ${res.statusText} for ${url}`);
        }

        const contentType = res.headers.get("content-type") || "";
        const buf = await readCapped(res, MAX_BYTES);
        const body = new TextDecoder("utf-8", { fatal: false }).decode(buf);

        let text: string;
        let title: string | undefined;
        if (contentType.includes("html") || /^\s*<(!doctype|html)/i.test(body)) {
          title = titleOf(body);
          text = stripHtml(body);
        } else {
          text = body.trim();
        }

        const truncated = text.length > maxChars;
        const out = truncated ? text.slice(0, maxChars) + "\n…[truncated]" : text;
        const header = `URL: ${url}\n${title ? `Title: ${title}\n` : ""}Type: ${contentType || "unknown"}${truncated ? ` (truncated to ${maxChars} chars)` : ""}\n\n`;

        return {
          content: [{ type: "text", text: header + out }],
          details: { tool: "web_fetch", url: url.toString(), contentType, bytes: buf.length, truncated },
        };
      } catch (e: any) {
        const msg = e?.name === "AbortError" ? `Timed out after ${TIMEOUT_MS}ms` : e?.message || String(e);
        return err(`Fetch failed for ${url}: ${msg}`);
      } finally {
        clearTimeout(timer);
      }
    },
  });
}

async function readCapped(res: Response, cap: number): Promise<Uint8Array> {
  if (!res.body) {
    const ab = await res.arrayBuffer();
    return new Uint8Array(ab.slice(0, cap));
  }
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (total < cap) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      total += value.length;
    }
  }
  try {
    await reader.cancel();
  } catch {
    /* ignore */
  }
  const out = new Uint8Array(Math.min(total, cap));
  let off = 0;
  for (const c of chunks) {
    if (off >= cap) break;
    const slice = c.subarray(0, cap - off);
    out.set(slice, off);
    off += slice.length;
  }
  return out;
}

function err(text: string) {
  return {
    content: [{ type: "text", text }],
    details: { tool: "web_fetch", error: text },
    isError: true,
  };
}
