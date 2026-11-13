import type { SiteConfig } from '@/shared/config';

// What the site knows about itself: the product's name, where the site is published, the
// repository, how the plugin is installed.
const GITHUB = 'https://github.com/localixai/tokendoctor';
const URL = 'https://tokendoctor.dev';
const DESCRIPTION =
  'The same Claude Code for up to 38% less. See what your Claude Code use overpays, fix it, undo it any time. Runs on your machine.';

const site: SiteConfig = {
  name: 'tokendoctor',
  // The family's pattern, "<Product>: <its line>"; 38% is what the README and bench/ support.
  title: 'tokendoctor: the same Claude Code for up to 38% less',
  description: DESCRIPTION,
  url: URL,
  github: GITHUB,
  // The site is a folder of the plugin's repository, not a repository of its own.
  sourceDir: 'site',
  // Both, one after the other: the marketplace, then the plugin from it.
  install: [['Claude Code', 'claude plugin marketplace add localixai/tokendoctor\nclaude plugin install tokendoctor@tokendoctor']],
  image: {
    path: '/og.png',
    width: 2400,
    height: 1260,
    alt: 'tokendoctor auditing a Claude Code setup in a terminal: two errors, a warning and two notes, then a dry-run fix',
  },
  bar: {
    links: [
      { label: 'Docs', href: '/docs' },
      { label: 'Changelog', href: `${GITHUB}/blob/main/CHANGELOG.md` },
      { label: 'GitHub', href: GITHUB },
    ],
    action: { label: 'Install', href: '/#start' },
  },
  maker: { label: 'Localix Lab', href: 'https://localix.ai' },
  footer: {
    note: 'tokendoctor is MIT-licensed and open source.',
    links: [
      { label: 'Docs', href: '/docs' },
      { label: 'GitHub', href: GITHUB },
      { label: 'Changelog', href: `${GITHUB}/blob/main/CHANGELOG.md` },
    ],
  },
  // The landing's WebSite gets these: what it is, beyond a page about it.
  jsonLd: {
    mainEntity: {
      '@type': 'SoftwareApplication',
      '@id': `${URL}/#app`,
      name: 'tokendoctor',
      applicationCategory: 'DeveloperApplication',
      applicationSubCategory: 'Claude Code plugin',
      operatingSystem: 'macOS, Linux, Windows',
      url: `${URL}/`,
      description: DESCRIPTION,
      image: `${URL}/og.png`,
      screenshot: `${URL}/dashboard.webp`,
      license: 'https://opensource.org/licenses/MIT',
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      codeRepository: GITHUB,
      sameAs: [GITHUB],
      author: { '@type': 'Person', name: 'rsaryev', url: 'https://github.com/rsaryev' },
    },
    inLanguage: 'en',
  },
  llms: `> ${DESCRIPTION}`,
};

export default site;
