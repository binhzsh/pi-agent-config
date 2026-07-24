# Example: Research Skill

## User
/research compare Next.js App Router vs Remix for a SaaS dashboard

## Agent

Running research with SearXNG...

**Search queries:**
1. "Next.js App Router vs Remix SaaS dashboard 2025"
2. "Remix vs Next.js performance comparison"
3. "Next.js App Router data fetching patterns"
4. "Remix loaders vs Next.js server components"
5. "Next.js vs Remix developer experience 2025"

**Pages read:** 12 sources from 8 unique domains

---

# Research: Next.js App Router vs Remix for SaaS Dashboard

**Date:** 2025-01-15
**Sources:** 12 pages read, 8 unique sources

## Summary

Both Next.js App Router and Remix are excellent choices for a SaaS dashboard.
Next.js has larger ecosystem and Vercel deployment. Remix excels at data loading
and progressive enhancement. For a dashboard with heavy data needs, Remix's loader
pattern may reduce boilerplate; for broader ecosystem and hiring, Next.js wins.

## Key Findings

### Data Loading
- Remix loaders provide automatic revalidation and optimistic updates out of the box
- Next.js App Router requires manual `revalidate` or SWR/React Query for similar behavior
- Remix handles nested data loading with parallel requests automatically
- Next.js 15+ improved parallel server components reduce some data fetching pain

### Performance
- Both use React 18+ with streaming SSR
- Remix has smaller bundle size (~40KB vs ~65KB for Next.js)
- Next.js has better edge runtime support via Vercel
- Remix's progressive enhancement means pages work without JS

### Developer Experience
- Remix has simpler mental model (no "server vs client components")
- Next.js has larger community, more tutorials, more hiring availability
- Remix requires more manual setup for things like auth, caching
- Next.js has built-in image optimization, fonts, metadata

### Ecosystem
- Next.js: 175K stars, Vercel backing, massive ecosystem
- Remix: 47K stars, Shopify backing, smaller but growing

## Comparison

| Aspect | Next.js App Router | Remix |
|--------|-------------------|-------|
| Bundle size | ~65KB | ~40KB |
| Data loading | Manual/revalidate | Automatic loaders |
| Edge runtime | Built-in (Vercel) | Limited |
| Community | Large | Growing |
| Learning curve | Steeper (server/client) | Simpler |
| Hiring | Easy | Moderate |
| Best for | Large teams, ecosystem | Data-heavy apps, DX |

## Recommendations

1. Choose **Remix** if: dashboard is data-heavy, team values DX, progressive enhancement matters
2. Choose **Next.js** if: need Vercel deployment, larger ecosystem, hiring availability
3. Both support TypeScript, React, and can handle 10K+ concurrent users

## Sources

1. [Vercel Blog: Next.js App Router](https://vercel.com/blog) — Next.js data fetching patterns
2. [Remix Docs: Data Loading](https://remix.run/docs) — Loader architecture
3. [GitHub: nextjs/next.js](https://github.com/vercel/next.js) — Star count, issues
4. [GitHub: remix-run/remix](https://github.com/remix-run/remix) — Star count, architecture
5. [Stack Overflow: 2025 Dev Survey](https://stackoverflow.com) — Framework popularity
6. [Reddit r/nextjs](https://reddit.com/r/nextjs) — Community experiences
7. [Reddit r/remix](https://reddit.com/r/remix) — Community experiences
8. [Web Dev Simplified: Next.js vs Remix](https://youtube.com) — Video comparison
