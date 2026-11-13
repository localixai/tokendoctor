# Limits

What tokendoctor reads, what goes over the network, how costs are counted, and what it cannot see.

## What it reads

- User, project and local settings files.
- `~/.claude.json`: the MCP server names, to count them, and the plan type, to tell whether Claude Code's guard is seated.
- The managed settings files in the system folder and the cached server-managed ones, only to find the guard and its own machine copy. Managed settings it does not check against the rules.
- Your skill and agent folders.
- The session transcripts: usage figures, timestamps, tool names and file paths, never message text.

## The network

The audit fetches two public pages of Claude Code's docs once a day (`--offline` to skip). Nothing else goes over the network, and nothing of yours is sent. `tokendoctor-selfcheck` without `--log` makes one small request on Haiku, through Claude Code.

## Whether a fix helps you

Whether a rule helps depends on your plan and workload. Findings explain the trade-off and link to the documentation; decide for yourself. Deny rules in `permissions.deny` are best-effort for search tools and do not stop a read through Bash.

## How costs are counted

Costs are dollars at each model's [Claude API list price](https://platform.claude.com/docs/en/about-claude/pricing) (`lib/prices.mjs`: cache reads at 0.05x input on Opus 5.5 and Sonnet 5.5, 0.025x on Fable 5.1, Haiku 5.5 priced by prompt length, fast mode, US-only inference, web search). On a Pro or Max plan that is what the same work would cost on the API: Anthropic does not publish how plan limits weigh each kind of token.

Claude Code bills some requests it does not write into transcripts: a summary compaction's own request, titles, the small model that reads a page for WebFetch. Their cost is Claude Code's own session total (its `cost-state` lines) minus the responses in the transcripts, where that total holds; else the summaries are estimated from the context they read. Against the cost Claude Code reported on [bench](https://github.com/localixai/tokendoctor/blob/main/bench/README.md)'s 78 runs: equal to the cent on 77, 7.7% over on one.

## What it cannot see

Sessions on other machines and transcripts Claude Code has already cleaned up are not counted, except for days already in the history file. The replay cannot see the work a model does again after a summary, so its saving is an upper bound.
