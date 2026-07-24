# Graph Report - .  (2026-06-08)

## Corpus Check
- 38 files · ~51,934 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 411 nodes · 718 edges · 33 communities (30 shown, 3 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 22 edges (avg confidence: 0.77)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Tokenjuice Compaction Rules|Tokenjuice Compaction Rules]]
- [[_COMMUNITY_MCP Cache State|MCP Cache State]]
- [[_COMMUNITY_Tokenjuice UI Notices|Tokenjuice UI Notices]]
- [[_COMMUNITY_Tokenjuice Bash Parsing|Tokenjuice Bash Parsing]]
- [[_COMMUNITY_Pi Agent Settings|Pi Agent Settings]]
- [[_COMMUNITY_Tokenjuice Command Matching|Tokenjuice Command Matching]]
- [[_COMMUNITY_LLM Model Config|LLM Model Config]]
- [[_COMMUNITY_Tokenjuice Text Processing|Tokenjuice Text Processing]]
- [[_COMMUNITY_Tokenjuice Shell Tokenizer|Tokenjuice Shell Tokenizer]]
- [[_COMMUNITY_Tokenjuice Rule Config|Tokenjuice Rule Config]]
- [[_COMMUNITY_Tokenjuice Output Rewriting|Tokenjuice Output Rewriting]]
- [[_COMMUNITY_Tokenjuice GitHub Actions|Tokenjuice GitHub Actions]]
- [[_COMMUNITY_Tokenjuice Git Diff|Tokenjuice Git Diff]]
- [[_COMMUNITY_Tokenjuice Search Output|Tokenjuice Search Output]]
- [[_COMMUNITY_Tokenjuice JSON Handling|Tokenjuice JSON Handling]]
- [[_COMMUNITY_Tokenjuice Text Formatting|Tokenjuice Text Formatting]]
- [[_COMMUNITY_Graphify Knowledge Graph|Graphify Knowledge Graph]]
- [[_COMMUNITY_Graphify Extraction Pipeline|Graphify Extraction Pipeline]]
- [[_COMMUNITY_Graphify References|Graphify References]]
- [[_COMMUNITY_Coding Discipline Skills|Coding Discipline Skills]]
- [[_COMMUNITY_UI Design Skills|UI Design Skills]]
- [[_COMMUNITY_Project Lifecycle Skills|Project Lifecycle Skills]]
- [[_COMMUNITY_Graphify Export Formats|Graphify Export Formats]]
- [[_COMMUNITY_Graphify Query Tools|Graphify Query Tools]]
- [[_COMMUNITY_Skill Concepts|Skill Concepts]]
- [[_COMMUNITY_Agent Dependencies|Agent Dependencies]]
- [[_COMMUNITY_Sentinel Whitelist|Sentinel Whitelist]]
- [[_COMMUNITY_Compose Service Skill|Compose Service Skill]]
- [[_COMMUNITY_Repo Audit Skills|Repo Audit Skills]]
- [[_COMMUNITY_Search Integration|Search Integration]]

