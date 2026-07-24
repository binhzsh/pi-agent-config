/**
 * pi-goal-custom — Zero-dependency persistent goal tracking for pi.
 *
 * Fully custom replacement for npm:pi-agent-goal.
 * Zero external dependencies — no pi-tui, no typebox.
 *
 * Features:
 * - Persistent goal state via session entries (event-sourced)
 * - Tools: get_goal, create_goal, propose_goal_draft, complete_goal, update_goal_progress
 * - Command: /goal with subcommands (status, edit, pause, resume, clear, complete, import, start)
 * - Automatic context injection when goal is active
 * - Doc import from markdown files
 * - Progress tracking with done/current/blocked fields
 *
 * State is stored as session entries — survives compaction, fork, and session restore.
 */
import type {
  ExtensionAPI,
  AgentToolResult,
  SessionEntry,
  AgentMessage,
} from "@earendil-works/pi-coding-agent";

// ─── Constants ───────────────────────────────────────────────────────

const GOAL_CUSTOM_TYPE = "goal-state";
const GOAL_CONTEXT_TYPE = "goal-context";
const MAX_OBJECTIVE_LENGTH = 4000;
const MAX_CONTEXT_CHARS = 6000;

// ─── Types ───────────────────────────────────────────────────────────

export type GoalStatus = "active" | "paused" | "complete";
export type GoalOwner = "user" | "model";

export interface GoalSourceDoc {
  path: string;
  kind: "prd" | "doc" | "directory" | "manual";
  brief: string;
  hash?: string;
  extractedAt: number;
}

export interface GoalProgress {
  done: string[];
  current?: string;
  blocked: string[];
  lastSummary: string;
}

export interface GoalState {
  version: 1;
  goalId: string;
  objective: string;
  status: GoalStatus;
  sourceDocs: GoalSourceDoc[];
  constraints: string[];
  acceptanceCriteria: string[];
  progress: GoalProgress;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  owner: GoalOwner;
}

export interface GoalCreateEvent {
  action: "create" | "replace";
  goalId: string;
  objective: string;
  now: number;
  owner?: GoalOwner;
  sourceDocs?: GoalSourceDoc[];
  constraints?: string[];
  acceptanceCriteria?: string[];
  progress?: Partial<GoalProgress>;
  reason?: string;
}

export interface GoalEditEvent {
  action: "edit";
  goalId: string;
  now: number;
  objective?: string;
  sourceDocs?: GoalSourceDoc[];
  constraints?: string[];
  acceptanceCriteria?: string[];
  reason?: string;
}

export interface GoalPauseEvent {
  action: "pause";
  goalId: string;
  now: number;
  reason?: string;
}

export interface GoalResumeEvent {
  action: "resume";
  goalId: string;
  now: number;
  reason?: string;
}

export interface GoalClearEvent {
  action: "clear";
  goalId: string;
  now: number;
  reason?: string;
}

export interface GoalCompleteEvent {
  action: "complete";
  goalId: string;
  now: number;
  reason?: string;
}

export interface GoalProgressEvent {
  action: "progress";
  goalId: string;
  now: number;
  progress: Partial<GoalProgress>;
  reason?: string;
}

export interface GoalImportDocsEvent {
  action: "import-docs";
  goalId: string;
  now: number;
  sourceDocs: GoalSourceDoc[];
  constraints?: string[];
  acceptanceCriteria?: string[];
  reason?: string;
}

export type GoalStateEvent =
  | GoalCreateEvent
  | GoalEditEvent
  | GoalPauseEvent
  | GoalResumeEvent
  | GoalClearEvent
  | GoalCompleteEvent
  | GoalProgressEvent
  | GoalImportDocsEvent;

export type GoalStateAction = GoalStateEvent["action"] | "set";

export interface GoalStateEntry {
  action: GoalStateAction;
  state: GoalState | null;
  event?: GoalStateEvent;
  reason?: string;
}

export interface GoalDraftProposal {
  objective: string;
  acceptanceCriteria: string[];
  description?: string;
  sourcePaths?: string[];
}

// ─── Helpers ─────────────────────────────────────────────────────────

function ok(text: string): AgentToolResult<unknown> {
  return { content: [{ type: "text", text }], details: {} };
}

function err(message: string, code: string, goal?: GoalState): AgentToolResult<unknown> {
  return {
    content: [{ type: "text", text: message }],
    details: { status: "refused", reason: code, goal },
  };
}

function validateObjective(objective: string): string {
  const trimmed = objective.trim();
  if (trimmed.length === 0) throw new Error("Goal objective must be non-empty.");
  if (trimmed.length > MAX_OBJECTIVE_LENGTH)
    throw new Error(`Goal objective must be ${MAX_OBJECTIVE_LENGTH} characters or fewer.`);
  return trimmed;
}

function normalizeProgress(
  progress: Partial<GoalProgress> = {},
  base?: GoalProgress,
): GoalProgress {
  return {
    done: [...(progress.done ?? base?.done ?? [])],
    current: progress.current ?? base?.current,
    blocked: [...(progress.blocked ?? base?.blocked ?? [])],
    lastSummary: progress.lastSummary ?? base?.lastSummary ?? "",
  };
}

function cloneState(state: GoalState | null): GoalState | null {
  if (!state) return null;
  return {
    ...state,
    sourceDocs: state.sourceDocs.map((d) => ({ ...d })),
    constraints: [...state.constraints],
    acceptanceCriteria: [...state.acceptanceCriteria],
    progress: normalizeProgress(state.progress),
  };
}

// ─── State Machine ───────────────────────────────────────────────────

function reduceGoalState(current: GoalState | null, event: GoalStateEvent): GoalState | null {
  switch (event.action) {
    case "create":
    case "replace": {
      const objective = validateObjective(event.objective);
      return {
        version: 1,
        goalId: event.goalId,
        objective,
        status: "active",
        sourceDocs: [...(event.sourceDocs ?? [])],
        constraints: [...(event.constraints ?? [])],
        acceptanceCriteria: [...(event.acceptanceCriteria ?? [])],
        progress: normalizeProgress(event.progress),
        createdAt: event.now,
        updatedAt: event.now,
        completedAt: undefined,
        owner: event.owner ?? "user",
      };
    }
    case "edit": {
      if (!isCurrentGoal(current, event.goalId)) return current;
      return {
        ...current,
        objective:
          event.objective === undefined ? current.objective : validateObjective(event.objective),
        sourceDocs: event.sourceDocs === undefined ? current.sourceDocs : [...event.sourceDocs],
        constraints:
          event.constraints === undefined ? current.constraints : [...event.constraints],
        acceptanceCriteria:
          event.acceptanceCriteria === undefined
            ? current.acceptanceCriteria
            : [...event.acceptanceCriteria],
        updatedAt: event.now,
      };
    }
    case "pause": {
      if (!isCurrentGoal(current, event.goalId) || current.status !== "active") return current;
      return { ...current, status: "paused", updatedAt: event.now, completedAt: undefined };
    }
    case "resume": {
      if (!isCurrentGoal(current, event.goalId) || current.status !== "paused") return current;
      return { ...current, status: "active", updatedAt: event.now, completedAt: undefined };
    }
    case "clear":
      return isCurrentGoal(current, event.goalId) ? null : current;
    case "complete": {
      if (!isCurrentGoal(current, event.goalId) || current.status !== "active") return current;
      return { ...current, status: "complete", updatedAt: event.now, completedAt: event.now };
    }
    case "progress": {
      if (!isCurrentGoal(current, event.goalId) || current.status !== "active") return current;
      return {
        ...current,
        progress: normalizeProgress(event.progress, current.progress),
        updatedAt: event.now,
      };
    }
    case "import-docs": {
      if (!isCurrentGoal(current, event.goalId) || current.status !== "active") return current;
      return {
        ...current,
        sourceDocs: mergeSourceDocs(current.sourceDocs, event.sourceDocs),
        constraints:
          event.constraints === undefined
            ? current.constraints
            : mergeStringLists(current.constraints, event.constraints),
        acceptanceCriteria:
          event.acceptanceCriteria === undefined
            ? current.acceptanceCriteria
            : mergeStringLists(current.acceptanceCriteria, event.acceptanceCriteria),
        updatedAt: event.now,
      };
    }
    default:
      return current;
  }
}

