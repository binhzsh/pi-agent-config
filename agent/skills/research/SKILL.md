---
name: research
description: |-
  Deep research skill using SearXNG as the search backend. Searches the web,
  fetches and reads relevant pages, synthesizes findings into a structured report
  with citations. Use when the user needs thorough, sourced research on any topic.

  Examples:
  - user: "/research how to implement OAuth2" → search, fetch, synthesize
  - user: "/research best practices for React state management 2025" → deep dive
  - user: "/research compare Next.js vs Remix" → comparative research
  - user: "/research what's new in TypeScript 5.4" → recent developments
---

# Research

Deep research using SearXNG as the search backend. Searches the web, fetches
relevant pages, and synthesizes findings into a structured report with citations.

## Setup

SearXNG must be running. Configure the URL in one of these ways:

```bash
# Environment variable (highest priority)
export RESEARCH_SEARXNG_URL="http://localhost:8080"

# Or in your project's .env file
RESEARCH_SEARXNG_URL=http://localhost:8080
```

Default: `http://localhost:8080`

### SearXNG installation

```bash
# Docker (recommended)
docker run -d -p 8080:8080 searxng/searxng

# Or self-host via GitHub: https://github.com/searxng/searxng
```

### Fallback search

If SearXNG is unavailable, falls back to Pi's built-in WebSearch tool.
The report will note which search method was used.

## Workflow

### 1. Parse the request

Determine:
- **Topic** — what to research
- **Scope** — how deep (quick overview vs deep dive)
- **Timeframe** — how recent results needed (default: last 6 months)
- **Sources** — any specific sources to prioritize

If the request is vague, ask 1-2 clarifying questions before searching.

### 2. Search

Search using SearXNG or WebSearch. Run multiple queries with different angles:

```bash
# SearXNG direct API
curl -s "http://localhost:8080/search?q=<query>&format=json&categories=general&time_range=<timeframe>" \
  | python3 -c "import json,sys; [print(f'{r[\"title\"]}\n  {r[\"url\"]}\n  {r[\"content\"][:200]}\n') for r in json.load(sys.stdin).get('results',[])]"
```

If SearXNG is unavailable, use WebSearch tool with multiple queries.

Run 3-5 different search queries to cover different angles:
- Broad overview query
- Specific technical query
- Comparison/alternative query
- Recent developments query
- Community/practical experience query

### 3. Fetch and read

For the top 8-15 results across all queries:
1. Read the page content (use Read tool for local files, curl + parse for web)
2. Extract key information, data, and quotes
3. Note the source URL and publication date
4. Skip low-quality or irrelevant pages

Prioritize:
- Official documentation
- Recent blog posts (especially from framework authors)
- Stack Overflow answers with high votes
- GitHub issues/PRs for bug reports
- Community forums (Reddit, HN) for practical experience

### 4. Synthesize

Organize findings into a structured report:

```markdown
# Research: <topic>

**Date:** YYYY-MM-DD
**Sources:** N pages read, M unique sources

## Summary

<!-- 2-3 sentence overview of key findings -->

## Key Findings

### <Theme 1>
- Finding 1 with source citation
- Finding 2 with source citation

### <Theme 2>
- Finding 1 with source citation
- Finding 2 with source citation

## Comparison

<!-- If comparing options, use a table -->

| Aspect | Option A | Option B |
|--------|----------|----------|
| Pros | ... | ... |
| Cons | ... | ... |
| Best for | ... | ... |

## Recommendations

1. <Actionable recommendation 1>
2. <Actionable recommendation 2>

## Sources

1. [Title](url) — brief note about what this source contributed
2. [Title](url) — ...
```

### 5. Deliver

Present the report to the user. Offer:
- Deeper dive on any section
- Additional searches if gaps are identified
- Summary in a different format (cheatsheet, decision matrix, etc.)

## Report Quality Checklist

Before delivering:
- [ ] Every claim has a source citation
- [ ] At least 5 unique sources
- [ ] Mix of official docs, community sources, and recent content
- [ ] Conflicting information is noted
- [ ] Recommendations are actionable
- [ ] No hallucinated sources or URLs
- [ ] Timeframe relevance is addressed

## Time Estimates

| Scope | Expected time | Search queries | Pages read |
|-------|--------------|----------------|------------|
| Quick | 2-3 min | 2-3 | 5-8 |
| Standard | 5-8 min | 3-5 | 8-15 |
| Deep | 10-15 min | 5-8 | 15-25 |

## Rules

- **Always cite sources** — every claim needs a URL
- **Note uncertainty** — if sources conflict, say so
- **Prioritize recency** — newer sources get more weight
- **Skip low-quality sources** — no random forums with no substance
- **Don't over-search** — if 5 sources say the same thing, stop searching
- **Adapt to the request** — a quick question gets a quick report
- **Use SearXNG when available** — it's faster and more comprehensive than WebSearch

## SearXNG API Reference

```
GET /search?q=<query>&format=json&categories=general&time_range=year&language=en
```

Response format:
```json
{
  "results": [
    {
      "title": "Page title",
      "url": "https://example.com/page",
      "content": "Snippet or full content",
      "engine": "google",
      "score": 100,
      "positions": [1]
    }
  ]
}
```

Available categories: `general`, `images`, `videos`, `news`, `science`, `it`, `files`, `music`, `files`

Available time ranges: `none`, `day`, `week`, `month`, `year`
