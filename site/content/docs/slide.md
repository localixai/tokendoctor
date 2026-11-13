# The slide

Where Claude Code would summarize the conversation, tokendoctor can elide old tool outputs into short pointers instead. Every prompt, answer and decision stays word for word, and there is no summary pause.

## Turn it on

It is off by default.

```text
/tokendoctor slide on
```

Or `tokendoctor-set tokendoctor.slide true --write`, or pick it in `/tokendoctor:optimize`. It applies from the next session.

## How it works

- **What goes first.** Reads made stale by a later read or edit of the same file, then what edits wrote (it is on disk), then the oldest outputs. The recent tail, outputs the model has not answered yet and Agent results stay.
- **How far.** It frees down to `slide-to` percent (default 25) of where Claude Code compacts, so slides are rare. Each one re-sends the context once, as a summary does; a pointer is never touched again.
- **When it summarizes after all.** `/compact` still summarizes, and so does a slide that cannot free enough, and a plugin's `$.session.compact`.
- **The window.** Set a smaller window with `autoCompactWindow` (for example 400000, or `/tokendoctor window 400k`) and the slide works from it.
- **Idle compaction.** It takes the compaction Claude Code starts before the hour's cache expires too.

## Team and Enterprise logins

On a Team or Enterprise login, and on machines with managed settings, Claude Code seats its built-in guard, `cc-plugin-sec-default`, ahead of the mods you install, and it sends compaction past them: the slide cannot run, and the audit (`slide-blocked-by-guard`) and `/tokendoctor slide` say so.

`tokendoctor-org-install` installs tokendoctor as the machine's own mod, which runs after the guard: a root-owned copy in the system folder and `managed-settings.d/50-tokendoctor.json` with `appendPlugins`. It is a dry run first, then one `sudo` command; `--uninstall` undoes it.

```sh
tokendoctor-org-install [--write] [--uninstall]
```

Where your organization delivers its own managed settings, files are ignored and only an administrator can add it.

## Slide against summary

In one real session, at the same size: Claude Code's summary took 367K to 35K in **65.3 s**; the slide took 368K to 36K in **0.04 s**. Summaries in the author's real sessions take 79 s on average (109 of them, 22 September to 1 November).

On [bench](https://github.com/localixai/tokendoctor/blob/main/bench/README.md), Claude Code doing a TypeScript project against fixed acceptance tests, Haiku 5.5, a 100K window so that it compacts several times (medians). A short task with one compaction gains time but not money; the longer the work, the more the slide saves:

| Task | Arm | Tests passed | Cost | Time | Waiting on compactions |
| --- | --- | --- | --- | --- | --- |
| a day of work (7 requests, 307 tests), 2 runs | summary | 307/307 | $0.186 | 1141 s | 103–137 s |
| | slide | 307/307 | $0.151 (**−19%**) | 763 s (**−33%**) | under 1 s |
| evalkit (an eval harness, 238 tests), 5 and 3 runs | summary | 238/238 | $0.149 | 656 s | about 50 s |
| | slide | 238/238 | $0.096 (**−35%**) | 472 s (**−28%**) | under 1 s |
| fixkit (12 bugs to find, 238 tests), 5 runs | summary | 238/238 | $0.037 | 154 s | about 16 s |
| | slide | 238/238 | $0.039 (+6%) | 128 s (**−17%**) | under 1 s |

### Smaller runs

The earlier, smaller runs of `node bench/window.mjs` (60 files of 300 lines read one by one, then a follow-up in the same session, 200K window) cost the same both ways:

| Model | Arm | Cost | Compactions | Answers right |
| --- | --- | --- | --- | --- |
| Haiku 5.5 (3 runs) | summary | $0.581 | 3 | 5/5 |
| Haiku 5.5 (3 runs) | slide to 25% | $0.580 | 3.7 | 5/5 |
| Sonnet 5.5 (1 run) | summary | $2.93 | 3 | 5/5 |
| Sonnet 5.5 (1 run) | slide to 25% | $2.99 | 3 | 5/5 |

### What a summary loses

Measured with `--task recall`: the session starts with five decisions from the person, the files are deleted after reading, and the follow-up asks for the decisions and eight KEYs the model noted. Claude Code's summary kept them all: 6/6 and 8/8 in every run on both models. The slide did the same on Haiku 5.5 (3 runs, 2% dearer); on Sonnet 5.5 (1 run) it missed one KEY, which the model skipped noting in its first reply after a slide.

So far no test shows the slide answering better, or worse: it saves time and money, not quality.