function isCurrentGoal(current: GoalState | null, goalId: string): current is GoalState {
  return current !== null && current.goalId === goalId;
}

function mergeSourceDocs(existing: GoalSourceDoc[], incoming: GoalSourceDoc[]): GoalSourceDoc[] {
  const byPath = new Map(existing.map((d) => [d.path, d]));
  for (const doc of incoming) byPath.set(doc.path, doc);
  return [...byPath.values()];
}

function mergeStringLists(existing: string[], incoming: string[]): string[] {
  return [...new Set([...existing, ...incoming].map((v) => v.trim()).filter(Boolean))];
}

// ─── Persistence ─────────────────────────────────────────────────────

function parseGoalStateEntry(data: unknown): GoalStateEntry | null {
  if (!isRecord(data) || !isGoalStateAction(data.action) || !("state" in data)) return null;
  return {
    action: data.action,
    state: isGoalState(data.state) ? cloneState(data.state) : null,
    event: parseGoalStateEvent(data.event),
    reason: typeof data.reason === "string" ? data.reason : undefined,
  };
}

function parseGoalStateEvent(data: unknown): GoalStateEvent | undefined {
  if (!isRecord(data) || !isGoalStateAction(data.action) || data.action === "set") return undefined;
  if (typeof data.goalId !== "string" || typeof data.now !== "number") return undefined;
  const reason = typeof data.reason === "string" ? data.reason : undefined;

  if (data.action === "create" || data.action === "replace") {
    if (typeof data.objective !== "string") return undefined;
    const sourceDocs = readOptionalSourceDocs(data, "sourceDocs");
    const constraints = readOptionalStringArray(data, "constraints");
    const acceptanceCriteria = readOptionalStringArray(data, "acceptanceCriteria");
    const progress = readOptionalProgress(data, "progress");
    if (sourceDocs === null || constraints === null || acceptanceCriteria === null || progress === null)
      return undefined;
    const owner: GoalOwner | undefined =
      data.owner === "model" || data.owner === "user" ? data.owner : undefined;
    const base = {
      goalId: data.goalId,
      objective: data.objective,
      now: data.now,
      ...(owner ? { owner } : {}),
      ...(sourceDocs ? { sourceDocs } : {}),
      ...(constraints ? { constraints } : {}),
      ...(acceptanceCriteria ? { acceptanceCriteria } : {}),
      ...(progress ? { progress } : {}),
      ...(reason ? { reason } : {}),
    };
    return data.action === "create" ? { action: "create", ...base } : { action: "replace", ...base };
  }

  if (data.action === "pause")
    return { action: "pause", goalId: data.goalId, now: data.now, ...(reason ? { reason } : {}) };
  if (data.action === "resume")
    return { action: "resume", goalId: data.goalId, now: data.now, ...(reason ? { reason } : {}) };
  if (data.action === "clear")
    return { action: "clear", goalId: data.goalId, now: data.now, ...(reason ? { reason } : {}) };
  if (data.action === "complete")
    return { action: "complete", goalId: data.goalId, now: data.now, ...(reason ? { reason } : {}) };

  if (data.action === "edit") {
    const sourceDocs = readOptionalSourceDocs(data, "sourceDocs");
    const constraints = readOptionalStringArray(data, "constraints");
    const acceptanceCriteria = readOptionalStringArray(data, "acceptanceCriteria");
    if (sourceDocs === null || constraints === null || acceptanceCriteria === null) return undefined;
    return {
      action: "edit",
      goalId: data.goalId,
      now: data.now,
      ...(typeof data.objective === "string" ? { objective: data.objective } : {}),
      ...(sourceDocs ? { sourceDocs } : {}),
      ...(constraints ? { constraints } : {}),
      ...(acceptanceCriteria ? { acceptanceCriteria } : {}),
      ...(reason ? { reason } : {}),
    };
  }

  if (data.action === "progress") {
    const progress = readOptionalProgress(data, "progress");
    if (!progress) return undefined;
    return {
      action: "progress",
      goalId: data.goalId,
      now: data.now,
      progress,
      ...(reason ? { reason } : {}),
    };
  }

  if (data.action === "import-docs") {
    const sourceDocs = readOptionalSourceDocs(data, "sourceDocs");
    const constraints = readOptionalStringArray(data, "constraints");
    const acceptanceCriteria = readOptionalStringArray(data, "acceptanceCriteria");
    if (!sourceDocs || constraints === null || acceptanceCriteria === null) return undefined;
    return {
      action: "import-docs",
      goalId: data.goalId,
      now: data.now,
      sourceDocs,
      ...(constraints ? { constraints } : {}),
      ...(acceptanceCriteria ? { acceptanceCriteria } : {}),
      ...(reason ? { reason } : {}),
    };
  }
}

function isGoalStateAction(value: unknown): value is GoalStateAction {
  return (
    value === "create" ||
    value === "replace" ||
    value === "edit" ||
    value === "pause" ||
    value === "resume" ||
    value === "clear" ||
    value === "complete" ||
    value === "progress" ||
    value === "import-docs" ||
    value === "set"
  );
}

function isGoalState(value: unknown): value is GoalState {
  return (
    isRecord(value) &&
    value.version === 1 &&
    typeof value.goalId === "string" &&
    typeof value.objective === "string" &&
    (value.status === "active" || value.status === "paused" || value.status === "complete") &&
    Array.isArray(value.sourceDocs) &&
    value.sourceDocs.every(isGoalSourceDoc) &&
    isStringArray(value.constraints) &&
    isStringArray(value.acceptanceCriteria) &&
    isGoalProgress(value.progress) &&
    typeof value.createdAt === "number" &&
    typeof value.updatedAt === "number" &&
    (value.completedAt === undefined || typeof value.completedAt === "number") &&
    (value.owner === "user" || value.owner === "model")
  );
}

