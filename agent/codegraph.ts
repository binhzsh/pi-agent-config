import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const CODEGRAPH_BIN = process.env.CODEGRAPH_BIN || "codegraph";
const EXEC_TIMEOUT_MS = 120_000;
const DEFAULT_MAX_BYTES = 50 * 1024;
const DEFAULT_MAX_LINES = 2000;

const env = {
	...process.env,
	PATH: `${process.env.PATH || ""}:${process.env.HOME || ""}/.local/bin`,
	NO_COLOR: "1",
};

async function runCodeGraph(args: string[], cwd: string) {
	try {
		const { stdout, stderr } = await execFileAsync(CODEGRAPH_BIN, args, {
			cwd,
			env,
			timeout: EXEC_TIMEOUT_MS,
			maxBuffer: 100 * 1024 * 1024,
		});
		return formatOutput([stdout, stderr].filter(Boolean).join("\n"));
	} catch (err: any) {
		const output = [err.stdout, err.stderr].filter(Boolean).join("\n").trim();
		const hint = err.code === "ENOENT" ? `\n\nInstall CodeGraph or set CODEGRAPH_BIN. Tried: ${CODEGRAPH_BIN}` : "";
		throw new Error(`codegraph ${args.join(" ")} failed: ${err.message}${output ? `\n\n${output}` : ""}${hint}`);
	}
}

function formatOutput(output: string) {
	const text = stripAnsi(output).trim() || "No output.";
	const lines = text.split("\n");
	let bytes = 0;
	const kept: string[] = [];

	for (const line of lines) {
		const lineBytes = Buffer.byteLength(`${line}\n`, "utf8");
		if (kept.length >= DEFAULT_MAX_LINES || bytes + lineBytes > DEFAULT_MAX_BYTES) break;
		kept.push(line);
		bytes += lineBytes;
	}

	const content = kept.join("\n");
	if (kept.length === lines.length && bytes >= Buffer.byteLength(text, "utf8")) return content;

	const totalBytes = Buffer.byteLength(text, "utf8");
	return `${content}\n\n[Output truncated: showing ${kept.length} of ${lines.length} lines (${formatSize(bytes)} of ${formatSize(totalBytes)}). ${lines.length - kept.length} lines (${formatSize(totalBytes - bytes)}) omitted.]`;
}

function formatSize(bytes: number) {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function stripAnsi(text: string) {
	return text.replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, "");
}

const exploreParams = {
	type: "object",
	properties: {
		query: { type: "string", description: "Architecture/code-flow question to answer from the CodeGraph index." },
	},
	required: ["query"],
	additionalProperties: false,
} as const;

const symbolParams = {
	type: "object",
	properties: {
		target: { type: "string", description: "Symbol name, function, class, method, or file path." },
	},
	required: ["target"],
	additionalProperties: false,
} as const;

const searchParams = {
	type: "object",
	properties: {
		query: { type: "string", description: "Symbol or text to search for in the CodeGraph index." },
		limit: { type: "number", description: "Maximum number of results." },
	},
	required: ["query"],
	additionalProperties: false,
} as const;

const emptyParams = {
	type: "object",
	properties: {},
	additionalProperties: false,
} as const;

const sharedGuidelines = [
	"Use codegraph_explore first for architecture questions, code-flow questions, and broad codebase understanding when a .codegraph index exists.",
	"Use codegraph_node to inspect one symbol or file from the CodeGraph index instead of starting with grep/read loops.",
	"Use codegraph_search to locate symbols by name and codegraph_callers to find call sites.",
	"Trust CodeGraph output as indexed source context; only fall back to read/grep when CodeGraph reports no index, stale content, or missing symbols.",
];

export default function (pi: any) {
	pi.registerTool({
		name: "codegraph_explore",
		label: "CodeGraph Explore",
		description: "Answer architecture, code-flow, and codebase-structure questions using the local CodeGraph index. Requires this project to have run `codegraph init`.",
		parameters: exploreParams,
		promptSnippet: "codegraph_explore: answer architecture/code-flow questions from the local CodeGraph index",
		promptGuidelines: sharedGuidelines,
		async execute(_id: string, params: { query: string }, _signal: AbortSignal, _onUpdate: unknown, ctx: { cwd: string }) {
			const text = await runCodeGraph(["explore", params.query], ctx.cwd);
			return { content: [{ type: "text", text }], details: { query: params.query } };
		},
	});

	pi.registerTool({
		name: "codegraph_node",
		label: "CodeGraph Node",
		description: "Show one symbol's source plus caller/callee context, or read a file path through CodeGraph.",
		parameters: symbolParams,
		promptSnippet: "codegraph_node: inspect one symbol or file through the local CodeGraph index",
		promptGuidelines: sharedGuidelines,
		async execute(_id: string, params: { target: string }, _signal: AbortSignal, _onUpdate: unknown, ctx: { cwd: string }) {
			const text = await runCodeGraph(["node", params.target], ctx.cwd);
			return { content: [{ type: "text", text }], details: { target: params.target } };
		},
	});

	pi.registerTool({
		name: "codegraph_search",
		label: "CodeGraph Search",
		description: "Search the local CodeGraph index for symbols by name.",
		parameters: searchParams,
		promptSnippet: "codegraph_search: find symbols by name in the local CodeGraph index",
		promptGuidelines: sharedGuidelines,
		async execute(_id: string, params: { query: string; limit?: number }, _signal: AbortSignal, _onUpdate: unknown, ctx: { cwd: string }) {
			const args = ["search", params.query];
			if (typeof params.limit === "number") args.push("--limit", String(params.limit));
			const text = await runCodeGraph(args, ctx.cwd);
			return { content: [{ type: "text", text }], details: { query: params.query, limit: params.limit } };
		},
	});

	pi.registerTool({
		name: "codegraph_callers",
		label: "CodeGraph Callers",
		description: "Find every call site for a function, method, or symbol in the local CodeGraph index.",
		parameters: symbolParams,
		promptSnippet: "codegraph_callers: find call sites for a symbol in the local CodeGraph index",
		promptGuidelines: sharedGuidelines,
		async execute(_id: string, params: { target: string }, _signal: AbortSignal, _onUpdate: unknown, ctx: { cwd: string }) {
			const text = await runCodeGraph(["callers", params.target], ctx.cwd);
			return { content: [{ type: "text", text }], details: { target: params.target } };
		},
	});

	pi.registerTool({
		name: "codegraph_status",
		label: "CodeGraph Status",
		description: "Show CodeGraph index status for the current project.",
		parameters: emptyParams,
		promptSnippet: "codegraph_status: check whether the current project has a fresh CodeGraph index",
		promptGuidelines: sharedGuidelines,
		async execute(_id: string, _params: unknown, _signal: AbortSignal, _onUpdate: unknown, ctx: { cwd: string }) {
			const text = await runCodeGraph(["status"], ctx.cwd);
			return { content: [{ type: "text", text }], details: {} };
		},
	});
}
