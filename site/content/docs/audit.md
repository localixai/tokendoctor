# The audit

38 checks of your Claude Code settings against Claude Code's current docs, each finding linked to the page it rests on. The audit only reads; a fix is written only when you apply it.

## Run it

`/tokendoctor:audit` lists the findings by severity, then reads your memory and `CLAUDE.md`, then shows the usage dashboard. From a shell:

```sh
tokendoctor-audit [--project <dir>] [--json]
```

A finding that has a fix is applied with `/tokendoctor fix <finding-id>`, `/tokendoctor:apply <finding-id>` or `tokendoctor-apply`, which shows a dry run first:

```sh
$ tokendoctor-apply compact-window-unset
Would change (user): ~/.claude/settings.json
- {}
+ {
+   "autoCompactWindow": 400000
+ }
Dry run. Re-run with --write to apply.
```

An existing file is copied to `<file>.tokendoctor-<timestamp>.bak` before it is written, and [undo](undo.md) puts the change back.

## The 38 checks

Errors are settings that are wrong or ignored, warnings are likely to cost real money, and info is worth a look. Rules that depend on a Claude Code release are skipped on older versions.

| Finding | Severity | What it catches |
| --- | --- | --- |
| `settings-unreadable` | error | A settings file that exists but is not valid JSON, so nothing in it applies. |
| `compact-threshold-undocumented` | error | `autoCompactThreshold` is not a Claude Code setting; the real key is `autoCompactWindow`. Fix removes it. |
| `compact-env-bare-number` | error | `CLAUDE_CODE_AUTO_COMPACT_WINDOW` below 100,000 (a bare number is tokens, not thousands). |
| `compact-window-unset` | warn | Models with a native 1M window compact only near 967K by default. Fix sets 400,000. |
| `compact-window-small` | warn | A window so small that frequent compaction breaks the prompt cache. |
| `prompt-caching-disabled` | warn | A `DISABLE_PROMPT_CACHING*` variable is set. |
| `subagent-model-force` | warn | Every subagent, including reasoning ones, is forced onto one model. |
| `effort-max-in-settings` | warn | `effortLevel: "max"` is not accepted in settings. Fix uses `xhigh`. |
| `advisor-inactive` | warn | An advisor that will silently not run (telemetry or feature-flag fetching off, advisor below the main model, tool disabled). |
| `fast-mode-enabled` | warn | `fastMode: true` saved as a default, so every session pays the higher fast-mode rate. Fix sets `fastModePerSessionOptIn`. |
| `auto-compact-off` | warn | `DISABLE_AUTO_COMPACT` or `autoCompactEnabled: false`: history grows until the model window fills. Fix unsets the setting. |
| `tool-search-off` | warn/info | `ENABLE_TOOL_SEARCH=false` loads every MCP tool definition into every request. |
| `explore-default-model` | info | The built-in Explore agent runs on Opus on many accounts. Fix installs a Haiku, read-only override. |
| `subagent-model-unset` | info | General-purpose subagents inherit an expensive main model. Fix sets `CLAUDE_CODE_SUBAGENT_MODEL=sonnet`. |
| `main-model-expensive` | info | Opus or Fable as the default; suggests Sonnet. |
| `agents-inherit-model` | info | Custom agents with no `model` run on the main model. |
| `heavy-dirs-not-denied` | info | Large `target/`, `dist/`, `build/`, `coverage/`, `.turbo/` directories not excluded from reads. Fix adds `permissions.deny` rules. |
| `large-lockfile-readable` | info | Lockfiles over 200 KB that a model can open in full. Fix adds a deny rule. |
| `instructions-long` | info | `CLAUDE.md` plus its `@imports` over 200 lines. Path-scoped `.claude/rules` and skills cut the cost; imports do not. |
| `compact-instructions-missing` | info | No `# Compact instructions` section to steer summaries. |
| `context-surface` | info | Many skills, plugins or MCP servers loaded in every session. |
| `duplicate-skills` | info | The same skill at user and project level. |
| `thinking-tokens-env` | info | `MAX_THINKING_TOKENS` is ignored on adaptive-reasoning models. |
| `prompt-cache-ttl-forced-short` | info | `FORCE_PROMPT_CACHING_5M` removes the one-hour cache some plans get. |
| `agent-teams-enabled` | info | Agent teams multiply token use per teammate. |
| `mcp-output-limit-raised` | info | A raised `MAX_MCP_OUTPUT_TOKENS`. |
| `every-tool-hooks` | info | Hooks matching `*` on a tool event (Pre/PostToolUse, PostToolUseFailure, PermissionRequest) start a process per call. Latency, not tokens. Fix drops them after a dry run; read the warning first if a tool shows agent status from them. |
| `idle-compaction-off` | info | `idleCompaction: false`: a long conversation is not compacted before its one-hour cache expires. Fix unsets it. |
| `bash-output-raised` | info | `bashOutputMaxChars` or `BASH_MAX_OUTPUT_LENGTH` above the 30,000 default. |
| `code-intelligence-missing` | info | The project has files for a language with an official language-server plugin (`typescript-lsp`, `pyright-lsp`, `gopls-lsp`, …) and it is not enabled. |
| `settings-key-undocumented` | warn | A settings key that is not in today's settings reference: misspelled or removed, so it does nothing. |
| `env-undocumented` | info | A `CLAUDE_…`/`ANTHROPIC_…`-style variable under `env` that today's docs do not list. |
| `setting-needs-newer-version` | warn | A key or variable the docs say needs a newer Claude Code than the one installed. |
| `slide-blocked-by-guard` | warn | The slide is on, but Claude Code's built-in guard sends compaction past the mods you install (a Team or Enterprise login, or managed settings), so it summarizes instead. Says to run `tokendoctor-org-install`. |
| `compact-pct-override` | info/warn/error | `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`: where it puts the compaction point; a warning below 50%, an error when it is not a percent. |
| `skill-model-switch` | info | A skill whose frontmatter names another model: each use reads the conversation uncached on that model. `context: fork` avoids it. |
| `opusplan-cache` | info | `opusplan` switches models, and so caches, on every plan-mode toggle. |
| `no-statusline` | info | No status line. Fix installs `tokendoctor-statusline.sh` and points `statusLine` at it (needs `jq`). |

