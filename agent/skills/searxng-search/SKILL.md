---
name: searxng-search
description: |-
  Query the local SearXNG search instance at http://10.10.10.11:8888. Supports
  general web search, news, images, videos, maps, and engine-specific queries.
  Returns clean structured results. Use proactively for research, fact-checking,
  finding documentation, gathering context on unfamiliar topics, or when the
  user asks "search for", "look up", "find", or "research".

  Examples:
  - user: "Search for X" → general web search, return top 5 results
  - user: "Research topic Y" → multi-engine search, synthesize findings
  - user: "Find recent news about Z" → news category search
  - user: "What is the latest version of?" → targeted factual query
  - user: "Look up how to do X" → general search with practical results
---

# SearXNG Search

Query the local SearXNG instance at `http://10.10.10.11:8888`.

## API Endpoint

Base URL: `http://10.10.10.11:8888/search`

All queries are `GET` requests with query parameters. JSON response via `format=json`.

### Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `q` | Yes | Search query string |
| `format` | No | `json` (default for machine use) |
| `categories` | No | `general`, `news`, `images`, `videos`, `maps`, `music`, `files`, `it`, `science`, `social media` |
| `engines` | No | Comma-separated: `google,duckduckgo,bing,brave,ecosia,metafilter,archive` |
| `language` | No | ISO code: `en`, `vi`, `ja`, `zh-CN`, `auto` |
| `pageno` | No | Page number (default 1, max ~10) |
| `time_range` | No | `day`, `week`, `month`, `year`, `all` |

### Example Queries

**General web search:**
```bash
curl -s "http://10.10.10.11:8888/search?q=YOUR_QUERY&format=json"
```

**General + news (latest):**
```bash
curl -s "http://10.10.10.11:8888/search?q=YOUR_QUERY&format=json&categories=news,general&time_range=week"
```

**Specific engines (privacy-focused):**
```bash
curl -s "http://10.10.10.11:8888/search?q=YOUR_QUERY&format=json&engines=duckduckgo,brave,ecosia"
```

**Scientific/research:**
```bash
curl -s "http://10.10.10.11:8888/search?q=YOUR_QUERY&format=json&categories=science&language=en"
```

## Response Parsing

The JSON response contains a `results` array. Each result has:

- `title` — Result title
- `url` — Destination URL
- `engine` — Source engine (google, duckduckgo, bing, wikipedia, etc.)
- `content` — Snippet/description text
- `img_src` — Image URL
- `parsed_url` — Parsed URL object (use `parsed_url.get('netloc','')` for domain)
- `publishedDate` — Publication date (for news/science)
- `category` — general, news, images, science, etc.

## Workflow

1. **Parse user intent** — determine query, category, engines, time range
2. **Construct URL** — build the curl request with appropriate params
3. **Execute search** — run `curl -s "URL"` and capture output
4. **Parse results** — extract key info from JSON response
5. **Present findings** — summarize results concisely with title, snippet, URL, source
6. **Follow up** — if user wants more, fetch next page or refine engines

## Presentation Format

Return results as a numbered list:

```
1. **Result Title**
   Snippet text here...
   ↗ source.com/article
   📡 bing
```

- Max 5 results per query (merge duplicates by URL)
- Omit results with no title or content
- Prefer diverse sources (not all from same engine)

## Tips

- Use `engines=duckduckgo,brave,ecosia` for faster, privacy-friendly results
- Use `categories=news` + `time_range=day` for breaking news
- For research, combine `categories=science,general` for breadth
- Always use `format=json` for machine parsing
- If results are sparse, try without engine filters