## God Nodes (most connected - your core abstractions)
1. `reduceExecutionWithRules()` - 19 edges
2. `countTextChars()` - 13 edges
3. `buildInspectionSummary()` - 13 edges
4. `applyRule()` - 13 edges
5. `createCompactionMetadata()` - 12 edges
6. `resolveEffectiveCommand()` - 11 edges
7. `getRepositoryInventorySourceArgv()` - 10 edges
8. `stripAnsi()` - 10 edges
9. `Graphify Knowledge Graph Engine` - 10 edges
10. `tokenizeCommand()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `Playwright Browser Automation` --semantically_similar_to--> `Playwright Package Dependency`  [INFERRED] [semantically similar]
  agent/mcp.json → agent/package.json
- `Karpathy Coding Discipline` --semantically_similar_to--> `Dependency Minimalism`  [INFERRED] [semantically similar]
  agent/skills/custom-karp-coding-rules/SKILL.md → agent/skills/dependency-minimalist/SKILL.md
- `Karpathy Coding Discipline` --semantically_similar_to--> `Task Planning Workflow`  [INFERRED] [semantically similar]
  agent/skills/custom-karp-coding-rules/SKILL.md → agent/skills/task-planner/SKILL.md
- `Patch and PR Review` --semantically_similar_to--> `Smart Test Runner`  [INFERRED] [semantically similar]
  agent/skills/patch-review/SKILL.md → agent/skills/smart-test-runner/SKILL.md
- `Repository Audit` --semantically_similar_to--> `Git Hygiene Checks`  [INFERRED] [semantically similar]
  agent/skills/repo-audit/SKILL.md → agent/skills/git-hygiene/SKILL.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Local LLM Infrastructure** — agent_models_qwen3_6, agent_models_omlx_gemma, extensions_compaction_offloader, agent_settings_llm_models [INFERRED 0.85]
- **Code Quality and Discipline Skills** — skills_karp_coding_rules, skills_dependency_minimalist, skills_patch_review, skills_task_planner, concept_coding_discipline [INFERRED 0.85]
- **UI/UX Design Skills** — skills_frontend_polish, skills_web_design_guidelines, skills_redesign, concept_ui_design_quality [INFERRED 0.85]
- **Project Lifecycle Skills** — skills_project_scaffold, skills_compose_service, skills_repo_audit, skills_git_hygiene, skills_portfolio_writer, concept_project_lifecycle [INFERRED 0.75]

## Communities (33 total, 3 thin omitted)

### Community 0 - "Tokenjuice Compaction Rules"
Cohesion: 0.08
Nodes (50): applyRule(), buildGithubActionsFailureSummary(), buildInspectionSummary(), buildLargeDocumentSummary(), buildLiteralPassthroughText(), buildPackageLockSummary(), buildPassthroughText(), buildRawText() (+42 more)

### Community 1 - "MCP Cache State"
Cohesion: 0.05
Nodes (37): cachedAt, configHash, resources, tools, cachedAt, configHash, resources, tools (+29 more)

### Community 2 - "Tokenjuice UI Notices"
Cohesion: 0.07
Nodes (11): Command Safety Analysis, Output Compaction Rules, config, dedupeCandidates(), getSourcePriority(), includesCommandPart(), isRecord3(), isTerseDiscoveryCommand() (+3 more)

### Community 3 - "Tokenjuice Bash Parsing"
Cohesion: 0.12
Nodes (30): buildCandidate(), compactBashResult(), deriveCommandMatchCandidates(), extractPipelineSourceCommand(), getCandidateArgv(), getCommandName(), getCompactionSkipReason(), getEffectiveCommandArgv() (+22 more)

### Community 4 - "Pi Agent Settings"
Cohesion: 0.07
Nodes (27): collapseChangelog, defaultModel, defaultProvider, defaultThinkingLevel, doubleEscapeAction, editorPaddingX, enabledModels, enableInstallTelemetry (+19 more)

### Community 5 - "Tokenjuice Command Matching"
Cohesion: 0.13
Nodes (25): buildEffectiveCandidate(), getArgv0Name(), getNormalizedArgv(), isFailFastSetupGuard(), isFullyParenthesized(), isLikelyShellLauncher(), isQuietCommandProbe(), isSetupConditionCommand() (+17 more)

### Community 6 - "LLM Model Config"
Cohesion: 0.12
Nodes (17): oMLX Gemma 4 E2B Model, Qwen3.6-27B Model Family, compaction, enabled, keepRecentTokens, reserveTokens, LLM Model Configuration, Pi Agent Configuration (+9 more)

### Community 7 - "Tokenjuice Text Processing"
Cohesion: 0.13
Nodes (16): context7, fetch, filesystem, git, playwright, searxng, time, PLAYWRIGHT_BROWSERS_PATH (+8 more)

### Community 8 - "Tokenjuice Shell Tokenizer"
Cohesion: 0.19
Nodes (14): compactWhitespace(), extractGhCommentCount(), extractGhDuration(), extractGhLabelNames(), formatDuration(), formatGhCommentJsonRecord(), formatGhJsonRecord(), formatGhStatusCheckLine() (+6 more)

### Community 9 - "Tokenjuice Rule Config"
Cohesion: 0.24
Nodes (13): applyCommandMatchCandidate(), buildClassificationResult(), classifyExecution(), compareSelections(), findBestRuleMatch(), getCandidatePriority(), getGitSubcommand(), getJsonRule() (+5 more)

### Community 10 - "Tokenjuice Output Rewriting"
Cohesion: 0.24
Nodes (13): assertValidRule(), hasNulByte(), isRecord(), isStringArray(), validateCounter(), validateMatch(), validateOptionalBooleanObject(), validateOptionalNumberObject() (+5 more)

### Community 11 - "Tokenjuice GitHub Actions"
Cohesion: 0.17
Nodes (11): api, apiKey, baseUrl, models, api, apiKey, baseUrl, models (+3 more)

### Community 12 - "Tokenjuice Git Diff"
Cohesion: 0.17
Nodes (12): Knowledge Management Pattern, Add URL and Watch Mode, Community Detection and Clustering, Graph Export Formats, Entity and Relationship Extraction, Extraction Subagent Spec, GitHub Clone and Multi-repo Merge, Git Hooks and CLAUDE.md Integration (+4 more)

### Community 13 - "Tokenjuice Search Output"
Cohesion: 0.20
Nodes (6): MCP External Tools, Playwright Browser Automation, SearXNG Search Integration, Playwright Package Dependency, SEARCH_PARAMS, SearxngResult

### Community 14 - "Tokenjuice JSON Handling"
Cohesion: 0.31
Nodes (10): buildArtifactPaths(), buildMetadataOnlyPath(), extractCaptureTruncatedFlag(), getDefaultArtifactDir(), isValidArtifactId(), normalizeArtifactSource(), resolveArtifactBaseDir(), resolveArtifactSource() (+2 more)

### Community 15 - "Tokenjuice Text Formatting"
Cohesion: 0.20
Nodes (10): builtinRulesRoot(), cacheKey(), listRuleFiles(), loadBundledBuiltinRuleDescriptors(), loadRuleDescriptorsFromRoot(), loadRules(), overlayRules(), projectRulesRoot() (+2 more)

### Community 16 - "Graphify Knowledge Graph"
Cohesion: 0.20
Nodes (9): dependencies, @agentapprove/pi, pi-agent-goal, pi-subagents, pi-web-access, @samfp/pi-memory, taskplane, name (+1 more)

### Community 17 - "Graphify Extraction Pipeline"
Cohesion: 0.25
Nodes (7): entries, [\"npx\",\"-y\",\"@modelcontextprotocol/server-filesystem\",\"/Volumes/workspace/projects\",\"/Volumes/workspace/agent-files\"], isJs, packageVersion, resolvedAt, resolvedBin, version

### Community 18 - "Graphify References"
Cohesion: 0.29
Nodes (8): Coding Discipline Philosophy, Dependency Decision Framework, Quality Gate Workflow, Dependency Minimalism, Karpathy Coding Discipline, Patch and PR Review, Smart Test Runner, Task Planning Workflow

### Community 19 - "Coding Discipline Skills"
Cohesion: 0.25
Nodes (7): initAgentDefaults, mergeModel, mergeThinking, reviewerModel, reviewerThinking, workerModel, workerThinking

### Community 20 - "UI Design Skills"
Cohesion: 0.33
Nodes (6): buildTokenjuiceStatusSnapshot(), extractFullOutputPath(), formatErrorMessage(), getAutoCompactionEnabled(), getTokenjuiceEntries(), isRecord2()

### Community 21 - "Project Lifecycle Skills"
Cohesion: 0.40
Nodes (5): getGitSubcommandIndex(), gitGlobalOptionTakesValue(), isGitBlobSpecifier(), isGitGlobalOptionWithInlineValue(), isGitShowFileContentArgv()

### Community 22 - "Graphify Export Formats"
Cohesion: 0.50
Nodes (4): UI Design Quality Standards, Frontend UI Polish, UI Redesign Skill, Web Design Guidelines

### Community 23 - "Graphify Query Tools"
Cohesion: 0.50
Nodes (4): isKnownFlag(), isSafeRepositoryInventoryPipeSegment(), isSafeSedInventoryFilter(), isStdinOnlyFilter()

### Community 24 - "Skill Concepts"
Cohesion: 0.67
Nodes (4): line(), padToWidth(), truncateToWidth(), visibleWidth()

### Community 27 - "Compose Service Skill"
Cohesion: 0.67
Nodes (3): Project Lifecycle Stages, Docker Compose Service Scaffold, Project Scaffolding

### Community 28 - "Repo Audit Skills"
Cohesion: 0.67
Nodes (3): Git Hygiene Checks, Portfolio and README Writer, Repository Audit

## Knowledge Gaps
- **123 isolated node(s):** `BULK_TOOLS`, `SearxngResult`, `SEARCH_PARAMS`, `config`, `version` (+118 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `compaction` connect `LLM Model Config` to `Pi Agent Settings`?**
  _High betweenness centrality (0.088) - this node is a cross-community bridge._
- **What connects `BULK_TOOLS`, `SearxngResult`, `SEARCH_PARAMS` to the rest of the system?**
  _123 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Tokenjuice Compaction Rules` be split into smaller, more focused modules?**
  _Cohesion score 0.07918367346938776 - nodes in this community are weakly interconnected._
- **Should `MCP Cache State` be split into smaller, more focused modules?**
  _Cohesion score 0.05263157894736842 - nodes in this community are weakly interconnected._
- **Should `Tokenjuice UI Notices` be split into smaller, more focused modules?**
  _Cohesion score 0.0659536541889483 - nodes in this community are weakly interconnected._
- **Should `Tokenjuice Bash Parsing` be split into smaller, more focused modules?**
  _Cohesion score 0.11724137931034483 - nodes in this community are weakly interconnected._
- **Should `Pi Agent Settings` be split into smaller, more focused modules?**
  _Cohesion score 0.07142857142857142 - nodes in this community are weakly interconnected._