function isGoalSourceDoc(value: unknown): value is GoalSourceDoc {
  return (
    isRecord(value) &&
    typeof value.path === "string" &&
    (value.kind === "prd" || value.kind === "doc" || value.kind === "directory" || value.kind === "manual") &&
    typeof value.brief === "string" &&
    typeof value.extractedAt === "number" &&
    (value.hash === undefined || typeof value.hash === "string")
  );
}

function isGoalProgress(value: unknown): value is GoalProgress {
  return (
    isRecord(value) &&
    isStringArray(value.done) &&
    (value.current === undefined || typeof value.current === "string") &&
    isStringArray(value.blocked) &&
    typeof value.lastSummary === "string"
  );
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readOptionalStringArray(record: Record<string, unknown>, key: string): string[] | null | undefined {
  const value = record[key];
  if (value === undefined) return undefined;
  return Array.isArray(value) && value.every((item) => typeof item === "string") ? [...value] : null;
}

function readOptionalSourceDocs(
  record: Record<string, unknown>,
  key: string,
): GoalSourceDoc[] | null | undefined {
  const value = record[key];
  if (value === undefined) return undefined;
  return Array.isArray(value) && value.every(isGoalSourceDoc) ? value.map((d) => ({ ...d })) : null;
}

function readOptionalProgress(
  record: Record<string, unknown>,
  key: string,
): Partial<GoalProgress> | null | undefined {
  const value = record[key];
  if (value === undefined) return undefined;
  if (!isRecord(value)) return null;
  if (value.done !== undefined && !isStringArray(value.done)) return null;
  if (value.current !== undefined && typeof value.current !== "string") return null;
  if (value.blocked !== undefined && !isStringArray(value.blocked)) return null;
  if (value.lastSummary !== undefined && typeof value.lastSummary !== "string") return null;
  return {
    ...(value.done ? { done: [...value.done] } : {}),
    ...(typeof value.current === "string" ? { current: value.current } : {}),
    ...(value.blocked ? { blocked: [...value.blocked] } : {}),
    ...(typeof value.lastSummary === "string" ? { lastSummary: value.lastSummary } : {}),
  };
}

function loadGoalState(ctx: { sessionManager: { getBranch(): SessionEntry[] } }): GoalState | null {
  const branch = ctx.sessionManager.getBranch();
  let current: GoalState | null = null;

  for (const entry of branch) {
    if (entry.type !== "custom" || entry.customType !== GOAL_CUSTOM_TYPE) continue;
    const goalEntry = parseGoalStateEntry(entry.data);
    if (!goalEntry) continue;
    if (goalEntry.event) {
      current = reduceGoalState(current, goalEntry.event);
    } else {
      // Persisted state snapshot
      if (goalEntry.action === "clear") {
        current = goalEntry.state === null ? null : current;
      } else if (goalEntry.state !== null) {
        if (goalEntry.action === "create" || goalEntry.action === "replace" || goalEntry.action === "set") {
          current = goalEntry.state;
        } else if (isCurrentGoal(current, goalEntry.state.goalId)) {
          current = goalEntry.state;
        }
      }
    }
  }

  return cloneState(current);
}

function saveGoalState(
  pi: { appendEntry<T>(customType: string, data?: T): void },
  event: GoalStateEvent,
  current: GoalState | null,
): GoalState | null {
  const next = reduceGoalState(current, event);
  pi.appendEntry(GOAL_CUSTOM_TYPE, {
    action: event.action,
    state: cloneState(next),
    event: cloneEvent(event),
    reason: event.reason,
  });
  return cloneState(next);
}

function cloneEvent(event: GoalStateEvent): GoalStateEvent {
  return JSON.parse(JSON.stringify(event)) as GoalStateEvent;
}

// ─── Context Injection ───────────────────────────────────────────────

function buildGoalContext(goal: GoalState): string {
  const lines: string[] = [];
  lines.push(`## Active Goal`);
  lines.push(``);
  lines.push(`**Objective:** ${goal.objective}`);
  lines.push(`**Status:** ${goal.status}`);
  lines.push(``);

  if (goal.acceptanceCriteria.length > 0) {
    lines.push(`**Acceptance Criteria:**`);
    for (const c of goal.acceptanceCriteria) {
      lines.push(`- [ ] ${c}`);
    }
    lines.push("");
  }

  if (goal.constraints.length > 0) {
    lines.push(`**Constraints:**`);
    for (const c of goal.constraints) {
      lines.push(`- ${c}`);
    }
    lines.push("");
  }

  if (goal.sourceDocs.length > 0) {
    lines.push(`**Source Docs:** ${goal.sourceDocs.map((d) => d.path).join(", ")}`);
    lines.push("");
  }

  if (goal.progress.done.length > 0 || goal.progress.current || goal.progress.blocked.length > 0) {
    lines.push(`**Progress:**`);
    for (const d of goal.progress.done) {
      lines.push(`- ✅ ${d}`);
    }
    if (goal.progress.current) {
      lines.push(`- 🔄 ${goal.progress.current}`);
    }
    for (const b of goal.progress.blocked) {
      lines.push(`- 🚫 ${b}`);
    }
    lines.push("");
  }

  return `<goal>\n${lines.join("\n")}\n</goal>`;
}

// ─── Doc Import ──────────────────────────────────────────────────────

const TEXT_EXTENSIONS = new Set([".md", ".markdown", ".txt"]);
const IGNORED_DIRS = new Set([".git", "node_modules", "dist", "build", "coverage", ".next", ".turbo"]);

async function readDocFile(filePath: string): Promise<string> {
  const { readFileSync } = await import("node:fs");
  return readFileSync(filePath, "utf-8");
}

function extractGoalFromDoc(content: string, sourcePath: string): {
  objective?: string;
  constraints: string[];
  acceptanceCriteria: string[];
  risks: string[];
  openQuestions: string[];
} {
  const sections = parseMarkdownSections(content);
  return {
    objective: firstValue(sections, ["objective", "goal", "problem", "problem statement", "summary"]),
    constraints: listValues(sections, ["constraints", "non-goals", "non goals"]),
    acceptanceCriteria: listValues(sections, [
      "acceptance criteria",
      "acceptance",
      "definition of done",
      "success criteria",
    ]),
    risks: listValues(sections, ["risks", "risk", "mitigations"]),
    openQuestions: listValues(sections, ["open questions", "questions"]),
  };
}

function parseMarkdownSections(content: string): Record<string, string[]> {
  const sections: Record<string, string[]> = {};
  const lines = content.split("\n");
  let currentSection = "";
  let currentLines: string[] = [];

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      if (currentSection && currentLines.length > 0) {
        sections[currentSection] = [...currentLines];
      }
      currentSection = headingMatch[2].trim().toLowerCase();
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }
  if (currentSection && currentLines.length > 0) {
    sections[currentSection] = currentLines;
  }
  return sections;
}

function firstValue(sections: Record<string, string[]>, keys: string[]): string | undefined {
  for (const key of keys) {
    for (const [sectionKey, lines] of Object.entries(sections)) {
      if (sectionKey.includes(key) || key.includes(sectionKey)) {
        const text = lines.join("\n").trim();
        if (text) return text.slice(0, 500);
      }
    }
  }
  return undefined;
}

