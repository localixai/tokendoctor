# Commands

Every command tokendoctor adds to Claude Code, and the programs behind them that run from a shell.

## In Claude Code

| Command | What it does |
| --- | --- |
| `/tokendoctor:sessions [days]` | What a smaller window would have saved you (your sessions replayed), then where tokens went over the last 30 days (or `days`), with findings. Read-only. See [Your sessions](sessions.md). |
| `/tokendoctor:audit` | Setting checks by severity, each linked to the docs, a read of your memory and `CLAUDE.md`, then the usage dashboard. Read-only. See [The audit](audit.md). |
| `/tokendoctor:dashboard [days]` | Builds and opens a local dashboard of every session on this machine: spend by day, kind of token, model, reasoning effort, main thread and each subagent type, context size, project and hour, with filters. One HTML file, no network. |
| `/tokendoctor:optimize [focus]` | Proposes up to five changes from your numbers and applies the ones you pick. |
| `/tokendoctor:apply <finding-id>` | Shows a dry run of one audit fix, asks, then writes, with a backup of the file. |
| `/tokendoctor [name] [value]` | Shows the main settings, explains one or changes it. No model call, no tokens. See [Settings](settings.md). |
| `/tokendoctor fix <finding-id>` | Applies one audit fix after showing it, with a backup of the file. |
| `/tokendoctor undo [n]` | Lists the changes tokendoctor made, newest first, and puts change `n` back. See [Undo](undo.md). |

The skills (`/tokendoctor:…`) run only when you type them. `/tokendoctor` itself is answered by the plugin, so it costs nothing.

## From a shell

The plugin's `bin/` directory is on the Bash tool's PATH while it is enabled:

```sh
tokendoctor-audit [--project <dir>] [--json]
tokendoctor-sessions [--days <n>] [--project <dir>] [--by day|week] [--json]
tokendoctor-set --list | <key> <value>|--unset [--scope user|project|local] [--write]
tokendoctor-apply <finding-id> [--scope user|project|local] [--project <dir>] [--write]
tokendoctor-undo [--json] | <n> [--write]
tokendoctor-replay [--days <n>] [--window 200k,400k] [--json]
tokendoctor-dashboard [--days <n>] [--open]
tokendoctor-org-install [--write] [--uninstall]
tokendoctor-selfcheck [--log <file>] [--json]
```

| Program | What it does |
| --- | --- |
| `tokendoctor-replay` | What a smaller window would have saved. |
| `tokendoctor-org-install` | [The slide](slide.md#team-and-enterprise-logins) under a Team or Enterprise login. |
| `tokendoctor-selfcheck` | [What really loaded](audit.md#what-really-loaded), from a debug log: one small Haiku request, or a log you have. |

A program that writes does a dry run unless it is given `--write`.
