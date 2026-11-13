# Undo

Every change tokendoctor writes is recorded, and any one of them can be put back. Undo needs no model call, so it costs no tokens.

## List the changes

```text
> /tokendoctor undo
changes made by tokendoctor, newest first
   1  01 Nov at 04:35  user   slide: off → on
   2  01 Nov at 04:35  user   slide: on → off

/tokendoctor undo <number> puts that one back.
```

Each row is one change: when, which settings file (`user`, `project` or `local`), and each setting with its value before and after.

## Put one back

```text
/tokendoctor undo 1
```

A setting goes back only while it still holds what that change wrote: if it was changed again since, the later change wins and undo says it kept it.

From a shell, `tokendoctor-undo` lists the last 20 changes and `tokendoctor-undo <n>` shows what it would put back; `--write` does it.

```sh
tokendoctor-undo [--json] | <n> [--write]
```

## Where changes are kept

- Each change is a line of `~/.claude/tokendoctor/changes.jsonl`: when, the file, the scope, and each key before and after.
- Before a file is written, an existing one is copied beside it as `<file>.tokendoctor-<timestamp>.bak`.
