/**
 * Tests for pi-goal-custom — the custom goal tracking extension.
 * Run with: npx tsx --test goal.test.ts
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

// ─── Minimal state machine (mirrors index.ts) ──────────────────────

type GoalStatus = "active" | "paused" | "complete";
type GoalOwner = "user" | "model";

interface GoalSourceDoc {
  path: string;
  kind: "prd" | "doc" | "directory" | "manual";
  brief: string;
  extractedAt: number;
}

interface GoalProgress {
  done: string[];
  current?: string;
  blocked: string[];
  lastSummary: string;
}

interface GoalState {
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

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((i) => typeof i === "string");
}

function isGoalState(v: unknown): v is GoalState {
  return (
    isRecord(v) &&
    v.version === 1 &&
    typeof v.goalId === "string" &&
    typeof v.objective === "string" &&
    ["active", "paused", "complete"].includes(v.status) &&
    Array.isArray(v.sourceDocs) &&
    v.sourceDocs.every((d) => isRecord(d) && typeof d.path === "string" && typeof d.brief === "string") &&
    isStringArray(v.constraints) &&
    isStringArray(v.acceptanceCriteria) &&
    isRecord(v.progress) &&
    isStringArray(v.progress.done) &&
    isStringArray(v.progress.blocked) &&
    typeof v.progress.lastSummary === "string" &&
    typeof v.createdAt === "number" &&
    typeof v.updatedAt === "number" &&
    (v.owner === "user" || v.owner === "model")
  );
}

function isGoalStateAction(v: unknown): v is string {
  return ["create", "replace", "edit", "pause", "resume", "clear", "complete", "progress", "import-docs", "set"].includes(v as string);
}

function parseEvent(data: unknown): { action: string; goalId?: string; now?: number; [k: string]: unknown } | undefined {
  if (!isRecord(data) || !isGoalStateAction(data.action) || data.action === "set") return undefined;
  if (typeof data.goalId !== "string" || typeof data.now !== "number") return undefined;
  return data;
}

function reduce(current: GoalState | null, event: { action: string; goalId?: string; now?: number; [k: string]: unknown }): GoalState | null {
  if (!event.goalId || !event.now) return current;
  const isCurrent = current !== null && current.goalId === event.goalId;

  switch (event.action) {
    case "create":
    case "replace": {
      const obj = String(event.objective ?? "").trim();
      if (!obj) return null;
      return {
        version: 1,
        goalId: event.goalId,
        objective: obj,
        status: "active",
        sourceDocs: Array.isArray(event.sourceDocs) ? event.sourceDocs : [],
        constraints: Array.isArray(event.constraints) ? event.constraints : [],
        acceptanceCriteria: Array.isArray(event.acceptanceCriteria) ? event.acceptanceCriteria : [],
        progress: { done: [], current: undefined, blocked: [], lastSummary: "" },
        createdAt: event.now,
        updatedAt: event.now,
        owner: (event.owner === "user" || event.owner === "model") ? event.owner : "user",
      };
    }
    case "edit":
      return isCurrent
        ? { ...current, objective: String(event.objective ?? current.objective).trim(), updatedAt: event.now }
        : current;
    case "pause":
      return isCurrent && current.status === "active" ? { ...current, status: "paused", updatedAt: event.now } : current;
    case "resume":
      return isCurrent && current.status === "paused" ? { ...current, status: "active", updatedAt: event.now } : current;
    case "clear":
      return isCurrent ? null : current;
    case "complete":
      return isCurrent && current.status === "active" ? { ...current, status: "complete", updatedAt: event.now, completedAt: event.now } : current;
    case "progress":
      return isCurrent && current.status === "active"
        ? { ...current, progress: { ...current.progress, ...(event.progress ?? {}) }, updatedAt: event.now }
        : current;
    default:
      return current;
  }
}

function loadGoalState(entries: Array<{ type: string; customType?: string; data?: unknown }>): GoalState | null {
  let current: GoalState | null = null;
  for (const entry of entries) {
    if (entry.type !== "custom" || entry.customType !== "goal-state") continue;
    const data = entry.data;
    if (!isRecord(data) || !isGoalStateAction(data.action) || !("state" in data)) continue;
    const event = parseEvent(data.event);
    if (event) {
      current = reduce(current, event);
    } else if (data.action === "clear") {
      current = data.state === null ? null : current;
    } else if (isGoalState(data.state)) {
      if (data.action === "create" || data.action === "replace" || data.action === "set") {
        current = data.state;
      } else if (current?.goalId === data.state.goalId) {
        current = data.state;
      }
    }
  }
  return current ? { ...current, sourceDocs: [...current.sourceDocs], constraints: [...current.constraints], acceptanceCriteria: [...current.acceptanceCriteria], progress: { ...current.progress, done: [...current.progress.done], blocked: [...current.progress.blocked] } } : null;
}

// ─── Tests ──────────────────────────────────────────────────────────

describe("Goal State Machine", () => {
  it("creates a goal", () => {
    const now = Date.now();
    const result = reduce(null, { action: "create", goalId: "g1", objective: "Build a web app", now });
    assert.ok(result);
    assert.strictEqual(result!.objective, "Build a web app");
    assert.strictEqual(result!.status, "active");
  });

  it("replaces an existing goal", () => {
    const now = Date.now();
    let s = reduce(null, { action: "create", goalId: "g1", objective: "Old", now });
    s = reduce(s, { action: "replace", goalId: "g2", objective: "New", now: now + 1 });
    assert.strictEqual(s!.goalId, "g2");
    assert.strictEqual(s!.objective, "New");
  });

  it("pauses and resumes a goal", () => {
    const now = Date.now();
    let s = reduce(null, { action: "create", goalId: "g1", objective: "Test", now });
    assert.strictEqual(s!.status, "active");
    s = reduce(s, { action: "pause", goalId: "g1", now: now + 1 });
    assert.strictEqual(s!.status, "paused");
    s = reduce(s, { action: "resume", goalId: "g1", now: now + 2 });
    assert.strictEqual(s!.status, "active");
  });

  it("completes a goal", () => {
    const now = Date.now();
    let s = reduce(null, { action: "create", goalId: "g1", objective: "Test", now });
    s = reduce(s, { action: "complete", goalId: "g1", now: now + 1 });
    assert.strictEqual(s!.status, "complete");
    assert.ok(s!.completedAt);
  });

  it("cannot complete a paused goal", () => {
    const now = Date.now();
    let s = reduce(null, { action: "create", goalId: "g1", objective: "Test", now });
    s = reduce(s, { action: "pause", goalId: "g1", now: now + 1 });
    s = reduce(s, { action: "complete", goalId: "g1", now: now + 2 });
    assert.strictEqual(s!.status, "paused");
  });

  it("clears a goal", () => {
    const now = Date.now();
    let s = reduce(null, { action: "create", goalId: "g1", objective: "Test", now });
    assert.ok(s);
    s = reduce(s, { action: "clear", goalId: "g1", now: now + 1 });
    assert.strictEqual(s, null);
  });

  it("updates progress", () => {
    const now = Date.now();
    let s = reduce(null, { action: "create", goalId: "g1", objective: "Test", now });
    s = reduce(s, { action: "progress", goalId: "g1", now: now + 1, progress: { done: ["item1"], current: "item2", blocked: ["blocker1"], lastSummary: "working" } });
    assert.strictEqual(s!.progress.done.length, 1);
    assert.strictEqual(s!.progress.current, "item2");
    assert.strictEqual(s!.progress.blocked.length, 1);
  });

  it("edits a goal", () => {
    const now = Date.now();
    let s = reduce(null, { action: "create", goalId: "g1", objective: "Old", now });
    s = reduce(s, { action: "edit", goalId: "g1", objective: "New", now: now + 1 });
    assert.strictEqual(s!.objective, "New");
  });

  it("ignores events for wrong goal id", () => {
    const now = Date.now();
    let s = reduce(null, { action: "create", goalId: "g1", objective: "Test", now });
    s = reduce(s, { action: "pause", goalId: "g2", now: now + 1 });
    assert.strictEqual(s!.status, "active");
  });

  it("ignores events for wrong goal id on clear", () => {
    const now = Date.now();
    let s = reduce(null, { action: "create", goalId: "g1", objective: "Test", now });
    s = reduce(s, { action: "clear", goalId: "g2", now: now + 1 });
    assert.ok(s);
    assert.strictEqual(s!.goalId, "g1");
  });

  it("rejects empty objective", () => {
    const result = reduce(null, { action: "create", goalId: "g1", objective: "", now: Date.now() });
    assert.strictEqual(result, null);
  });

  it("trims objective whitespace", () => {
    const result = reduce(null, { action: "create", goalId: "g1", objective: "  Build a thing  ", now: Date.now() });
    assert.strictEqual(result!.objective, "Build a thing");
  });
});

describe("Persistence (load from entries)", () => {
  it("loads state from a create entry", () => {
    const now = Date.now();
    const entries = [
      {
        type: "custom",
        customType: "goal-state",
        data: {
          action: "create",
          state: {
            version: 1, goalId: "g1", objective: "Test", status: "active",
            sourceDocs: [], constraints: [], acceptanceCriteria: ["Loads"],
            progress: { done: [], current: undefined, blocked: [], lastSummary: "" },
            createdAt: now, updatedAt: now, owner: "user",
          },
          event: { action: "create", goalId: "g1", objective: "Test", now },
        },
      },
    ];
    const goal = loadGoalState(entries);
    assert.ok(goal);
    assert.strictEqual(goal!.objective, "Test");
  });

  it("replays multiple events", () => {
    const now = Date.now();
    const entries = [
      {
        type: "custom", customType: "goal-state",
        data: {
          action: "create",
          state: {
            version: 1, goalId: "g1", objective: "Test", status: "active",
            sourceDocs: [], constraints: [], acceptanceCriteria: [],
            progress: { done: [], current: undefined, blocked: [], lastSummary: "" },
            createdAt: now, updatedAt: now, owner: "user",
          },
          event: { action: "create", goalId: "g1", objective: "Test", now },
        },
      },
      {
        type: "custom", customType: "goal-state",
        data: {
          action: "progress",
          state: null,
          event: { action: "progress", goalId: "g1", now: now + 1, progress: { done: ["item1"], lastSummary: "done" } },
        },
      },
    ];
    const goal = loadGoalState(entries);
    assert.ok(goal);
    assert.strictEqual(goal!.progress.done.length, 1);
    assert.strictEqual(goal!.progress.done[0], "item1");
  });

  it("ignores non-goal entries", () => {
    const now = Date.now();
    const entries = [
      { type: "message", customType: "user-message", data: { text: "hello" } },
      {
        type: "custom", customType: "goal-state",
        data: {
          action: "create",
          state: {
            version: 1, goalId: "g1", objective: "Test", status: "active",
            sourceDocs: [], constraints: [], acceptanceCriteria: [],
            progress: { done: [], current: undefined, blocked: [], lastSummary: "" },
            createdAt: now, updatedAt: now, owner: "user",
          },
          event: { action: "create", goalId: "g1", objective: "Test", now },
        },
      },
    ];
    const goal = loadGoalState(entries);
    assert.ok(goal);
    assert.strictEqual(goal!.objective, "Test");
  });

  it("handles clear via state snapshot", () => {
    const now = Date.now();
    const entries = [
      {
        type: "custom", customType: "goal-state",
        data: {
          action: "create",
          state: {
            version: 1, goalId: "g1", objective: "Test", status: "active",
            sourceDocs: [], constraints: [], acceptanceCriteria: [],
            progress: { done: [], current: undefined, blocked: [], lastSummary: "" },
            createdAt: now, updatedAt: now, owner: "user",
          },
          event: { action: "create", goalId: "g1", objective: "Test", now },
        },
      },
      {
        type: "custom", customType: "goal-state",
        data: { action: "clear", state: null, event: { action: "clear", goalId: "g1", now: now + 1 } },
      },
    ];
    const goal = loadGoalState(entries);
    assert.strictEqual(goal, null);
  });
});

describe("Command Parsing", () => {
  function parse(args: string): { kind: string; objective?: string; confirmed: boolean; replace: boolean; start: boolean } {
    const trimmed = args.trim();
    if (!trimmed) return { kind: "show", confirmed: false, replace: false, start: false };
    const tokens = trimmed.split(/\s+/);
    const [first = ""] = tokens;
    const flags = new Set(tokens.filter((t) => t.startsWith("-")));
    const confirmed = flags.has("--yes") || flags.has("-y");
    const replace = flags.has("--replace");
    const start = flags.has("--start");

    const cmds = ["status", "edit", "pause", "resume", "start", "clear", "complete", "import"];
    if (cmds.includes(first)) {
      const isStart = first === "start" || flags.has("--start");
      return { kind: first, confirmed, replace, start: isStart };
    }

    const objective = tokens.filter((t) => !t.startsWith("-")).join(" ").trim();
    return { kind: "create", objective, confirmed, replace, start };
  }

  it("parses empty args as show", () => {
    const r = parse("");
    assert.strictEqual(r.kind, "show");
  });

  it("parses objective creation", () => {
    const r = parse("Build a web app");
    assert.strictEqual(r.kind, "create");
    assert.strictEqual(r.objective, "Build a web app");
  });

  it("parses --replace flag", () => {
    const r = parse("New goal --replace");
    assert.strictEqual(r.kind, "create");
    assert.strictEqual(r.replace, true);
  });

  it("parses --yes flag", () => {
    const r = parse("clear --yes");
    assert.strictEqual(r.kind, "clear");
    assert.strictEqual(r.confirmed, true);
  });

  it("parses status subcommand", () => {
    const r = parse("status");
    assert.strictEqual(r.kind, "status");
  });

  it("parses edit subcommand", () => {
    const r = parse("edit");
    assert.strictEqual(r.kind, "edit");
  });

  it("parses pause subcommand", () => {
    const r = parse("pause");
    assert.strictEqual(r.kind, "pause");
  });

  it("parses resume subcommand", () => {
    const r = parse("resume");
    assert.strictEqual(r.kind, "resume");
  });

  it("parses clear subcommand", () => {
    const r = parse("clear");
    assert.strictEqual(r.kind, "clear");
  });

  it("parses complete subcommand", () => {
    const r = parse("complete");
    assert.strictEqual(r.kind, "complete");
  });

  it("parses import subcommand", () => {
    const r = parse("import");
    assert.strictEqual(r.kind, "import");
  });

  it("parses start subcommand", () => {
    const r = parse("start");
    assert.strictEqual(r.kind, "start");
    assert.strictEqual(r.start, true);
  });

  it("parses multiple flags", () => {
    const r = parse("resume --start --yes");
    assert.strictEqual(r.kind, "resume");
    assert.strictEqual(r.start, true);
    assert.strictEqual(r.confirmed, true);
  });
});

describe("Goal Draft Parsing", () => {
  function parseDraft(text: string): { objective: string; acceptanceCriteria: string[] } | null {
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

  it("parses objective and criteria", () => {
    const text = `## Objective
Build a web app

## Acceptance Criteria
- [ ] Landing page loads
- [ ] Form submits
- [ ] Responsive design`;

    const result = parseDraft(text);
    assert.ok(result);
    assert.strictEqual(result!.objective, "Build a web app");
    assert.strictEqual(result!.acceptanceCriteria.length, 3);
    assert.strictEqual(result!.acceptanceCriteria[0], "Landing page loads");
  });

  it("parses with x in checkbox", () => {
    const text = `## Objective
Fix the bug

## Acceptance Criteria
- [x] Test passes
- [ ] Deploy`;

    const result = parseDraft(text);
    assert.ok(result);
    assert.strictEqual(result!.acceptanceCriteria.length, 2);
  });

  it("returns null for missing objective", () => {
    const result = parseDraft("## Acceptance Criteria\n- [ ] Test");
    assert.strictEqual(result, null);
  });

  it("defaults criteria when none found", () => {
    const text = `## Objective
Do something`;

    const result = parseDraft(text);
    assert.ok(result);
    assert.strictEqual(result!.acceptanceCriteria[0], "Complete the objective");
  });
});

describe("Context Building", () => {
  function buildContext(goal: GoalState): string {
    const lines: string[] = [];
    lines.push(`## Active Goal`);
    lines.push("");
    lines.push(`**Objective:** ${goal.objective}`);
    lines.push(`**Status:** ${goal.status}`);
    lines.push("");

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

  it("includes objective and status", () => {
    const goal: GoalState = {
      version: 1, goalId: "g1", objective: "Build a web app", status: "active",
      sourceDocs: [], constraints: [], acceptanceCriteria: [],
      progress: { done: [], current: undefined, blocked: [], lastSummary: "" },
      createdAt: Date.now(), updatedAt: Date.now(), owner: "user",
    };
    const ctx = buildContext(goal);
    assert.ok(ctx.includes("Build a web app"));
    assert.ok(ctx.includes("active"));
  });

  it("includes acceptance criteria", () => {
    const goal: GoalState = {
      version: 1, goalId: "g1", objective: "Test", status: "active",
      sourceDocs: [], constraints: [],
      acceptanceCriteria: ["Loads", "Submits"],
      progress: { done: [], current: undefined, blocked: [], lastSummary: "" },
      createdAt: Date.now(), updatedAt: Date.now(), owner: "user",
    };
    const ctx = buildContext(goal);
    assert.ok(ctx.includes("Loads"));
    assert.ok(ctx.includes("Submits"));
  });

  it("includes progress items", () => {
    const goal: GoalState = {
      version: 1, goalId: "g1", objective: "Test", status: "active",
      sourceDocs: [], constraints: [], acceptanceCriteria: [],
      progress: { done: ["item1"], current: "item2", blocked: ["blocker1"], lastSummary: "" },
      createdAt: Date.now(), updatedAt: Date.now(), owner: "user",
    };
    const ctx = buildContext(goal);
    assert.ok(ctx.includes("✅"));
    assert.ok(ctx.includes("🔄"));
    assert.ok(ctx.includes("🚫"));
  });

  it("wraps in goal tags", () => {
    const goal: GoalState = {
      version: 1, goalId: "g1", objective: "Test", status: "active",
      sourceDocs: [], constraints: [], acceptanceCriteria: [],
      progress: { done: [], current: undefined, blocked: [], lastSummary: "" },
      createdAt: Date.now(), updatedAt: Date.now(), owner: "user",
    };
    const ctx = buildContext(goal);
    assert.ok(ctx.startsWith("<goal>"));
    assert.ok(ctx.endsWith("</goal>"));
  });
});

describe("Doc Import", () => {
  function extractGoalFromDoc(content: string): {
    objective?: string;
    constraints: string[];
    acceptanceCriteria: string[];
  } {
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

    const findValue = (keys: string[]): string | undefined => {
      for (const key of keys) {
        for (const [sectionKey, sectionLines] of Object.entries(sections)) {
          if (sectionKey.includes(key) || key.includes(sectionKey)) {
            const text = sectionLines.join("\n").trim();
            if (text) return text.slice(0, 500);
          }
        }
      }
      return undefined;
    };

    const findList = (keys: string[]): string[] => {
      const values: string[] = [];
      for (const key of keys) {
        for (const [sectionKey, sectionLines] of Object.entries(sections)) {
          if (sectionKey.includes(key) || key.includes(sectionKey)) {
            const text = sectionLines.join("\n").trim();
            if (text) {
              const items = text.split(/[\n\r]+/).map((l) => l.replace(/^[-*•]\s*/, "").trim()).filter(Boolean);
              values.push(...items);
            }
          }
        }
      }
      return [...new Set(values)];
    };

    return {
      objective: findValue(["objective", "goal", "problem", "summary"]),
      constraints: findList(["constraints", "non-goals"]),
      acceptanceCriteria: findList(["acceptance criteria", "acceptance", "success criteria"]),
    };
  }

  it("extracts objective from heading", () => {
    const content = `# Goal

## Objective
Build a web app

## Acceptance Criteria
- Landing page loads
- Form submits`;

    const result = extractGoalFromDoc(content);
    assert.strictEqual(result.objective, "Build a web app");
    assert.strictEqual(result.acceptanceCriteria.length, 2);
  });

  it("extracts constraints", () => {
    const content = `## Constraints
- Must use TypeScript
- Must be performant`;

    const result = extractGoalFromDoc(content);
    assert.strictEqual(result.constraints.length, 2);
    assert.strictEqual(result.constraints[0], "Must use TypeScript");
  });

  it("handles markdown list items", () => {
    const content = `## Acceptance Criteria
- [ ] Task 1
- Task 2
- [x] Task 3`;

    const result = extractGoalFromDoc(content);
    assert.ok(result.acceptanceCriteria.length >= 1);
  });

  it("returns empty for unrecognized sections", () => {
    const content = `# Random Doc

Some random content that doesn't match any goal sections.`;

    const result = extractGoalFromDoc(content);
    assert.strictEqual(result.objective, undefined);
    assert.strictEqual(result.constraints.length, 0);
    assert.strictEqual(result.acceptanceCriteria.length, 0);
  });
});

