# Getting started

Install the plugin in Claude Code, see your own number before anything changes, then fix what you pick. Everything runs on your machine.

## Install

```sh
claude plugin marketplace add localixai/tokendoctor
claude plugin install tokendoctor@tokendoctor
```

Restart Claude Code, or start a new session, and the commands are there.

To try it without installing, clone the repository and start Claude Code with it:

```sh
git clone https://github.com/localixai/tokendoctor
claude --plugin-dir /path/to/tokendoctor
```

## Your number first

```text
/tokendoctor:sessions
```

It replays your own sessions of the last 30 days at smaller windows and says what each would have saved, then where the tokens went: main thread against subagents, spend with a very full context, subagent types, cache rebuilds. It is read-only. [What it reports](sessions.md).

There is no one pill. If your sessions rarely pass 400K tokens, a smaller window changes nothing for you; a summary that lands just before you finish can cost more than it saves; your models, effort and work all move the number. That is why the replay comes first.

## Then fix what you pick

- `/tokendoctor:optimize` proposes up to five changes from your numbers and applies the ones you pick, each shown first. Nothing is written until you say so.
- `/tokendoctor:audit` lists [the setting checks](audit.md) by severity, each linked to the documentation page it rests on.
- `/tokendoctor` shows [the main settings](settings.md) and the audit's fixes, and changes one as you type it. It costs no tokens.
- `/tokendoctor slide on` [slides the window](slide.md) instead of summarizing it.
- `/tokendoctor undo` [puts any change back](undo.md).

## Update

```sh
claude plugin marketplace update tokendoctor
claude plugin update tokendoctor@tokendoctor
```

Then restart Claude Code.

## What it costs to keep installed

The skills are user-invoked only (`disable-model-invocation`). `claude plugin details tokendoctor@tokendoctor` estimates about 235 tokens of always-on cost for the five of them. The plugin has no MCP server. Its hooks module adds the optimize tools (`mcp__tokendoctor__*`) behind ToolSearch, so only their names are listed until `/tokendoctor:optimize` loads them.

`/tokendoctor` and the slide run in the hooks module too, with no model call, so they add no tokens. Its one command hook runs `tokendoctor-record` in the background when a session starts. The hook is `async` and prints nothing, so it adds no tokens. It appends each finished day's totals to `~/.claude/tokendoctor/history.jsonl`, so the trend outlives Claude Code's transcript cleanup.