function listValues(sections: Record<string, string[]>, keys: string[]): string[] {
  const values: string[] = [];
  for (const key of keys) {
    for (const [sectionKey, lines] of Object.entries(sections)) {
      if (sectionKey.includes(key) || key.includes(sectionKey)) {
        const text = lines.join("\n").trim();
        if (text) {
          // Parse as list items
          const items = text
            .split(/[\n\r]+/)
            .map((l) => l.replace(/^[-*•]\s*/, "").trim())
            .filter(Boolean);
          values.push(...items);
        }
      }
    }
  }
  return [...new Set(values)];
}

async function importGoalSources(inputPath: string, cwd: string): Promise<{
  objective: string;
  constraints: string[];
  acceptanceCriteria: string[];
  risks: string[];
  openQuestions: string[];
  sourcePaths: string[];
  sourceDocs: GoalSourceDoc[];
}> {
  const { readdir, stat, readFile } = await import("node:fs/promises");
  const { resolve, relative, extname } = await import("node:path");
  const { createHash } = await import("node:crypto");

  const resolved = resolve(cwd, inputPath);
  const statResult = await stat(resolved);

  if (statResult.isDirectory()) {
    const files = await collectDocsFiles(resolved, cwd);
    if (files.length === 0) throw new Error(`No supported docs files found in: ${inputPath}`);

    const results = await Promise.all(
      files.map(async (file) => {
        const content = await readFile(file, "utf-8");
        return { content, path: relative(cwd, file) };
      }),
    );

    return combineImports(results, `Imported docs from ${relative(cwd, resolved) || "."}`);
  }

  if (!statResult.isFile()) throw new Error(`Import path is not a file or directory: ${inputPath}`);

  const content = await readFile(resolved, "utf-8");
  return combineImports(
    [{ content, path: relative(cwd, resolved) }],
    "Imported goal source document",
  );
}

async function collectDocsFiles(dir: string, cwd: string): Promise<string[]> {
  const { readdir, stat } = await import("node:fs/promises");
  const { join } = await import("node:path");

  const files: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.has(entry.name)) {
        files.push(...(await collectDocsFiles(fullPath, cwd)));
      }
    } else if (entry.isFile() && TEXT_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
      files.push(fullPath);
    }
  }

  return files;
}

function extname(path: string): string {
  const idx = path.lastIndexOf(".");
  return idx > 0 ? path.slice(idx) : "";
}

function combineImports(
  results: Array<{ content: string; path: string }>,
  title: string,
): {
  objective: string;
  constraints: string[];
  acceptanceCriteria: string[];
  risks: string[];
  openQuestions: string[];
  sourcePaths: string[];
  sourceDocs: GoalSourceDoc[];
} {
  const allConstraints: string[] = [];
  const allCriteria: string[] = [];
  const allRisks: string[] = [];
  const allQuestions: string[] = [];
  const sourceDocs: GoalSourceDoc[] = [];

  let objective = "";

  for (const { content, path } of results) {
    const extracted = extractGoalFromDoc(content, path);
    if (extracted.objective && !objective) objective = extracted.objective;
    allConstraints.push(...extracted.constraints);
    allCriteria.push(...extracted.acceptanceCriteria);
    allRisks.push(...extracted.risks);
    allQuestions.push(...extracted.openQuestions);

    const brief = content.slice(0, 500).replace(/\n+/g, " ").trim();
    sourceDocs.push({
      path,
      kind: "doc",
      brief,
      extractedAt: Date.now(),
    });
  }

  return {
    objective: objective || title,
    constraints: [...new Set(allConstraints)],
    acceptanceCriteria: [...new Set(allCriteria)],
    risks: [...new Set(allRisks)],
    openQuestions: [...new Set(allQuestions)],
    sourcePaths: results.map((r) => r.path),
    sourceDocs,
  };
}

// ─── Prompts ─────────────────────────────────────────────────────────

function renderGoalStartPrompt(goal: GoalState): string {
  return `You have been assigned a goal. Work on it now.

${buildGoalContext(goal)}

Focus on achieving the objective and meeting the acceptance criteria. Update progress as you complete items.`;
}

function renderGoalDraftingPrompt(objective: string, options: {
  start?: boolean;
  replacingExistingGoal?: boolean;
  currentGoal?: GoalState;
}): string {
  const lines: string[] = [];
  lines.push(`The user wants to set a goal: "${objective}"`);
  lines.push("");

  if (options.replacingExistingGoal && options.currentGoal) {
    lines.push(`There is an existing goal: "${options.currentGoal.objective}"`);
    lines.push("");
  }

  lines.push(`Draft a concise goal proposal with:
1. A clear, specific objective (refine the user's request)
2. Concrete acceptance criteria (how will you know it's done?)
3. Any constraints or assumptions

Use the propose_goal_draft tool exactly once with your proposal.`);

  return lines.join("\n");
}

function renderEditableGoalDraft(proposal: GoalDraftProposal): string {
  const lines: string[] = [];
  lines.push(`# Goal Proposal`);
  lines.push("");
  lines.push(`## Objective`);
  lines.push(proposal.objective);
  lines.push("");
  lines.push(`## Acceptance Criteria`);
  for (const c of proposal.acceptanceCriteria) {
    lines.push(`- [ ] ${c}`);
  }
  lines.push("");
  lines.push(`Edit above, then save to confirm.`);
  return lines.join("\n");
}

function renderGoalStatus(goal: GoalState): string {
  const lines: string[] = [];
  lines.push(`# Goal: ${goal.objective}`);
  lines.push(`Status: ${goal.status}`);
  lines.push("");

  if (goal.acceptanceCriteria.length > 0) {
    lines.push(`## Acceptance Criteria`);
    for (const c of goal.acceptanceCriteria) {
      lines.push(`- ${c}`);
    }
    lines.push("");
  }

  if (goal.constraints.length > 0) {
    lines.push(`## Constraints`);
    for (const c of goal.constraints) {
      lines.push(`- ${c}`);
    }
    lines.push("");
  }

  if (goal.sourceDocs.length > 0) {
    lines.push(`## Source Docs`);
    for (const d of goal.sourceDocs) {
      lines.push(`- ${d.path}`);
    }
    lines.push("");
  }

  if (goal.progress.done.length > 0 || goal.progress.current || goal.progress.blocked.length > 0) {
    lines.push(`## Progress`);
    for (const d of goal.progress.done) {
      lines.push(`- ✅ ${d}`);
    }
    if (goal.progress.current) {
      lines.push(`- 🔄 ${goal.progress.current}`);
    }
    for (const b of goal.progress.blocked) {
      lines.push(`- 🚫 ${b}`);
    }
    lines.push("");
  }

  lines.push(`Commands: /goal edit, /goal pause, /goal resume, /goal complete, /goal clear`);
  return lines.join("\n");
}

// ─── Main Extension ──────────────────────────────────────────────────

