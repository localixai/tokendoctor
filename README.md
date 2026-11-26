<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/logo.svg">
    <img src="docs/logo-light.svg" width="72" height="72" alt="tokendoctor">
  </picture>
</p>

<h1 align="center">tokendoctor</h1>

<p align="center">
  <strong>The same Claude Code for up to 38% less</strong>
  <br>
  Replays your own past sessions to show what each change would have saved, then changes only what you pick.
</p>

<p align="center">
  <a href="https://github.com/localixai/tokendoctor/actions/workflows/ci.yml"><img src="https://github.com/localixai/tokendoctor/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="CHANGELOG.md"><img src="https://img.shields.io/github/v/tag/localixai/tokendoctor?label=version" alt="Version"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License: MIT"></a>
</p>

<p align="center">
  <a href="#install">Install</a> &bull;
  <a href="https://tokendoctor.localix.ai/docs">Docs</a> &bull;
  <a href="https://tokendoctor.localix.ai">Website</a> &bull;
  <a href="CHANGELOG.md">Changelog</a>
</p>

<p align="center">
  <img src="docs/demo.gif" alt="tokendoctor in a real Claude Code session: /tokendoctor:sessions, then the daily trend" width="880">
</p>

**Your past sessions decide, not anyone's benchmark.** What a setting saves depends on how you
work: how long your sessions run, which models you use, what the work is. A number from someone
else's sessions, mine included, says little about yours. So tokendoctor starts by looking back at
your own.

**① Look back at your last 30 days.** `/tokendoctor:sessions` replays every session you had,
request by request, at compaction windows of 200K, 300K, 400K and 600K, and shows what each would
have cost. It only reads your transcripts, makes no model calls and changes nothing. The figure is
an upper bound: a replay can't see work the model would have redone after a summary.

**② Change only what your sessions show pays, and undo it.** `/tokendoctor:optimize` proposes
changes from those numbers and checks your settings against Claude Code's docs; it applies only the
ones you pick, each shown as a diff first. `/tokendoctor undo` puts any of them back.

**③ Optional: slide instead of summarize.** When Claude Code would stop to summarize the
conversation, tokendoctor drops old tool output instead and keeps every message. There is no model
call, so it takes milliseconds, not a minute.

**④ Optional: keep the cache warm through a break.** Come back after the prompt cache's hour and
the next message writes the whole conversation into it again, at twice the input price. With
`/tokendoctor keepalive on`, a one-word fork of the conversation reads it from the cache six minutes
before the hour runs out, which starts the hour again. Only conversations of 200K tokens or more,
and never on a cache that may already be cold. `/tokendoctor:sessions` shows first what it would
have saved you.

## Install

```bash
claude plugin marketplace add localixai/tokendoctor
claude plugin install tokendoctor@tokendoctor
```

Restart Claude Code and run `/tokendoctor:sessions` to see what your last 30 days would have cost
at each window. Nothing changes until you pick it.

## What it found in mine

Every request sends the whole conversation to the model. On models with a 1M window, Claude Code
compacts only near 967K tokens, so the end of a long session is the expensive part. For me, two
thirds of main-thread cost went to requests with more than 400K in context.

So I set a 400K window and Sonnet for subagents. Comparing the month before with the week after,
about 23K and 19K main-thread requests, context per request went from 412K to 219K and cost per
request fell 38% at API list prices. That's one person's before and after, not a controlled
experiment.

The catch is more summaries, and each is a pause: 79 seconds on average in my sessions. That's
what the slide is for. Your sessions may show something else entirely, which is the point of
looking at them first.

## What the benchmark shows

On the [benchmark](bench/README.md), Claude Code builds a TypeScript project against tests it
can't change, so a run counts only if the tests pass. Cost is per task, on Haiku 5.5:

| Compared | Cost | Time |
| --- | --- | --- |
| Slide against a summary, a day of work | −19% | −33% |
| Slide against a summary, an eval harness | −35% | −28% |
| Slide against a summary, a short task | +6% | −17% |
| The settings advice alone, against Claude Code as it ships | dearer in 3 of 4 runs | |
| The advice and the slide, a week of work | −11% to −21% | |

Every test passed in every run. The advice alone didn't pay here because these tasks rarely pass
400K, which is where the window starts to matter. If your sessions don't either, your replay will
show it, and you should leave your window alone. Every run, the losing ones too, is in
[bench/HISTORY.md](bench/HISTORY.md).

<p align="center">
  <img src="docs/dashboard.png" alt="The author's tokendoctor dashboard: 57% of the spend was Claude re-reading the conversation" width="880"><br>
  <sub><code>/tokendoctor:dashboard</code>: where every token went, by day, model, subagent and project. One local file; this one is mine.</sub>
</p>

## Commands

| Command | What it does |
| --- | --- |
| `/tokendoctor:sessions [days]` | Replays your past sessions (30 days, or `days`) at smaller windows: what each would have saved, then where your tokens went. Reads only. |
| `/tokendoctor:audit` | Your settings, memory and CLAUDE.md checked against the docs, by severity. Reads only. |
| `/tokendoctor:dashboard [days]` | Opens a local dashboard of every session on this machine. |
| `/tokendoctor:optimize [focus]` | Proposes up to five changes from your numbers and applies the ones you pick. |
| `/tokendoctor [name] [value]` | Shows, explains or changes a setting, with no model call. |
| `/tokendoctor undo [n]` | Lists every change tokendoctor made and puts one back. |

Nothing leaves your machine: the only network call is to two public pages of Claude Code's docs,
once a day. It never switches your models on its own.

## Documentation

**[tokendoctor.localix.ai/docs](https://tokendoctor.localix.ai/docs)** has the rest: the
[38 checks](https://tokendoctor.localix.ai/docs/audit), every
[setting](https://tokendoctor.localix.ai/docs/settings),
[how the slide works](https://tokendoctor.localix.ai/docs/slide) (and Team and Enterprise
logins), [the cache keepalive](https://tokendoctor.localix.ai/docs/keepalive), the commands from a shell, the [measurements](https://tokendoctor.localix.ai/docs/proof)
and the [limits](https://tokendoctor.localix.ai/docs/limits). To work on tokendoctor itself, see
[CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT
