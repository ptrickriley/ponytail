---
name: ponytail-help
description: >
  Quick-reference card for all ponytail modes, skills, and commands.
  One-shot display, not a persistent mode. Trigger: @ponytail-help,
  "ponytail help", "what ponytail commands", "how do I use ponytail".
---

# Ponytail Help

Display this reference card when invoked. One-shot, do NOT change mode,
write flag files, or persist anything.

## Levels

| Level | Trigger | What change |
|-------|---------|-------------|
| **Lite** | `@ponytail lite` | Build what's asked, name the lazier alternative in one line. |
| **Full** | `@ponytail` | The ladder enforced: YAGNI → stdlib → native → one line → minimum. Default. |
| **Ultra** | `@ponytail ultra` | YAGNI extremist. Deletion before addition. Challenges requirements before building. |

Level sticks until changed or session end.

## Skills

| Skill | Trigger | What it does |
|-------|---------|--------------|
| **ponytail** | `@ponytail` | Lazy mode itself. Simplest solution that works. |
| **ponytail-review** | `@ponytail-review` | Over-engineering review: `L42: yagni: factory, one product. Inline.` |
| **ponytail-audit** | `@ponytail-audit` | Whole-repo over-engineering audit: ranked list of what to delete. |
| **ponytail-debt** | `@ponytail-debt` | Harvest `ponytail:` shortcut comments into a tracked ledger. |
| **ponytail-gain** | `@ponytail-gain` | Measured-impact scoreboard: less code, less cost, more speed. |
| **ponytail-help** | `@ponytail-help` | This card. |

Codex loads these skills from the plugin. Invoke them with `@`, for example
`@ponytail-review`.

## Deactivate

Say "stop ponytail" or "normal mode". Resume anytime with `@ponytail`.
`@ponytail off` also works.

## Configure Default Mode

Default mode = `full`, auto-active every Codex session. Change it:

**Environment variable** (highest priority):
```bash
export PONYTAIL_DEFAULT_MODE=ultra
```

**Config file** (`~/.config/ponytail/config.json`, Windows: `%APPDATA%\ponytail\config.json`):
```json
{ "defaultMode": "lite" }
```

Set `"off"` to disable auto-activation on session start, activate manually
with `@ponytail` when wanted.

Resolution: env var > config file > `full`.

## Update

In Codex CLI, open `/plugins` to update or reinstall Ponytail, then start a new
session if Codex asks you to.

## More

Full docs: https://github.com/ptrickriley/ponytail
