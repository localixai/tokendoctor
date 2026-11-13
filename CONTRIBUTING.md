# Contributing

```sh
npm test                  # lib/ and bin/, on Node 20 or newer
npm run test:mod          # the hooks module (needs claude on PATH)
npm run docs:check        # every settings key and variable against Claude Code's docs (network)
claude --plugin-dir .     # the working tree in a real session, without installing it
```

## What a change has to keep

- **Read-only until approved.** `sessions`, `audit`, `replay` and `dashboard` never write a setting.
  Only `apply` writes, and only the diff the person picked.
- **Everything can be undone.** What `apply` writes, `/tokendoctor undo` lists and puts back. A new
  kind of change comes with its undo and a test of both in `test/apply.test.mjs`.
- **Nothing leaves the machine.** The one network call is Claude Code's docs for the audit
  (`lib/docs.mjs`, cached a day). Nothing the repository holds may name a person's machine or carry a
  secret: `test/private.test.mjs` fails on a key, a token or a home folder path, benchmark results
  included.
- **Names from the docs.** A settings key or variable the audit names must be in Claude Code's
  current docs: `npm run docs:check` says which are not.
- **Transcripts of any size.** A transcript is read a line at a time (`lib/transcript.mjs`), never
  whole into one string.

## Figures

No number in the README or on the site is typed by hand. Each comes from a run: `bench/` for the
work Claude Code does, `tokendoctor-replay` for a person's own sessions. Change the run, then copy
the figure, and say in the pull request which run it is. A benchmark run is always recorded in
`bench/results/` and `bench/HISTORY.md`, a failed or stopped one too.

## The site

`site/` is tokendoctor.dev. `npm run check` in it before a push that touches it; a push to `main`
publishes it.

## Releases

Bump `version` in `package.json` and `.claude-plugin/plugin.json` together and move the changelog's
**Unreleased** under that version, then tag `v<version>`.
