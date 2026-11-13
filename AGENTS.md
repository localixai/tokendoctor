# tokendoctor

A Claude Code plugin from Localix Lab: it shows what a person's Claude Code use overpays, fixes it
with a diff they approve, and puts any change back. Everything runs on their machine; the plugin
sends nothing anywhere. GitHub `localixai/tokendoctor`, site https://tokendoctor.dev.

## Layout

| Path | What it is |
| --- | --- |
| `.claude-plugin/` | `plugin.json` (the plugin), `marketplace.json` (this repo is its own marketplace), the icon |
| `skills/` | The slash commands: `sessions`, `optimize`, `audit`, `apply`, `dashboard` |
| `bin/` | `tokendoctor-*` commands the skills and hooks call; each is a thin entry into `lib/` |
| `lib/` | Everything that counts and decides: transcripts, replay, rules, the audit's docs, apply, undo |
| `hooks/` | The hooks module (`register.ts`) and the slide (`window.ts`) |
| `templates/` | The dashboard page, the status line, agent files the advice can write |
| `test/` | Node tests for `lib/` and `bin/` (`npm test`) |
| `tests/` | The hooks module's tests (`npm run test:mod`, through `claude plugin test`) |
| `bench/` | The benchmark: real Claude Code on fixed tasks, scored by acceptance tests |
| `site/` | tokendoctor.dev |
| `llx/` | Not this repository: an ignored clone of another one, kept beside the work |

## Commands

| Command | |
| --- | --- |
| `npm test` | `lib/` and `bin/`. Run it before every push; CI runs it on Node 20 and 22. |
| `npm run test:mod` | The hooks module, on a copy of the plugin without `bench/tasks`. Needs `claude`. |
| `npm run docs:check` | Every settings key and variable tokendoctor names, against Claude Code's current docs. Network. |
| `npm run validate` | `claude plugin validate . --strict`. |
| `claude --plugin-dir .` | Try the working tree in a real session without installing it. |

The site has its own commands in `site/` (`npm run check` before a push that touches it).

## Rules

- **Numbers come from measurement.** Every figure on the README and the site is from a real run
  (`bench/`, or `tokendoctor-replay` over real sessions), and the README's table says which. Change
  a number only with the run that supports it. The headline is "up to 38% less"; the same words are
  in `package.json`, `.claude-plugin/plugin.json`, `marketplace.json`, the README and the site.
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

Bump `version` in `package.json` and `.claude-plugin/plugin.json` together, move the changelog's
**Unreleased** under the version, commit "release x.y.z: ...", tag `vx.y.z` and push. A person
updates with `claude plugin marketplace update tokendoctor`.
