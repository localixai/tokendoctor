# tokendoctor

A Claude Code plugin from Localix Lab: it replays a person's past sessions to show what each change
would have saved, applies only what they pick with a diff they approve, and puts any change back. Everything runs on their machine; the plugin
sends nothing anywhere. GitHub `localixai/tokendoctor`, site https://tokendoctor.localix.ai.

## Layout

| Path | What it is |
| --- | --- |
| `.claude-plugin/` | `marketplace.json`: this repo is its own marketplace, its one plugin in `plugin/` |
| `plugin/` | The plugin, and only it: what an install, the plugin directory and `tokendoctor-org-install` take |
| `plugin/.claude-plugin/` | `plugin.json` and the icon |
| `plugin/skills/` | The slash commands: `sessions`, `optimize`, `audit`, `apply`, `dashboard` |
| `plugin/bin/` | `tokendoctor-*` commands the skills and hooks call; each is a thin entry into `lib/` |
| `plugin/lib/` | Everything that counts and decides: transcripts, replay, rules, the audit's docs, apply, undo |
| `plugin/hooks/` | The hooks module (`register.ts`) and the slide (`window.ts`) |
| `plugin/templates/` | The dashboard page, the status line, agent files the advice can write |
| `plugin/tests/` | The hooks module's tests (`npm run test:mod`, through `claude plugin test`) |
| `plugin/package.json` | Only what Node needs: `type: module` runs `bin/`'s extensionless ES modules. No scripts |
| `plugin/README.md`, `plugin/LICENSE` | Copies made by `npm run plugin:files` from the root's; never edit them |
| `test/` | Node tests for `plugin/lib/` and `plugin/bin/` (`npm test`) |
| `bench/` | The benchmark: real Claude Code on fixed tasks, scored by acceptance tests |
| `site/` | tokendoctor.localix.ai |
| `llx/` | Not this repository: an ignored clone of another one, kept beside the work |

## Commands

| Command | |
| --- | --- |
| `npm test` | `lib/` and `bin/`. Run it before every push; CI runs it on Node 20 and 22. |
| `npm run test:mod` | The hooks module (`claude plugin test plugin`). Needs `claude`. |
| `npm run plugin:files` | Writes `plugin/README.md` and `plugin/LICENSE` from the root's; `npm test` fails while they are out of date. |
| `npm run docs:check` | Every settings key and variable tokendoctor names, against Claude Code's current docs. Network. |
| `npm run validate` | `claude plugin validate plugin --strict`, then the marketplace at the root: the manifests, and the hooks module and `tests/` type-checked against the running Claude Code's types. Passes; keep it so (import a plugin file without its `.ts` suffix, and build the engine's values in full, as `tests/register.test.ts`'s helpers do). |
| `claude --plugin-dir plugin` | Try the working tree in a real session without installing it. |

The site has its own commands in `site/` (`npm run check` before a push that touches it).

## Rules

- **Numbers come from measurement.** Every figure on the README and the site is from a real run
  (`bench/`, or `tokendoctor-replay` over real sessions), and the README's table says which. Change
  a number only with the run that supports it. The headline is "up to 38% less"; the same words are
  in `package.json`, `plugin/package.json`, `plugin/.claude-plugin/plugin.json`, `marketplace.json`, the README and the site.
- **Every benchmark run is recorded,** stopped and failed ones too: keep
  `bench/results/<run>/run.json` (with a note on what was stopped and why), then regenerate
  `bench/HISTORY.md` (`bun bench/run.ts --history`). Never delete a result folder.
- **The baselines are fixed.** Claude Code without tokendoctor is measured once, in
  `bench/baselines.json`. `run.ts` runs only tokendoctor's arm by default; run `--arm factory` or
  `--arm advised` again only when Claude Code or the model changes, and only when asked.
- **Few model runs, never in bulk.** No loops of model evaluations to tune a rule: read transcripts
  deterministically. At most 3 `claude -p` at once, with `--strict-mcp-config
  --no-session-persistence` (ten at once froze a 24 GB laptop). Ask before a run that starts
  Claude processes.
- **The demo is a real recording** of a real session with real data, made with asciinema
  (`site/scripts/RECORDING.md`). Never stage one. Check the cast for private data before it ships.
- **Nothing leaves the machine.** No telemetry, no network call except Claude Code's docs for the
  audit (a day's cache). A transcript's paths and account details stay out of the repo
  (`bench/results/*/*/` is ignored for that reason).
- **Every change can be put back.** Whatever `apply` writes, `undo` lists and restores; a new kind
  of change ships with its undo and a test of both.
- **Claude Code's names are checked, not remembered.** A settings key or variable the audit names
  goes through `npm run docs:check` before release.

## Releasing

Bump `version` in `plugin/package.json` and `plugin/.claude-plugin/plugin.json` together (`npm test` checks they agree), move the changelog's
**Unreleased** under the version, commit "release x.y.z: ...", tag `vx.y.z` and push. A person
updates with `claude plugin marketplace update tokendoctor`.
