# Privacy

tokendoctor runs on your machine. It has no server and no account, and it sends nothing of yours anywhere.

This page is about the plugin. What this site counts about a visit is on [localix.ai/privacy](https://localix.ai/privacy).

## What it reads

- **Claude Code's transcripts** in `~/.claude/projects/`, for the numbers only: each request's model, time and token usage, tool calls by name with a Bash command or a Read path, and the size of each tool result. Message text is dropped as each line is read. A compaction summary is measured for its length, then dropped too.
- **Your setup**, for the audit: the settings files, Claude Code's own config file, memory and `CLAUDE.md`.
- **A few environment variables** that change what Claude Code spends, such as `ANTHROPIC_MODEL` and `DISABLE_PROMPT_CACHING`. It reads no keys or tokens.

## What it keeps

Everything is in `~/.claude/tokendoctor/` (under `CLAUDE_CONFIG_DIR` if you set it):

| File | What is in it |
| --- | --- |
| `history.jsonl` | One row a day: cost, turns and sessions, by model. |
| `dashboard.html` | Written when you open the dashboard: the same numbers by day, project folder and model. |
| `changes.jsonl` | Each change tokendoctor wrote and where its backup is, for `/tokendoctor undo`. The backups sit beside the settings file they copy. |
| `docs/` | A copy of the two pages of Claude Code's docs that the audit reads. |

None of them holds message text. Uninstalling the plugin leaves the folder: delete it by hand if you want it gone, and tokendoctor starts over the next time you install it.

## What it sends

Nothing. Once a day the audit fetches two public pages of code.claude.com, `settings-reference` and `env-vars`, to know Claude Code's current settings; the request carries nothing of yours. The commands make no model calls.

The optimize skill runs inside your Claude Code session. The numbers it shows Claude go where the rest of that session goes, under your agreement with Anthropic, and nowhere else.

## Contact

- Questions and bugs: [GitHub issues](https://github.com/localixai/tokendoctor/issues).
- A security problem: report it privately, through a [security advisory](https://github.com/localixai/tokendoctor/security/advisories/new).
- Privacy: [privacy@localix.ai](mailto:privacy@localix.ai).

When what tokendoctor reads, keeps or sends changes, the [changelog](https://github.com/localixai/tokendoctor/blob/main/CHANGELOG.md) says so.
