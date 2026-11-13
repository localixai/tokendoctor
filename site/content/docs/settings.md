# Settings

`/tokendoctor` shows the settings that move token use and cost, explains one, and changes it as you type it. It is answered by the plugin itself, with no model call, so it costs no tokens.

## The main settings

On the author's machine, four of its rows:

```text
> /tokendoctor
tokendoctor: settings
  window       400K      tokens in context before auto-compaction
  slide        on        elide old tool outputs instead of summarizing
  effort       medium    reasoning effort
  subagents    sonnet    model for subagents without their own
```

`/tokendoctor` alone shows the main six (`window`, `slide`, `cache`, `effort`, `model`, `subagents`), then the audit's fixes. `/tokendoctor all` shows every setting it changes.

## Change one

```text
/tokendoctor window 400k
/tokendoctor slide off
/tokendoctor cache reset
```

- `/tokendoctor <name>` explains one: what it is, its value now, the values it takes, whether it applies now or from the next session, and what the audit says about it.
- `/tokendoctor <name> <value>` applies as typed. `400k` is 400,000; `on` and `off` are true and false.
- `reset` goes back to Claude Code's default.
- `--project` or `--local` writes to the project's shared or personal settings instead of your user settings.
- A model name must be an alias (`opus`, `sonnet`, `haiku`) or a `claude-…` id.

Tab completes the names and their values. Every change is listed by [undo](undo.md).

## Every name

| Name | Setting | Values |
| --- | --- | --- |
| `window` | `autoCompactWindow` | `200k`, `400k`, `600k`, `1m`; 100k to 1m |
| `compact` | `autoCompactEnabled` | `on`, `off` |
| `idle-compact` | `idleCompaction` | `on`, `off` |
| `idle-compact-at` | `CLAUDE_CODE_IDLE_COMPACT_MIN_TOKENS` | 100k to 1m tokens |
| `compact-at` | `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` | 1 to 100, percent of the window (can only lower it) |
| `max-effort` | `maxEffortLevel` | `medium`, `high`, `xhigh`, `max` |
| `slide` | tokendoctor's [slide](slide.md) | `on`, `off` |
| `slide-to` | how far a slide frees the context | 20 to 90 percent |
| `cache` | `promptCacheTtl` | `5m`, `1h` |
| `subagent-cache` | `subagentPromptCacheTtl` | `5m`, `1h` |
| `model` | `model` | a model alias or a `claude-…` id |
| `subagents` | `CLAUDE_CODE_SUBAGENT_MODEL` | a model alias or a `claude-…` id |
| `advisor` | `advisorModel` | a model alias or a `claude-…` id |
| `effort` | `effortLevel` | `low`, `medium`, `high`, `xhigh` |
| `thinking` | `alwaysThinkingEnabled` | `on`, `off` |
| `fast` | `fastMode` | `on`, `off` |
| `fast-opt-in` | `fastModePerSessionOptIn` | `on`, `off` |
| `git-instructions` | `includeGitInstructions` | `on`, `off` |
| `no-git-instructions` | `CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS` | `1`, `0` |
| `suggestions` | `promptSuggestionEnabled` | `on`, `off` |
| `bash-output` | `bashOutputMaxChars` | 1k to 150k characters |
| `bash-output-env` | `BASH_MAX_OUTPUT_LENGTH` | 1k to 150k characters |
| `tool-search` | `ENABLE_TOOL_SEARCH` | `true`, `auto`, `false` |
| `mcp-output` | `MAX_MCP_OUTPUT_TOKENS` | 1k to 200k tokens |
| `read-output` | `CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS` | 1k to 200k tokens |
| `max-output` | `CLAUDE_CODE_MAX_OUTPUT_TOKENS` | 1k to 200k tokens |
| `keep-transcripts` | `cleanupPeriodDays` | 1 to 3650 days |
| `skill-budget` | `skillListingBudgetFraction` | above 0, at most 0.1 |
| `skill-desc` | `skillListingMaxDescChars` | 100 to 5000 characters |
| `output-style` | `outputStyle` | `default`, `Explanatory`, `Learning`, or another style's name |
| `no-connectors` | `disableClaudeAiConnectors` | `on`, `off` |
| `effort-env` | `CLAUDE_CODE_EFFORT_LEVEL` | `low`, `medium`, `high`, `xhigh`, `max` |
| `window-env` | `CLAUDE_CODE_AUTO_COMPACT_WINDOW` | tokens, over the window setting; `1m` |

The names in capitals are environment variables, written under `env` in the settings file and read when a session starts. Claude Code reloads a settings file when it changes, except `model` and `effortLevel`, which apply from the next session.

## What it never changes

Only settings on [the tunable list](https://github.com/localixai/tokendoctor/blob/main/lib/tunables.mjs) and `/config` rows. Hooks, permissions and anything that widens what Claude may do are never on it, so a model driving these tools cannot grant itself more.

## With a model: optimize

`/tokendoctor:optimize [focus]` proposes up to five changes from your numbers and applies the ones you pick. Every change opens a dialog that shows it and runs only on **Apply**; with no one to ask, as in a `-p` run, nothing changes.

## From a shell

```sh
tokendoctor-set --list
tokendoctor-set <key> <value> [--scope user|project|local] [--write]
tokendoctor-set <key> --unset [--scope user|project|local] [--write]
```

Without `--write` it is a dry run. The plugin's `bin/` directory is on the Bash tool's PATH while the plugin is enabled.
