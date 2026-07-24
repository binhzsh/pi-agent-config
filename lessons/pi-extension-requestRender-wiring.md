# LESSON: pi extension `requestRender` spam — wrong object, not removed API

## Symptom
`pi` launch spammed stderr:
```
Extension error (~/.pi/agent/extensions/pi-status/index.ts): tui.requestRender is not a function
```
~17 identical lines per run (one per lifecycle event: agent_start, turn_start,
tool_execution_*, message_*). Status bar still drew, but every event threw.

## Root Cause
The extension built the widget with `ctx.ui` (an `ExtensionUIContext`) where a
`TUI` was expected:

```ts
// WRONG — ctx.ui is ExtensionUIContext, NOT TUI
const widget = createStatusWidget(ctx.ui as any, ctx.ui.theme);
ctx.ui.setWidget("pi-status", () => widget, { placement: "belowEditor" });
```

`ctx.ui` has `setWidget/confirm/notify/select` but **no** `requestRender`.
Pi's `setWidget(key, factory)` hands the **real TUI** to the factory as arg 1.
The code threw that away with `() => widget` and closed over the wrong object.
Worked on older pi; broke on 0.81.1's API.

## General Rule
> Framework factories (`setWidget`, `setFooter`, `setHeader`, `ui.custom`) inject
> the real `TUI` and `Theme` as arguments. **Build the component INSIDE the
> factory** and use that `tui` for `requestRender` / render scheduling.
> **NEVER** pass `ctx.ui` where a `TUI` is expected — different object.

## Diagnosis Procedure (repeatable)
1. **Reproduce headless:** `echo "hi" | pi <flags> 2>&1 | head`
   → stderr names the exact file AND missing method.
2. **Read the failing file.** `invalidate()` calls `tui.requestRender()` and
   `tui` came from `createStatusWidget(ctx.ui, ...)`.
3. **Grep installed `.d.ts`** — don't assume the method was removed:
   ```
   grep -rn requestRender \
     /opt/homebrew/lib/node_modules/@earendil-works/pi-coding-agent/node_modules/@earendil-works/pi-tui/dist/tui.d.ts
   ```
   → `requestRender(force?: boolean)` exists on class `TUI` (present, not removed).
4. **Grep `setWidget` signature** in `pi-coding-agent/dist/core/extensions/types.d.ts`
   → factory gets `(tui: TUI, theme: Theme)`. Mismatch found: wrong object.

## The Fix (minimal, surgical)
```ts
// RIGHT — build inside factory, capture real tui
ctx.ui.setWidget("pi-status", (tui, theme) => {
  const widget = createStatusWidget(tui, theme);
  invalidateFn = widget.invalidate.bind(widget);
  return widget;
}, { placement: "belowEditor" });
```
No other logic touched. `invalidateFn?.(...)` guards already handle widget not
existing until first render.

## Verification
```bash
echo "hi" | pi <flags> 2>&1 | grep -c requestRender   # → 0
echo "reply with exactly: PILAUNCHOK" | pi <flags> 2>&1 | tail  # → PILAUNCHOK
```
17 errors → 0. Agent responds.

## Meta-Lessons
1. `"X is not a function"` on a passed object = **wrong type passed**, not a
   removed API. Before rewriting, grep the installed `.d.ts` to find which type
   actually owns X and which arg supplies the right instance. **Fix the wiring.**
2. Framework factories inject real dependencies as arguments — construct inside
   the factory, never pre-build with a substitute object.
3. Cheaper verify than burning a model turn: this class of error fires at
   session_start/widget registration, before any model reasoning. Trigger
   startup only (or use local Ollama) and grep stderr, rather than a full
   paid round-trip.
4. Reproduce headless first (`echo … | pi 2>&1`): stderr names the exact file
   and method — that pointer is the fastest path to root cause.
