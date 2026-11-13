# The site

tokendoctor.dev: the landing page and the docs of tokendoctor, as a folder of the plugin's
repository. It was made from the [llx-sitekit](https://github.com/rsaryev/llx-sitekit) template
(its commit `6d1d483`) and keeps the template's layout, so [AGENTS.md](AGENTS.md) here holds for
every change in this folder. The pages AGENTS.md points to (`structure.md`, `writing-docs.md` and
the rest) are the template's own docs, in its repository.

```sh
cd site
npm install
npm run dev          # http://localhost:5173
npm run check        # the layers, the types, the build, the docs' standard
```

## What is whose

| Path | Owner | |
| --- | --- | --- |
| `content/` | the site | `site.ts` (name, address, install, structured data), `landing.ts` (the landing's words and its terminals), `docs/` (the pages and `nav.ts`), `theme.css` |
| `public/` | the site | the icons, the link-preview picture, the demo recording, the dashboard picture, the context chart, `llms.txt`, `robots.txt` |
| `scripts/RECORDING.md`, `record-demo.exp`, `polish-cast.py`, `demo.raw.cast` | the site | how the demo is recorded: a real session with real data, never a staged one |
| `scripts/og-card.html`, `og.mjs` | the site | the link-preview picture, `public/og.png` |
| `scripts/chart.mjs` | the site | the context chart, `public/context-chart.svg` and its copy in `content/docs/assets/` |
| `CHANGELOG.md` | the product | a link to the repository's own changelog, which the landing's releases are read from |
| `src/`, the other `scripts/`, the configs | the template | change one only where the site cannot say it in `content/` |

## Keep in step

- **The docs are the README's reference**, arranged to be read. A change of a command, a setting
  or a number in the README changes its page here too.
- **The numbers** are measured (`bench/`, the CHANGELOG's 0.5.1): "up to 38% less" in `site.ts`,
  the proof card in `landing.ts`, `docs/proof.md` and `scripts/chart.mjs` say the same thing.
  Run `node scripts/chart.mjs` after changing the chart's data.

## What differs from a site cloned from the template

- **It has no repository of its own.** `content/site.ts` says so with `sourceDir: 'site'`, which
  `sourceUrl` in `src/shared/config/index.ts` puts into a page's "Edit on GitHub" and into a
  docs link to a repository file.
- **The install box takes several commands**, one per line: the marketplace, then the plugin
  (`src/features/install-command`).
- **The link-preview picture is 2400×1260**, and `image.width` and `image.height` in `site.ts`
  say so in the page's head.
- **Its workflow is the repository's**, `.github/workflows/site.yml`: a workflow in a folder
  never runs, so the template's three are not here.
- **`npm run sync` does not apply.** It merges the template's branch into a repository's root.
  Until the template can sync into a folder, an update of the template is carried over by hand:
  its `CHANGELOG.md` lists what changed and what a site has to change.

## Publishing

A push to `main` that touches `site/` or the changelog runs `site.yml`: the check, then `dist/`
to the Cloudflare Pages project `token-doctor`, when the repository has the two secrets the
workflow names.
