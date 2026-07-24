---
name: dependency-minimalist
description: |-
  Evaluate whether a new dependency is actually needed before adding it.
  Prefers standard library, existing dependencies, small utilities, and simple
  code over adding packages. Produces a dependency decision note when anything
  new is added. Use proactively when a request would introduce a new package,
  audit existing dependencies for bloat, or simplify a dependency tree.

  Examples:
  - user: "Install lodash for this" → evaluate stdlib and existing deps first
  - user: "Add a date library" → check if built-in or existing deps cover it
  - user: "Which packages are unused?" → audit dependency tree for dead weight
  - user: "Can we do this without adding anything?" → prefer built-in solutions
---

# Dependency Minimalist

Before adding any dependency, apply the decision cascade below. Only add a package
if every alternative fails.

## Purpose

Reduce dependency bloat, improve security posture, and keep projects maintainable
by defaulting to "no new packages."

## When to Use

- A request would introduce a new package
- Auditing existing dependencies for bloat
- Simplifying a dependency tree
- Evaluating a package replacement

## Inputs

- A dependency request (package name, purpose)
- Current dependency list (from manifests)

## Outputs

- Decision: add / reject / alternative
- Dependency Decision Note (when adding)
- Audit report (when auditing existing deps)

## Safety Constraints

- Never auto-installs packages without explicit approval
- Flags packages with known CVEs or security issues
- Does not remove dependencies without user confirmation

## Workflow

1. **Identify the need** — what problem does the dependency solve?
2. **Apply decision cascade** — evaluate alternatives in priority order
3. **Check evaluation criteria** — assess size, deps, maintenance, scope match
4. **Look up language alternatives** — consult the alternatives table for the target language
5. **Make decision** — add with note, reject, or use alternative
6. **Write decision note** — document the choice when adding a dependency

## Decision Cascade

Evaluate alternatives in this order. Stop at the first match:

```
1. Can the language/runtime handle this? → use stdlib / built-in
2. Is it already a transitive dependency? → use it directly (if stable)
3. Is it already a dev dependency? → move to prod (if appropriate)
4. Is there a single-file / zero-dependency alternative? → use it
5. Does existing code already solve a subset? → extend it
6. Is a few lines of code simpler than a dependency? → write it
7. Is the package large, unmaintained, or overkill? → write it
8. All else fails → add the dependency, write a decision note
```

## Evaluation Criteria

| Criterion | Red flag |
|---|---|
| Bundle size | > 5 KB gzipped for a utility |
| Dependency count | > 3 transitive deps for a simple task |
| Maintenance | No release in 12+ months, < 100 stars |
| Scope match | Package does 10 things, you need 1 |
| Existing coverage | Already installed indirectly |
| Complexity | Requires config, adapters, or lifecycle hooks |
| License | Non-permissive or incompatible |

## Alternatives by Language

### JavaScript / TypeScript
| Task | Instead of | Use |
|---|---|---|
| Deep clone | `lodash.cloneDeep` | `structuredClone()` (Node 17+) |
| Debounce/throttle | `lodash.debounce` | 10-line implementation |
| Date formatting | `moment`, `date-fns` | `Intl.DateTimeFormat` |
| Deep equality | `lodash.isEqual` | `util.isDeepStrictEqual` (Node) |
| UUID | `uuid` | `crypto.randomUUID()` (Node 14+) |
| HTTP requests | `axios` | `fetch` (Node 18+) |
| Path manipulation | `lodash` | `path` module |
| Array utils | `lodash` | native `filter`, `map`, `reduce` |

### Python
| Task | Instead of | Use |
|---|---|---|
| CLI parsing | `click` | `argparse` (stdlib) |
| Config parsing | `pyyaml` | `json` + `configparser` |
| Date handling | `dateutil` | `datetime` (stdlib) |
| Path handling | — | `pathlib` (stdlib) |
| UUID | — | `uuid` (stdlib) |

### Go
| Task | Instead of | Use |
|---|---|---|
| HTTP server | — | `net/http` (stdlib) |
| JSON | — | `encoding/json` (stdlib) |
| Logging | `zap`, `logrus` | `log/slog` (Go 1.21+) |
| Config | `viper` | `flag` + `os.Getenv` + `encoding/json` |

### Rust
| Task | Instead of | Use |
|---|---|---|
| HTTP client | `reqwest` | `ureq` (simpler, fewer deps) |
| Date/time | `chrono` | `time` crate (smaller) |

## Dependency Decision Note

When a dependency **is** added, produce a note:

```markdown
## [package-name] ([version])

- **Added:** [date]
- **Need:** [what problem it solves, one sentence]
- **Alternatives considered:**
  - [stdlib/built-in] — [why rejected]
  - [existing dep] — [why rejected]
  - [write it ourselves] — [why rejected]
- **Decision:** [one sentence justifying the choice]
- **Size impact:** [bundle size or dep count change if known]
```

## Audit Existing Dependencies

When asked to audit:

1. List all direct dependencies with their purpose
2. Flag unused dependencies — no imports/references in source
3. Flag duplicates — packages that overlap in functionality
4. Flag outdated dependencies — versions with available updates
5. Flag oversized dependencies — heavy packages for simple tasks
6. Suggest removals with migration path for each

## Rules

- **Default to no** — starting position is "don't add it"
- **Prefer stdlib** — built-in modules are free, tested, zero-dep
- **Prefer existing** — if transitive dep provides it, use it
- **Prefer simple** — 20 lines of clear code beats a 50-dep package
- **Prefer small** — single-purpose, well-maintained over batteries-included
- **Always document** — when adding, write the decision note
- **Revisit regularly** — audit quarterly or on major releases