export default function goalExtension(pi: ExtensionAPI): void {
  // ─── Goal Context Injection ──────────────────────────────────────

  pi.on("before_agent_start", async (event, ctx) => {
    const goal = loadGoalState(ctx);
    if (!goal || goal.status !== "active") return;

    const contextText = buildGoalContext(goal);
    if (contextText.length > MAX_CONTEXT_CHARS) {
      return;
    }

    return {
      systemPrompt: `${event.systemPrompt}\n\n${contextText}`,
    };
  });

  // ─── Goal Tools ──────────────────────────────────────────────────

  // get_goal
  pi.registerTool({
    name: "get_goal",
    label: "Get Goal",
    description: "Get the current long-running goal state and source paths.",
    promptSnippet: "Use get_goal to read the current /goal state, status, progress, acceptance criteria, and source paths.",
    promptGuidelines: ["Use get_goal when you need the current long-running objective before acting on goal state."],
    parameters: { type: "object", properties: {} },
    async execute(_id, _params, _signal, _update, ctx) {
      const goal = loadGoalState(ctx);
      if (!goal) return ok("No goal is currently set.");
      return {
        content: [{ type: "text", text: renderGoalStatus(goal) }],
        details: { goal, sourcePaths: goal.sourceDocs.map((d) => d.path) },
      };
    },
  });

  // create_goal
  pi.registerTool({
    name: "create_goal",
    label: "Create Goal",
    description: "Create a goal only when explicitly requested by the user or system instructions. Refuses if a goal exists.",
    promptSnippet: "Use create_goal to persist a user-approved /goal only when no goal exists.",
    promptGuidelines: [
      "Use create_goal only when the user or system explicitly asks to persist an already-approved goal.",
      "Do not use create_goal for agent-drafted proposals; use propose_goal_draft.",
      "create_goal refuses if a goal already exists.",
    ],
    parameters: {
      type: "object",
      properties: {
        objective: { type: "string", description: "The concrete user-approved objective." },
        explicit_request: { type: "boolean", description: "Must be true only when explicitly requested." },
        source_paths: { type: "array", items: { type: "string" }, description: "Optional source paths." },
        acceptance_criteria: { type: "array", items: { type: "string" }, description: "Optional acceptance criteria." },
      },
      required: ["objective", "explicit_request"],
    },
    async execute(_id, params, _signal, _update, ctx) {
      const p = params as Record<string, unknown>;
      if (p.explicit_request !== true) {
        return err("create_goal requires explicit user or system authorization.", "permission_denied");
      }
      const current = loadGoalState(ctx);
      if (current) {
        return err("A goal already exists. Use /goal --replace to replace it.", "goal_exists", current);
      }

      const next = saveGoalState(
        pi,
        {
          action: "create",
          goalId: crypto.randomUUID(),
          objective: String(p.objective ?? ""),
          now: Date.now(),
          owner: "model",
          sourceDocs: sourceDocsFromPaths(p.source_paths as string[] | undefined),
          acceptanceCriteria: p.acceptance_criteria as string[] | undefined,
          reason: "Created by create_goal after explicit authorization.",
        },
        current,
      );

      return ok(`Created goal: ${next?.objective ?? String(p.objective)}`);
    },
  });

  // propose_goal_draft
  pi.registerTool({
    name: "propose_goal_draft",
    label: "Propose Goal Draft",
    description: "Open a structured /goal draft for user review. Saves only after the user chooses Start.",
    promptSnippet: "Use propose_goal_draft to draft a reviewable /goal proposal exactly once.",
    promptGuidelines: [
      "Use propose_goal_draft for plain /goal drafting turns that need user review.",
      "Provide objective and concrete acceptance criteria.",
      "Call propose_goal_draft exactly once.",
    ],
    parameters: {
      type: "object",
      properties: {
        objective: { type: "string", description: "The concise objective." },
        description: { type: "string", description: "Optional context summary." },
        acceptanceCriteria: { type: "array", items: { type: "string" }, description: "Concrete completion checks." },
        sourcePaths: { type: "array", items: { type: "string" }, description: "Optional source paths." },
        startImmediately: { type: "boolean", description: "True when the draft should offer Start." },
        draftId: { type: "string", description: "Optional draft correlation id." },
      },
      required: ["objective", "acceptanceCriteria"],
    },
    async execute(_id, params, _signal, _update, ctx) {
      const p = params as Record<string, unknown>;
      const objective = String(p.objective ?? "").trim();
      const criteria = normalizeStringList(p.acceptanceCriteria as string[] | undefined);

      if (!objective) return err("Goal draft objective is required.", "invalid_objective");
      if (criteria.length === 0) return err("Goal draft must include at least one acceptance criterion.", "invalid_acceptance_criteria");

      if (!ctx.hasUI || !ctx.ui?.select || !ctx.ui.editor) {
        return {
          content: [{ type: "text", text: "Goal draft requires interactive review. No goal was saved." }],
          details: { status: "cancelled", reason: "review_ui_unavailable", goal: null },
        };
      }

      const current = loadGoalState(ctx);
      const proposal: GoalDraftProposal = {
        objective,
        acceptanceCriteria: criteria,
        description: typeof p.description === "string" ? p.description : undefined,
        sourcePaths: normalizeStringList(p.sourcePaths as string[] | undefined),
      };

      // Review flow
      let reviewProposal = proposal;
      while (true) {
        const choice = await ctx.ui.select?.("Review generated goal proposal", ["Start", "Edit", "Cancel"]);
        if (choice === "Start") break;
        if (choice === "Cancel" || choice === undefined) {
          return ok("Goal proposal cancelled; no goal was saved.");
        }
        if (choice !== "Edit") continue;

        const edited = await ctx.ui.editor("Edit goal proposal", renderEditableGoalDraft(reviewProposal));
        if (edited === undefined) continue;

        const parsed = parseEditableGoalDraft(edited);
        if (!parsed) continue;
        reviewProposal = { ...reviewProposal, ...parsed };
      }

      // Save
      const action = current ? "replace" : "create";
      const next = saveGoalState(
        pi,
        {
          action,
          goalId: crypto.randomUUID(),
          objective: reviewProposal.objective,
          now: Date.now(),
          owner: "user",
          sourceDocs: sourceDocsFromPaths(reviewProposal.sourcePaths),
          acceptanceCriteria: reviewProposal.acceptanceCriteria,
          reason: `Saved from ${action} via propose_goal_draft.`,
        },
        current,
      );

      // Offer start
      const startImmediately = p.startImmediately === true;
      if (startImmediately && next) {
        await startActiveGoal(pi, ctx, next.goalId);
      } else if (next && ctx.hasUI) {
        const ok2 = await ctx.ui.confirm("Start working on this goal now?", next.objective);
        if (ok2 && next) {
          await startActiveGoal(pi, ctx, next.goalId);
        }
      }

      return ok(`Saved goal draft${action === "replace" ? " and replaced" : ""}: ${next?.objective}`);
    },
  });

  // complete_goal
  pi.registerTool({
    name: "complete_goal",
    label: "Complete Goal",
    description: "Mark the active goal complete when the objective is achieved.",
    promptSnippet: "Use complete_goal to mark the current /goal complete with evidence.",
    promptGuidelines: [
      "Use complete_goal only when the active goal is achieved and no required work remains.",
      "Include evidence when possible.",
    ],
    parameters: {
      type: "object",
      properties: {
        evidence: { type: "string", description: "Evidence that the goal is complete." },
      },
    },
    async execute(_id, params, _signal, _update, ctx) {
      const p = params as Record<string, unknown>;
      const current = loadGoalState(ctx);
      if (!current) return err("No active goal exists to complete.", "no_goal");
      if (current.status === "complete") return err("The current goal is already complete.", "already_complete", current);
      if (current.status !== "active") return err("Only active goals can be completed.", "goal_inactive", current);

      const evidence = typeof p.evidence === "string" ? p.evidence.trim() : "";
      const next = saveGoalState(
        pi,
        {
          action: "complete",
          goalId: current.goalId,
          now: Date.now(),
          reason: evidence ? `Completed with evidence: ${evidence}` : "Completed by complete_goal.",
        },
        current,
      );

      return ok(evidence ? `Goal complete. Evidence: ${evidence}` : "Goal complete.");
    },
  });

  // update_goal_progress
  pi.registerTool({
    name: "update_goal_progress",
    label: "Update Goal Progress",
    description: "Update execution progress for the active goal without changing objective or criteria.",
    promptSnippet: "Use update_goal_progress to update /goal progress fields only.",
    promptGuidelines: ["Use update_goal_progress only for implementation progress."],
    parameters: {
      type: "object",
      properties: {
        done: { type: "array", items: { type: "string" }, description: "Completed items." },
        current: { type: "string", description: "Current work item." },
        blocked: { type: "array", items: { type: "string" }, description: "Current blockers." },
        summary: { type: "string", description: "Short progress summary." },
      },
    },
    async execute(_id, params, _signal, _update, ctx) {
      const p = params as Record<string, unknown>;
      const current = loadGoalState(ctx);
      if (!current) return err("No active goal exists to update.", "no_goal");
      if (current.status === "complete") return err("Cannot update progress for a complete goal.", "already_complete", current);
      if (current.status !== "active") return err("Only active goals can receive progress updates.", "goal_inactive", current);

      const progress: Partial<GoalProgress> = {
        done: normalizeStringList(p.done as string[] | undefined),
        current: typeof p.current === "string" ? p.current : undefined,
        blocked: normalizeStringList(p.blocked as string[] | undefined),
        lastSummary: typeof p.summary === "string" ? p.summary : undefined,
      };

      const next = saveGoalState(
        pi,
        {
          action: "progress",
          goalId: current.goalId,
          now: Date.now(),
          progress,
          reason: "Updated by update_goal_progress.",
        },
        current,
      );

      return ok("Goal progress updated");
    },
  });

  // ─── Goal Command ────────────────────────────────────────────────

  pi.registerCommand("goal", {
    description: "Set or view the goal for a long-running task",
    getArgumentCompletions: (prefix) => {
      const items = ["status", "edit", "pause", "resume", "start", "clear", "complete", "import"];
      return items.filter((c) => c.startsWith(prefix)).map((v) => ({ value: v, label: v }));
    },
    handler: async (args, ctx) => {
      await handleGoalCommand(pi, args, ctx);
    },
  });
}

