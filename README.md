<p align="center">
  <img src="assets/logo.png" width="220" alt="Ponytail">
</p>

<h1 align="center">Ponytail</h1>

<p align="center"><em>Codex's lazy senior developer mode.</em></p>

Ponytail is a Codex plugin that keeps implementation small without cutting
the parts that make it correct. It activates automatically, supports four
session levels, injects the active rules into subagents, and ships focused
skills for review and maintenance.

## The ladder

Before writing code, stop at the first rung that holds:

1. Does this need to exist at all? (YAGNI)
2. Does it already exist in the codebase? Reuse it.
3. Does the standard library do it? Use it.
4. Does a native platform feature cover it? Use it.
5. Does an installed dependency solve it? Use it.
6. Can this be one line? Make it one line.
7. Only then: write the minimum code that works.

The ladder runs after understanding the task and tracing the code it touches.
Ponytail stays strict about validation, data-loss handling, security,
accessibility, hardware calibration, and anything explicitly requested.

## Install

### Codex CLI

Add the repository as a marketplace and install the plugin:

```bash
codex plugin marketplace add https://github.com/ptrickriley/ponytail.git
codex plugin add ponytail@ponytail
```

Start a new Codex session, open `/hooks`, and review and trust Ponytail's
lifecycle hooks. The plugin is active after the next session start.

### Codex desktop

Open the Plugins panel, add the Ponytail marketplace from
`https://github.com/ptrickriley/ponytail.git`, and install Ponytail. Restart
Codex, review and trust the plugin hooks when prompted, then start a new
thread.

## Use it

Ponytail starts in `full` mode for every session. Codex loads the six bundled
skills with `@` invocation:

| Skill | Use |
| --- | --- |
| `@ponytail` | Activate or switch the implementation mode. |
| `@ponytail-review` | Review a diff for over-engineering. |
| `@ponytail-audit` | Audit the repository for removable complexity. |
| `@ponytail-debt` | Collect deliberate `ponytail:` shortcuts into a ledger. |
| `@ponytail-gain` | Show Ponytail's published impact summary. |
| `@ponytail-help` | Show the quick reference. |

Change the session level with `@ponytail lite`, `@ponytail full`,
`@ponytail ultra`, or `@ponytail off`. A bare `@ponytail` reports the active
level. Say `stop ponytail` or `normal mode` to deactivate it; `@ponytail` starts
it again.

The levels are deliberately small:

- `lite`: build what was requested and name a simpler alternative.
- `full`: enforce the ladder and ship the shortest correct implementation.
- `ultra`: challenge speculative requirements before adding them.
- `off`: skip automatic instructions for the current session.

When Ponytail is active, the same filtered ruleset is injected into every
Codex subagent. This keeps delegated work at the same level as the parent
thread.

## Configure the default

The default is `full`. The environment variable has priority:

```bash
export PONYTAIL_DEFAULT_MODE=ultra
```

Or write a config file at `~/.config/ponytail/config.json`:

```json
{ "defaultMode": "lite" }
```

`@ponytail default lite` writes the same persistent setting. Supported
defaults are `off`, `lite`, `full`, and `ultra`; `review` is session-only.
Resolution order is environment variable, config file, then `full`.

## Development

This repository is the distributable plugin. Run the focused test suite with:

```bash
npm test
```

The two plugin manifests can be parsed directly with Node:

```bash
node -e "for (const file of ['.codex-plugin/plugin.json', '.agents/plugins/marketplace.json']) JSON.parse(require('fs').readFileSync(file, 'utf8'))"
```

## License

[MIT](LICENSE)