### The status line

The `no-statusline` fix installs one quiet line:

```text
Opus 5.5 · api main* · 120k/367k · cache 1h · 5h 51% · week 35% · $24
```

Tokens are shown against the point where Claude Code compacts; `cache 1h` is how long the prompt cache stays warm; a limit adds `→ 100% in 48m` only when, at the recent pace (5h: the last hour, week: the last day), it runs out before it resets. The finding also mentions the `token-weather` mod from [anthropics/claude-code-playground](https://github.com/anthropics/claude-code-playground/tree/main/claude-code/mods/token-weather) as an alternative (needs Claude Code 2.1.287+, shared as-is).

### Agents and files the fixes install

`templates/statusline.sh` is the status line script the fix installs into your Claude config folder. `templates/agents/` holds three generic subagents (`Explore`, `test-runner`, `docs-lookup`), each pinned to a small model with read-only or narrow tools. A plugin cannot override a built-in agent or ship `settings.json` keys such as `autoCompactWindow`, `env` or `permissions`, so the apply step copies the template into `~/.claude/agents/` or `.claude/agents/` and edits your settings files itself, with a backup.

## Checked against today's docs

Claude Code changes every few days, so the audit does not trust a list frozen into the plugin. It reads the current settings reference and environment variable list from code.claude.com, as Markdown (every docs page is served at `…/docs/en/<page>.md`, indexed for models at [llms.txt](https://code.claude.com/docs/llms.txt)). They are cached a day in `~/.claude/tokendoctor/docs`; `--offline` uses the cache only. Only those public pages are fetched; nothing is sent.

From them it flags settings keys Claude Code does not document (`settings-key-undocumented`: a misspelled or removed key does nothing), variables of Claude Code's own families it does not know (`env-undocumented`), and keys that need a newer release than yours (`setting-needs-newer-version`). The `/tokendoctor:audit` and `/tokendoctor:optimize` skills read a finding's doc page before they explain or recommend it.

## What really loaded

The audit reads a `claude --debug` log of the last day, if you have one, and `tokendoctor-selfcheck` makes one: one `claude -p` request on Haiku with no saved session, or `--log <file>` to read one you have, at no cost. It shows:

- which copy of tokendoctor loaded, and in which tier;
- whether Claude Code's built-in guard was seated, and the order of the mods on compaction;
- hooks that were skipped;
- the window Claude Code really compacts at;
- a skill listing over its budget (descriptions cut short).

```sh
tokendoctor-selfcheck [--log <file>] [--json]
```