// ─── Command Handler ────────────────────────────────────────────────

async function handleGoalCommand(
  pi: ExtensionAPI,
  args: string,
  ctx: { cwd: string; hasUI: boolean; ui: { notify: (msg: string, level?: "info" | "warning" | "error") => void; confirm: (title: string, message: string) => Promise<boolean>; select?: (title: string, options: string[]) => Promise<string | undefined>; editor: (title: string, initialValue: string) => Promise<string | undefined>; setStatus: (key: string, value: string | undefined) => void }; waitForIdle: () => Promise<void>; sessionManager: { getBranch(): SessionEntry[] } },
): Promise<void> {
  const parsed = parseGoalCommand(args);

  if (parsed.kind === "show" || parsed.kind === "status") {
    const goal = loadGoalState(ctx);
    if (!goal) {
      ctx.ui.notify(GOAL_USAGE, "info");
      return;
    }
    ctx.ui.notify(parsed.kind === "status" ? renderGoalStatus(goal) : renderGoalSummary(goal), "info");
    return;
  }

  if (parsed.kind === "import") {
    await handleImport(pi, ctx, parsed);
    return;
  }

  await ctx.waitForIdle();
  const goal = loadGoalState(ctx);

  try {
    switch (parsed.kind) {
      case "create": {
        if (!parsed.objective) {
          ctx.ui.notify("Usage: /goal <objective> [--replace] [--start]", "error");
          return;
        }
        await handleCreateOrReplace(pi, ctx, parsed, goal);
        break;
      }
      case "start": {
        const ok = await startActiveGoal(pi, ctx, goal?.goalId);
        if (!ok) ctx.ui.notify("Failed to start goal.", "error");
        break;
      }
      case "edit": {
        await handleEdit(pi, ctx, goal);
        break;
      }
      case "pause": {
        if (!goal) { ctx.ui.notify("No active goal to pause.", "error"); return; }
        const latest = loadGoalState(ctx);
        if (!latest || latest.goalId !== goal.goalId) { ctx.ui.notify("Goal changed.", "error"); return; }
        if (latest.status !== "active") { ctx.ui.notify("Only active goals can be paused.", "error"); return; }
        saveGoalState(pi, { action: "pause", goalId: latest.goalId, now: Date.now() }, latest);
        ctx.ui.notify("Goal paused.", "info");
        break;
      }
      case "resume": {
        if (!goal) { ctx.ui.notify("No paused goal to resume.", "error"); return; }
        const latest = loadGoalState(ctx);
        if (!latest || latest.goalId !== goal.goalId) { ctx.ui.notify("Goal changed.", "error"); return; }
        if (latest.status !== "paused") { ctx.ui.notify("Only paused goals can be resumed.", "error"); return; }
        const next = saveGoalState(pi, { action: "resume", goalId: latest.goalId, now: Date.now() }, latest);
        ctx.ui.notify("Goal resumed.", "info");
        if (next && parsed.start) {
          await startActiveGoal(pi, ctx, next.goalId);
        } else if (next && ctx.hasUI) {
          const ok = await ctx.ui.confirm("Start working on this goal now?", next.objective);
          if (ok) await startActiveGoal(pi, ctx, next.goalId);
        }
        break;
      }
      case "clear": {
        if (!goal) { ctx.ui.notify("No goal to clear.", "error"); return; }
        if (!parsed.confirmed) {
          if (!ctx.hasUI) {
            ctx.ui.notify("Use /goal clear --yes to clear.", "error");
            return;
          }
          const ok = await ctx.ui.confirm("Clear goal?", goal.objective);
          if (!ok) { ctx.ui.notify("Cancelled.", "info"); return; }
        }
        const latest = loadGoalState(ctx);
        if (!latest || latest.goalId !== goal.goalId) { ctx.ui.notify("Goal changed.", "error"); return; }
        saveGoalState(pi, { action: "clear", goalId: latest.goalId, now: Date.now() }, latest);
        ctx.ui.notify("Goal cleared.", "info");
        break;
      }
      case "complete": {
        if (!goal) { ctx.ui.notify("No active goal to complete.", "error"); return; }
        if (!parsed.confirmed) {
          if (!ctx.hasUI) {
            ctx.ui.notify("Use /goal complete --yes to complete.", "error");
            return;
          }
          const ok = await ctx.ui.confirm("Mark goal complete?", goal.objective);
          if (!ok) { ctx.ui.notify("Cancelled.", "info"); return; }
        }
        const latest = loadGoalState(ctx);
        if (!latest || latest.goalId !== goal.goalId) { ctx.ui.notify("Goal changed.", "error"); return; }
        if (latest.status !== "active") { ctx.ui.notify("Only active goals can be completed.", "error"); return; }
        saveGoalState(pi, { action: "complete", goalId: latest.goalId, now: Date.now() }, latest);
        ctx.ui.notify("Goal marked complete.", "info");
        break;
      }
    }
  } catch (error) {
    ctx.ui.notify(error instanceof Error ? error.message : String(error), "error");
  }
}

