#!/usr/bin/env node
// The plugin folder's README.md and LICENSE, made from the repository's. The plugin directory and
// tokendoctor-org-install take plugin/ alone, and neither follows a symbolic link, so the folder
// holds real copies. The README's relative links and pictures point into the repository, so they
// become GitHub addresses here. `--check` exits 1 when a copy is out of date (test/plugin-files).
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname
const BLOB = 'https://github.com/localixai/tokendoctor/blob/main/'
const RAW = 'https://raw.githubusercontent.com/localixai/tokendoctor/main/'
const NOTE = '<!-- Made from the repository\'s README.md by scripts/plugin-files.mjs: edit that one. -->\n\n'

const local = (href) => !/^(?:[a-z]+:|#|\/)/i.test(href)

/** The repository's README with each relative link and picture made absolute. */
export function pluginReadme(readme) {
  const pictures = readme
    .replace(/(src|srcset)="([^"]+)"/g, (all, attr, href) => (local(href) ? `${attr}="${RAW}${href}"` : all))
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (all, alt, href) => (local(href) ? `![${alt}](${RAW}${href})` : all))
  const links = pictures
    .replace(/(?<!!)\]\(([^)\s]+)\)/g, (all, href) => (local(href) ? `](${BLOB}${href})` : all))
    .replace(/href="([^"]+)"/g, (all, href) => (local(href) ? `href="${BLOB}${href}"` : all))
  return NOTE + links
}

export function expected() {
  return {
    'plugin/README.md': pluginReadme(readFileSync(join(ROOT, 'README.md'), 'utf8')),
    'plugin/LICENSE': readFileSync(join(ROOT, 'LICENSE'), 'utf8'),
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const check = process.argv.includes('--check')
  let stale = 0
  for (const [file, text] of Object.entries(expected())) {
    let now = ''
    try {
      now = readFileSync(join(ROOT, file), 'utf8')
    } catch {}
    if (now === text) continue
    if (check) {
      stale++
      console.error(`${file} is out of date: run npm run plugin:files`)
    } else {
      writeFileSync(join(ROOT, file), text)
      console.log(`wrote ${file}`)
    }
  }
  process.exitCode = stale ? 1 : 0
}
