# adhd-output — ADHD-Friendly Output for Pi

Customized version of [ayghri/i-have-adhd](https://github.com/ayghri/i-have-adhd)
(9.2K stars), adapted for Pi's skill system.

## What it does

Shapes every response so an ADHD brain can act on it. Not just brief — shaped.

- Lead with the next action
- Number multi-step work
- Restate state across turns
- Suppress tangents
- Give specific time estimates
- Make wins visible

## Usage

```
/adhd                     → enable ADHD-friendly output
/adhd-stop                → turn off, return to normal
```

The rules stay on for the entire session. They don't expire after a few turns.

## Always-on (optional)

Add to your project `AGENTS.md`:

```markdown
## Output style

The reader has ADHD. Shape every response so it can be acted on:

1. Lead with the next action: command, path, or snippet first.
2. Number multi-step work; one bounded action per step.
3. End with one next action doable in under two minutes.
4. Finish the current issue before raising a new one.
5. Restate progress each turn ("step 3 of 5 done").
6. Give time estimates in concrete units, never "a bit".
7. After a change, show what now works.
8. Errors: state location, cause, and fix. No drama.
9. Cap lists at 5 items.
10. No preamble, no recaps, no closers.

Exceptions: explain fully when asked to explain. Confirm before destructive
actions. After three failed fixes, stop and name the doubtful assumption.
```

## The 10 rules

1. Lead with the next action
2. Number multi-step tasks
3. End with one concrete next action
4. Suppress tangents
5. Restate state every turn
6. Give specific time estimates
7. Make completed work visible
8. Matter-of-fact tone for errors
9. Cap lists at 5 items
10. No preamble, no recap, no closing pleasantries

## When to break the rules

- User asks to "explain" or "walk me through" — explain fully, no preamble/closer
- Destructive action ahead — confirm before acting
- Debug spiral (3+ failed attempts) — stop, name the doubtful assumption
- Real ambiguity — one short clarifying question
- A rule fights the task — task wins, shape stays

## Credits

Loosely based on *The Adult ADHD Tool Kit* by J. Russell Ramsay and Anthony L.
Rostain. Adapted for how an LLM should respond, not how a human should organize
their day.

Original: [ayghri/i-have-adhd](https://github.com/ayghri/i-have-adhd)
License: MIT