// ─── Command Parsing ────────────────────────────────────────────────

interface ParsedGoalCommand {
  kind: "show" | "status" | "create" | "edit" | "pause" | "resume" | "start" | "clear" | "complete" | "import";
  objective?: string;
  confirmed: boolean;
  replace: boolean;
  start: boolean;
}

const CONTROL_COMMANDS = new Set(["status", "edit", "pause", "resume", "start", "clear", "complete", "import"]);
const RECOGNIZED_FLAGS = new Set(["--yes", "-y", "--replace", "--start"]);

function parseGoalCommand(args: string): ParsedGoalCommand {
  const trimmed = args.trim();
  if (!trimmed) return { kind: "show", confirmed: false, replace: false, start: false };

  const tokens = trimmed.split(/\s+/);
  const [first = ""] = tokens;
  const flags = new Set(tokens.filter((t) => t.startsWith("-")));
  const confirmed = flags.has("--yes") || flags.has("-y");
  const replace = flags.has("--replace");
  const start = flags.has("--start");

  if (first === "status") return { kind: "status", confirmed, replace, start };
  if (first === "edit") return { kind: "edit", confirmed, replace, start };
  if (first === "pause") return { kind: "pause", confirmed, replace, start };
  if (first === "resume") return { kind: "resume", confirmed, replace, start };
  if (first === "start") return { kind: "start", confirmed, replace, start: true };
  if (first === "clear") return { kind: "clear", confirmed, replace, start };
  if (first === "complete") return { kind: "complete", confirmed, replace, start };
  if (first === "import") {
    const pathArg = tokens.slice(1).filter((t) => !t.startsWith("-")).join(" ").trim();
    return { kind: "import", confirmed, replace, start };
  }

  const objective = tokens.filter((t) => !RECOGNIZED_FLAGS.has(t)).join(" ").trim();
  return { kind: "create", objective, confirmed, replace, start };
}

// ─── Command Handlers ───────────────────────────────────────────────

async function handleCreateOrReplace(
  pi: ExtensionAPI,
  ctx: { hasUI: boolean; ui: { notify: (msg: string, level?: "info" | "warning" | "error") => void; confirm: (title: string, message: string) => Promise<boolean>; select?: (title: string, options: string[]) => Promise<string | undefined>; editor: (title: string, initialValue: string) => Promise<string | undefined>; setStatus: (key: string, value: string | undefined) => void }; sessionManager: { getBranch(): SessionEntry[] }; sendUserMessage?: (content: string | (TextContent | ImageContent)[], options?: { deliverAs?: "followUp" | "steer" }) => Promise<void>; waitForIdle: () => Promise<void>; cwd: string },
  parsed: ParsedGoalCommand,
  current: GoalState | null,
): Promise<void> {
  const objective = parsed.objective ?? "";
  if (!objective) {
    // Open editor for objective
    if (!ctx.hasUI) {
      ctx.ui.notify("/goal requires an objective or use /goal draft for interactive mode.", "error");
      return;
    }
    const edited = await ctx.ui.editor("Goal Objective", "");
    if (!edited) { ctx.ui.notify("Cancelled.", "info"); return; }
    // Fall through with edited objective
    const newParsed: ParsedGoalCommand = { ...parsed, objective: edited.trim() };
    await handleCreateOrReplace(pi, ctx, newParsed, current);
    return;
  }

  const action = await confirmGoalReplacement(ctx, current, parsed.replace, objective);
  if (!action) return;

  if (!ctx.sendUserMessage) {
    ctx.ui.notify("Cannot draft goal: messaging API unavailable.", "error");
    return;
  }

  ctx.sendUserMessage(
    renderGoalDraftingPrompt(objective, {
      start: parsed.start,
      replacingExistingGoal: action === "replace",
      currentGoal: current ?? undefined,
    }),
    { deliverAs: "followUp" },
  );
  ctx.ui.notify("Goal draft queued for review.", "info");
}

async function handleEdit(
  pi: ExtensionAPI,
  ctx: { hasUI: boolean; ui: { notify: (msg: string, level?: "info" | "warning" | "error") => void; confirm: (title: string, message: string) => Promise<boolean>; select?: (title: string, options: string[]) => Promise<string | undefined>; editor: (title: string, initialValue: string) => Promise<string | undefined>; setStatus: (key: string, value: string | undefined) => void }; sessionManager: { getBranch(): SessionEntry[] }; sendUserMessage?: (content: string | (TextContent | ImageContent)[], options?: { deliverAs?: "followUp" | "steer" }) => Promise<void>; waitForIdle: () => Promise<void>; cwd: string },
  current: GoalState | null,
): Promise<void> {
  if (!current) { ctx.ui.notify("No active goal to edit.", "error"); return; }
  if (!ctx.hasUI) {
    ctx.ui.notify("/goal edit requires interactive UI.", "error");
    return;
  }

  const edited = await ctx.ui.editor("Edit goal", renderEditableGoalDraft({
    objective: current.objective,
    acceptanceCriteria: current.acceptanceCriteria,
  }));
  if (edited === undefined) { ctx.ui.notify("Cancelled.", "info"); return; }

  const latest = loadGoalState(ctx);
  if (!latest || latest.goalId !== current.goalId) {
    ctx.ui.notify("Goal changed while editing.", "error");
    return;
  }

  const draft = parseEditableGoalDraft(edited);
  if (!draft) { ctx.ui.notify("Invalid edit format.", "error"); return; }

  saveGoalState(
    pi,
    {
      action: "edit",
      goalId: latest.goalId,
      objective: draft.objective,
      acceptanceCriteria: draft.acceptanceCriteria,
      now: Date.now(),
      reason: "Edited via /goal edit.",
    },
    latest,
  );
  ctx.ui.notify("Goal updated.", "info");
}