describe("Integration", () => {
  it("full lifecycle: create → progress → pause → resume → complete", () => {
    const now = Date.now();
    let s: GoalState | null = null;

    // Create
    s = reduce(s, { action: "create", goalId: "g1", objective: "Build a web app", now });
    assert.ok(s);
    assert.strictEqual(s!.status, "active");

    // Progress
    s = reduce(s, { action: "progress", goalId: "g1", now: now + 1, progress: { done: ["setup"], current: "coding" } });
    assert.strictEqual(s!.progress.done.length, 1);

    // Pause
    s = reduce(s, { action: "pause", goalId: "g1", now: now + 2 });
    assert.strictEqual(s!.status, "paused");

    // Resume
    s = reduce(s, { action: "resume", goalId: "g1", now: now + 3 });
    assert.strictEqual(s!.status, "active");

    // Complete
    s = reduce(s, { action: "complete", goalId: "g1", now: now + 4 });
    assert.strictEqual(s!.status, "complete");
    assert.ok(s!.completedAt);
  });

  it("persistence survives re-creation from entries", () => {
    const now = Date.now();
    const entries: Array<{ type: string; customType?: string; data?: unknown }> = [];

    function addEntry(action: string, state: GoalState | null, event: { [k: string]: unknown }) {
      entries.push({
        type: "custom",
        customType: "goal-state",
        data: { action, state: state ? { ...state } : null, event },
      });
    }

    // Create
    let s = reduce(null, { action: "create", goalId: "g1", objective: "Test", now });
    addEntry("create", s, { action: "create", goalId: "g1", objective: "Test", now });

    // Progress
    s = reduce(s, { action: "progress", goalId: "g1", now: now + 1, progress: { done: ["item1"] } });
    addEntry("progress", s, { action: "progress", goalId: "g1", now: now + 1, progress: { done: ["item1"] } });

    // Load from entries
    const loaded = loadGoalState(entries);
    assert.ok(loaded);
    assert.strictEqual(loaded!.objective, "Test");
    assert.strictEqual(loaded!.progress.done.length, 1);
  });
});
