# research — Deep Research with SearXNG

Deep research using SearXNG as the search backend. Searches the web, fetches
relevant pages, and synthesizes findings into a structured report with citations.

## Setup

### 1. Install SearXNG

```bash
# Docker (recommended)
docker run -d -p 8080:8080 searxng/searxng

# Or self-host: https://github.com/searxng/searxng
```

### 2. Configure URL

```bash
# Environment variable
export RESEARCH_SEARXNG_URL="http://localhost:8080"

# Or in your project's .env file
RESEARCH_SEARXNG_URL=http://localhost:8080
```

### 3. Verify

```bash
curl -s "http://localhost:8080/search?q=test&format=json" | head -20
```

## Usage

```
/research how to implement OAuth2
/research best practices for React state management 2025
/research compare Next.js vs Remix
/research what's new in TypeScript 5.4
```

## Output format

```markdown
# Research: <topic>

**Date:** YYYY-MM-DD
**Sources:** N pages read, M unique sources

## Summary
<!-- 2-3 sentence overview -->

## Key Findings
### <Theme 1>
- Finding with [source](url)

### <Theme 2>
- Finding with [source](url)

## Comparison
| Aspect | Option A | Option B |
|--------|----------|----------|
| Pros | ... | ... |
| Cons | ... | ... |

## Recommendations
1. <Actionable recommendation>
2. <Actionable recommendation>

## Sources
1. [Title](url) — what this source contributed
```

## Fallback

If SearXNG is unavailable, falls back to Pi's built-in WebSearch tool.
The report will note which search method was used.

## Scope options

Add modifiers to control depth:

```
/research quick <topic>           → 2-3 min, 2-3 queries, 5-8 pages
/research <topic>                 → 5-8 min, 3-5 queries, 8-15 pages (default)
/research deep <topic>            → 10-15 min, 5-8 queries, 15-25 pages
```
