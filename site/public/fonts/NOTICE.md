# Fonts

The site ships four typefaces, each under the SIL Open Font License 1.1
(https://openfontlicense.org). The copyright notices are embedded in the font files.

- DM Sans (`dm-sans.woff2`): headlines
- Inter (`inter.woff2`): text
- JetBrains Mono (`jetbrains-mono.woff2`): code and terminals
- Fragment Mono (`fragment-mono.woff2`): only the link-preview picture, `scripts/og-card.html`

`mono-blocks.woff2` is the site's own, under the repository's MIT license: the block elements
(U+2580 to U+259F, without the shades) as rectangles that fill a terminal cell, joined to the
Mono family for that range in `src/shared/styles/global.css`. `scripts/block-font.py` writes it.

The four come from the Fontsource packages `@fontsource-variable/dm-sans`, `@fontsource-variable/inter`,
`@fontsource-variable/jetbrains-mono` and `@fontsource/fragment-mono`.
