/**
 * SearXNG Search Extension
 *
 * Provides web search via SearXNG (hosted on the lts2 services server, reached
 * over VPN). Usage: /search <query> — top results with titles, URLs, snippets.
 * Endpoint comes from shared custom-config (PI_SEARXNG_URL env override wins).
 * Zero external dependencies — pure node:fetch + JSON.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { loadConfig } from "./lib/config.js";

const SEARXNG_URL = loadConfig().searxngUrl;

interface SearxngResult {
	url: string;
	title: string;
	content?: string;
	engine?: string;
}

async function doSearch(
	query: string,
	maxResults: number = 5,
): Promise<SearxngResult[]> {
	const url = `${SEARXNG_URL}/search?q=${encodeURIComponent(query)}&format=json&categories=general&pageno=1`;
	const res = await fetch(url);

	if (!res.ok) {
		throw new Error(`SearXNG search failed: ${res.status} ${res.statusText}`);
	}

	const data = await res.json();
	return (data.results || []).slice(0, maxResults).map((r: any) => ({
		url: r.url,
		title: r.title,
		content: r.content,
		engine: r.engine,
	}));
}

function formatResults(query: string, results: SearxngResult[]): string {
	if (results.length === 0) return `No results found for "${query}".`;

	const lines = results.map((r, i) => {
		const title = r.title || "(no title)";
		return `${i + 1}. ${title}\n   URL: ${r.url}\n${r.content ? "   " + r.content.slice(0, 300) + (r.content.length > 300 ? "..." : "") : ""}`;
	});

	return `Search results for "${query}":\n\n${lines.join("\n\n")}`;
}

export default function searxngExtension(pi: ExtensionAPI) {
	// /search slash command
	pi.registerCommand("search", {
		description: "Search the web via SearXNG",
		handler: async (args, ctx) => {
			const query = args.join(" ");
			if (!query.trim()) {
				ctx.ui.notify("Usage: /search <your query>", "warning");
				return;
			}

			ctx.ui.notify(`Searching for "${query}"...`, "info");

			try {
				const results = await doSearch(query.trim(), 5);
				const output = formatResults(query.trim(), results);
				ctx.ui.notify(output, "info");
			} catch (err: any) {
				ctx.ui.notify(`Search error: ${err.message}`, "error");
			}
		},
	});

	// search tool for agent use
	pi.registerTool({
		name: "web_search",
		label: "Web Search (SearXNG)",
		description:
			"Search the web using a local SearXNG instance. Returns titles, URLs, and content snippets.",
		promptSnippet: "Use web_search to find information on the internet.",
		parameters: {
			type: "object",
			properties: {
				query: { type: "string", description: "Search query" },
			},
			required: ["query"],
		},
		async execute(_toolCallId, params) {
			const results = await doSearch(params.query as string, 5);
			return {
				content: [
					{
						type: "text",
						text: formatResults(params.query as string, results),
					},
				],
				details: {
					tool: "web_search",
					engines: [...new Set(results.map((r) => r.engine).filter(Boolean))],
				},
			};
		},
	});
}
