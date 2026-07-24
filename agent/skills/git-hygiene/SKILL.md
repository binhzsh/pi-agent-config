---
name: git-hygiene
description: |-
  Audit git history and repository health. Checks for large files, merge
  commits on main, missing tags, unpushed branches, orphaned branches, commit
  message quality, and DCO/sign-off compliance. Produces a health report with
  actionable fixes. Use proactively before releases, after long development
  cycles, or when onboarding to a messy repository.

  Examples:
  - user: "Check git health" → audit history and produce report
  - user: "Clean up this repo's git" → find issues and suggest fixes
  - user: "Are there big files in git?" → scan for large blobs and suggest git-lfs
  - user: "Fix the commit history" → identify squash/rebase opportunities
---

# Git Hygiene

Audit git history and repository health. Produce a report with actionable fixes.

## Purpose

Keep git history clean, compact, and navigable. Catch problems before they
become painful (large blobs, messy branches, inconsistent commits).

## When to Use

- Before releases or major milestones
- After long development cycles
- When onboarding to a messy repository
- When repo size is growing unexpectedly

## Inputs

- A git repository (current working directory or specified path)

## Outputs

- Git health report with findings grouped by severity
- Actionable fix commands for each finding

## Safety Constraints

- Read-only operation — never modifies git history
- Never runs destructive commands (`git push --force`, `git reset --hard`)
- Suggests fixes but requires explicit approval before execution
- Does not fetch from remote unless explicitly requested

## Workflow

1. **Scan history** — analyze commit log, branches, tags, refs
2. **Check file sizes** — find large files in history and working tree
3. **Review branches** — identify stale, merged, orphaned branches
4. **Check tags** — verify tag format, coverage of releases
5. **Review commit messages** — check format, convention compliance
6. **Check remote sync** — compare local vs remote state
7. **Produce report** — structured output with severity ratings and fixes

## Audit Dimensions

### 1. Repository Size

| Check | What to look for |
|---|---|
| Large files | Files > 1 MB in history (candidates for git-lfs or removal) |
| Large blobs | Top 10 largest objects in the object store |
| Working tree | Untracked large files not in .gitignore |
| Pack files | Number and size of pack files; repack opportunity |

### 2. Branch Health

| Check | What to look for |
|---|---|
| Merged branches | Local branches already merged into main/master |
| Stale branches | Branches with no commits in 90+ days |
| Orphaned branches | Branches whose remote tracking branch is gone |
| Branch count | Total local branches (> 20 suggests cleanup needed) |
| Detached HEAD | Repository in detached HEAD state |

### 3. Commit Quality

| Check | What to look for |
|---|---|
| Message format | Conventional commits (type: description) or project convention |
| Empty messages | Commits with empty or whitespace-only messages |
| Merge commits | Merge commits on main/master (should be squash/rebase) |
| Commit frequency | Bursts of many commits (suggests squashing) |
| Author consistency | Multiple authors on same branch |
| Signed-off | DCO sign-off if required by project |

### 4. Tags and Releases

| Check | What to look for |
|---|---|
| Tag format | Consistent semver or project convention |
| Tag coverage | Recent releases without tags |
| Annotated tags | Lightweight tags where annotated would be better |
| Tag drift | Tags pointing to different commits on local vs remote |

### 5. Remote Sync

| Check | What to look for |
|---|---|
| Unpushed commits | Local commits not pushed to remote |
| Behind remote | Local branch behind remote |
| Diverged branches | Local and remote have different commits |
| Stale remotes | Remote tracking refs for deleted remote branches |

## Output Template

```markdown
## Git Hygiene Report

> Repository: [name]
> Scanned: [date]
> Commits: [N] | Branches: [N] | Tags: [N]
> Size: [N] MB (objects), [N] MB (working tree)

### Summary
[One-paragraph overview of repository health.]

### Findings

#### P0 — Action Required
- [ ] [issue] — [explanation]
  **Fix:** `[command]`

#### P1 — Should Fix
- [ ] [issue] — [explanation]
  **Fix:** `[command]`

#### P2 — Consider
- [ ] [issue] — [explanation]

### Large Files (top 10)
| Size | Path | In History | Action |
|---|---|---|---|
| 5.2 MB | `data/file.csv` | yes | Move to git-lfs or remove |

### Branch Cleanup
| Branch | Status | Last Commit | Action |
|---|---|---|---|
| `feature-old` | merged | 90 days ago | Delete |

### Commit Quality
- **Total commits:** N
- **Conventional commits:** N%
- **Merge commits on main:** N
- **Empty messages:** N

### Recommendations
1. [Priority recommendation with command]
2. [Priority recommendation with command]
```

## Common Fix Commands

| Issue | Command |
|---|---|
| Delete merged branches | `git branch --merged main \| grep -v main \| xargs git branch -d` |
| Delete stale remote tracking | `git remote prune origin` |
| Find large files | `git rev-list --objects --all \| git cat-file --batch-check=(objecttype, objectsize) \| sort -k2 -n -r \| head -10` |
| Repack repository | `git gc --aggressive` |
| Remove file from history | `git filter-repo --invert-path --path <file>` |
| Squash recent commits | `git rebase -i HEAD~N` |

## Severity Ratings

| Severity | Label | Description |
|---|---|---|
| **P0** | Action Required | Data loss risk, repo corruption, security issue |
| **P1** | Should Fix | Messy history, large blobs, stale branches |
| **P2** | Consider | Quality improvement, convention compliance |

## Rules

- **Read-only by default** — audit only; suggest fixes but don't execute
- **Never force push** — never suggest `git push --force` without explicit warning
- **Never rewrite shared history** — flag but don't rewrite pushed commits
- **Be specific** — cite actual file paths, branch names, commit hashes
- **Provide commands** — every finding includes a concrete fix command
- **Respect project conventions** — adapt to project's commit message format
- **Compact output** — top 10 for lists; summarize the rest
