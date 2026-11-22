import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expected, pluginReadme } from '../scripts/plugin-files.mjs'

const ROOT = new URL('..', import.meta.url).pathname
const json = (f) => JSON.parse(readFileSync(join(ROOT, f), 'utf8'))

test('the plugin folder holds current copies of the README and the licence', () => {
  for (const [file, text] of Object.entries(expected())) {
    assert.equal(readFileSync(join(ROOT, file), 'utf8'), text, `${file} is out of date: run npm run plugin:files`)
  }
})

test('relative links and pictures become GitHub addresses, the rest stays', () => {
  const out = pluginReadme('[a](CONTRIBUTING.md) [b](#install) [c](https://x.dev) ![d](docs/d.gif) <img src="docs/e.svg"> <source srcset="docs/f.svg"> <a href="LICENSE">')
  assert.match(out, /\[a\]\(https:\/\/github\.com\/localixai\/tokendoctor\/blob\/main\/CONTRIBUTING\.md\)/)
  assert.match(out, /\[b\]\(#install\)/)
  assert.match(out, /\[c\]\(https:\/\/x\.dev\)/)
  assert.match(out, /!\[d\]\(https:\/\/raw\.githubusercontent\.com\/localixai\/tokendoctor\/main\/docs\/d\.gif\)/)
  assert.match(out, /src="https:\/\/raw\.githubusercontent\.com\/localixai\/tokendoctor\/main\/docs\/e\.svg"/)
  assert.match(out, /srcset="https:\/\/raw\.githubusercontent\.com\/localixai\/tokendoctor\/main\/docs\/f\.svg"/)
  assert.match(out, /href="https:\/\/github\.com\/localixai\/tokendoctor\/blob\/main\/LICENSE"/)
})

test('the plugin, its package and the marketplace agree on the version, name and headline', () => {
  const manifest = json('plugin/.claude-plugin/plugin.json')
  const pkg = json('plugin/package.json')
  const market = json('.claude-plugin/marketplace.json')
  assert.equal(pkg.version, manifest.version)
  assert.equal(pkg.name, manifest.name)
  assert.equal(pkg.type, 'module', 'bin/ holds ES modules without an extension')
  assert.equal(pkg.description, manifest.description)
  assert.deepEqual(market.plugins.map((p) => [p.name, p.source]), [[manifest.name, './plugin']])
})