async function handleImport(
  pi: ExtensionAPI,
  ctx: { hasUI: boolean; ui: { notify: (msg: string, level?: "info" | "warning" | "error") => void; confirm: (title: string, message: string) => Promise<boolean>; select?: (title: string, options: string[]) => Promise<string | undefined>; editor: (title: string, initialValue: string) => Promise<string | undefined>; setStatus: (key: string, value: string | undefined) => void }; sessionManager: { getBranch(): SessionEntry[] }; sendUserMessage?: (content: string | (TextContent | ImageContent)[], options?: { deliverAs?: "followUp" | "steer" }) => Promise<void>; waitForIdle: () => Promise<void>; cwd: string },
  parsed: ParsedGoalCommand,
): Promise<void> {
  const pathArg = parseGoalCommand("import " + (parsed.objective ?? "")).objective;
  if (!pathArg) {
    ctx.ui.notify("Usage: /goal import <path>", "error");
    return;
  }

  const current = loadGoalState(ctx);
  if (current && current.status !== "active") {
    ctx.ui.notify(`Cannot import into a ${current.status} goal. Resume or clear first.`, "error");
    return;
  }

  try {
    const imported = await importGoalSources(pathArg, ctx.cwd);
    const summary = [
      `Objective: ${imported.objective}`,
      `Source docs: ${imported.sourcePaths.join(", ")}`,
      `Acceptance criteria: ${imported.acceptanceCriteria.length}`,
      `Constraints: ${imported.constraints.length}`,
    ].join("\n");

    if (!parsed.confirmed) {
      if (!ctx.hasUI) {
        ctx.ui.notify("/goal import requires --yes in non-interactive mode.", "error");
        return;
      }
      const ok = await ctx.ui.confirm(
        current ? "Import docs into current goal?" : "Create goal from import?",
        summary,
      );
      if (!ok) { ctx.ui.notify("Cancelled.", "info"); return; }
    }

    const latest = loadGoalState(ctx);
    if (latest && latest.status !== "active") {
      ctx.ui.notify(`Cannot import into a ${latest.status} goal.`, "error");
      return;
    }

    if (current?.goalId !== latest?.goalId) {
      ctx.ui.notify("Goal changed before saving.", "error");
      return;
    }

    const next = latest
      ? saveGoalState(
          pi,
          {
            action: "import-docs",
            goalId: latest.goalId,
            now: Date.now(),
            sourceDocs: imported.sourceDocs,
            constraints: imported.constraints.length > 0 ? imported.constraints : undefined,
            acceptanceCriteria: imported.acceptanceCriteria.length > 0 ? imported.acceptanceCriteria : undefined,
            reason: `Imported docs: ${imported.sourcePaths.join(", ")}`,
          },
          latest,
        )
      : saveGoalState(
          pi,
          {
            action: "create",
            goalId: crypto.randomUUID(),
            objective: imported.objective,
            now: Date.now(),
            owner: "user",
            sourceDocs: imported.sourceDocs,
            constraints: imported.constraints,
            acceptanceCriteria: imported.acceptanceCriteria,
            reason: `Created from import: ${imported.sourcePaths.join(", ")}`,
          },
          null,
        );

    ctx.ui.notify(latest ? "Goal docs imported." : "Goal created from import.", "info");
    if (next && ctx.hasUI) {
      const ok = await ctx.ui.confirm("Start working on this goal now?", next.objective);
      if (ok) await startActiveGoal(pi, ctx, next.goalId);
    }
  } catch (error) {
    ctx.ui.notify(error instanceof Error ? error.message : String(error), "error");
  }
}

// ─── Helpers ────────────────────────────────────────────────────────

function normalizeStringList(values?: string[]): string[] {
  return [...new Set((values ?? []).map((v) => v.trim()).filter((v) => v.length > 0))];
}

function sourceDocsFromPaths(paths?: string[]): GoalSourceDoc[] {
  return (paths ?? []).map((p) => ({
    path: p,
    kind: "manual",
    brief: "Source path explicitly provided.",
    extractedAt: Date.now(),
  }));
}

function parseEditableGoalDraft(text: string): { objective: string; acceptanceCriteria: string[] } | null {
  const objectiveMatch = text.match(/##\s*Objective\s*\n(.+?)(?=\n##|$)/s);
  const criteriaMatch = text.match(/##\s*Acceptance\s+Criteria\s*\n([\s\S]*?)(?=\n##|$)/);

  if (!objectiveMatch) return null;

  const objective = objectiveMatch[1].trim();
  if (!objective) return null;

  const criteria: string[] = [];
  if (criteriaMatch) {
    const lines = criteriaMatch[1].split("\n");
    for (const line of lines) {
      const match = line.match(/^-?\s*\[?\s*[xX\s]\s*\]?\s*(.+)$/);
      if (match) {
        const item = match[1].trim();
        if (item) criteria.push(item);
      }
    }
  }

  return { objective, acceptanceCriteria: criteria.length > 0 ? criteria : ["Complete the objective"] };
}

async function confirmGoalReplacement(
  ctx: { hasUI: boolean; ui: { notify: (msg: string, level?: "info" | "warning" | "error") => void; confirm: (title: string, message: string) => Promise<boolean> } },
  current: GoalState | null,
  replace: boolean,
  proposedObjective: string,
): Promise<"create" | "replace" | null> {
  if (!current) return "create";
  if (!replace) {
    if (!ctx.hasUI) {
      ctx.ui.notify("A goal already exists. Re-run with --replace.", "error");
      return null;
    }
    const ok = await ctx.ui.confirm(
      "Replace current goal?",
      `Current: ${current.objective}\n\nNew: ${proposedObjective}`,
    );
    if (!ok) { ctx.ui.notify("Cancelled.", "info"); return null; }
  }
  return "replace";
}

async function startActiveGoal(
  pi: ExtensionAPI,
  ctx: { hasUI: boolean; ui: { notify: (msg: string, level?: "info" | "warning" | "error") => void }; sessionManager: { getBranch(): SessionEntry[] }; sendUserMessage?: (content: string | (TextContent | ImageContent)[], options?: { deliverAs?: "followUp" | "steer" }) => Promise<void> },
  expectedGoalId?: string,
): Promise<boolean> {
  const latest = loadGoalState(ctx);
  if (!latest) {
    ctx.ui.notify("No active goal to start.", "error");
    return false;
  }
  if (expectedGoalId && latest.goalId !== expectedGoalId) {
    ctx.ui.notify("Goal changed before starting.", "error");
    return false;
  }
  if (latest.status !== "active") {
    ctx.ui.notify(`Cannot start a ${latest.status} goal.`, "error");
    return false;
  }
  if (!ctx.sendUserMessage) {
    ctx.ui.notify("Cannot start goal: messaging API unavailable.", "error");
    return false;
  }

  ctx.sendUserMessage(renderGoalStartPrompt(latest), { deliverAs: "followUp" });
  ctx.ui.notify("Goal start queued.", "info");
  return true;
}

function renderGoalSummary(goal: GoalState): string {
  return `Goal: ${goal.objective} (${goal.status})`;
}

const GOAL_USAGE = `Goal tracking commands:
  /goal                           Show current goal or help
  /goal <objective>               Create a new goal (draft mode)
  /goal <objective> --replace     Replace existing goal
  /goal status                    Show full goal details
  /goal edit                      Edit objective/criteria interactively
  /goal pause                     Pause the active goal
  /goal resume [--start]          Resume a paused goal
  /goal start                     Start working on the active goal
  /goal complete [--yes]          Mark goal complete
  /goal clear [--yes]             Clear the current goal
  /goal import <path> [--yes]     Import docs to create/update a goal`;
