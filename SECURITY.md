# Security

tokendoctor reads Claude Code's transcripts and settings on a person's machine and, when they
approve a diff, writes settings. What it reads stays there: it sends nothing anywhere, and its one
network call fetches Claude Code's public docs for the audit.

## Reporting a problem

Report it privately, not in an issue:
[open a security advisory](https://github.com/localixai/tokendoctor/security/advisories/new).
Say what you ran, on which version, and what it read, wrote or sent that it should not have. The
latest release is the one that gets the fix.
