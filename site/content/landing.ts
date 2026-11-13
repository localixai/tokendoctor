import type { Block, Card, LandingContent, Line, Media } from '@/shared/config';

// The landing's words. The design is the template's; this file is the site's. What a terminal
// shows here is what tokendoctor printed when it ran, trimmed to fit, with a temporary folder's
// path written as the settings file it stands for: the replay is the author's last 45 days, the
// fix an audit and a dry run on a fresh Claude Code config, the slide two compactions of one real
// session (a summary at night, the slide in the afternoon), the undo `/tokendoctor` and
// `/tokendoctor undo`. The dashboard is the top of the author's own, captured at 1440×900.
const DOCS = '/docs';
const GITHUB = 'https://github.com/localixai/tokendoctor';

const shell = (text: string): Block => ({ lang: 'shell', text });
const ui = (...lines: Line[]): Block => ({ ui: lines });
const terminal = (blocks: Block[], label: string): Media => ({ kind: 'terminal', blocks, label });

const CARDS: Card[] = [
  {
    tag: 'See',
    title: 'Your number first',
    text: 'Replays your own sessions at smaller windows, before anything changes: `/tokendoctor:sessions`.',
    links: [{ href: `${DOCS}/sessions`, label: 'Your sessions' }],
    media: terminal(
      [
        shell('$ tokendoctor-replay --days 45'),
        ui(
          [['hi', '334 sessions'], ['', ' in the last 45 days. Had Claude Code compacted at a smaller window:']],
          [['', '   200K   '], ['ok', '15.5%'], ['', ' of all cost saved  '], ['dim', '(111 sessions affected, 861 compactions more)']],
          [['', '   300K   '], ['ok', '14.7%'], ['', ' of all cost saved  '], ['dim', '(88 sessions affected, 364 compactions more)']],
          [['', '   400K   '], ['ok', '11.1%'], ['', ' of all cost saved  '], ['dim', '(69 sessions affected, 175 compactions more)']],
          [['', '   600K   '], ['ok', '7.3%'], ['', '  of all cost saved  '], ['dim', '(41 sessions affected, 61 compactions more)']],
          [['dim', 'An estimate: it cannot see the work a model does again after a summary.']],
        ),
      ],
      'The replay of the author’s last 45 days: 334 sessions; compacting at 200K would have saved 15.5% of all cost, at 400K 11.1%',
    ),
  },
  {
    tag: 'Look',
    title: 'Every token, on one page',
    text: 'By day, model, effort, main thread and each subagent, context size and project. One local file: `/tokendoctor:dashboard`.',
    links: [{ href: `${DOCS}/sessions#the-dashboard`, label: 'The dashboard' }],
    media: {
      kind: 'image',
      src: '/dashboard.webp',
      alt: 'The author’s tokendoctor dashboard: 57% of the spend was Claude re-reading the conversation',
      width: 1600,
      height: 1000,
    },
  },
  {
    tag: 'Fix',
    title: 'Fixes as a diff',
    text: '38 checks against the docs. Nothing is written until you say so: `/tokendoctor:optimize`.',
    links: [{ href: `${DOCS}/audit`, label: 'The 38 checks' }],
    media: terminal(
      [
        // The panel has no warning colour (green and red mean ok and wrong), so the tag is bold.
        ui(
          [['hi', '[warn] compact-window-unset'], ['', ': No auto-compact window is set']],
          [['dim', '  code.claude.com/docs/en/model-config.md']],
          [['', '']],
        ),
        shell('$ tokendoctor-apply compact-window-unset'),
        ui(
          [['', 'Would change (user): ~/.claude/settings.json']],
          [['bad', '- {}']],
          [['ok', '+ {']],
          [['ok', '+   "autoCompactWindow": 400000']],
          [['ok', '+ }']],
          [['dim', 'Dry run. Re-run with --write to apply.']],
        ),
      ],
      'The audit warns that no auto-compact window is set; the fix, as a dry run, would set autoCompactWindow to 400000 in the user settings',
    ),
  },
  {
    tag: 'Slide',
    title: 'Slide, don’t summarize',
    text: 'Old tool outputs go, the conversation stays word for word. No pause: `/tokendoctor slide on`. On a day of work in the benchmark, the same work cost 19% less and took 33% less time, every test passing.',
    links: [{ href: `${DOCS}/slide`, label: 'The slide' }],
    media: terminal(
      [
        ui(
          [['dim', 'One session, the same size:']],
          [['dim', '03:36  '], ['', 'Claude Code’s summary   367K → 35K   '], ['bad', '65.3 s']],
          [['dim', '17:42  '], ['', 'tokendoctor’s slide     368K → 36K   '], ['ok', '0.04 s']],
          [['', '']],
          [['dim', 'Slide vs. summary, a day of work in bench/:']],
        ),
        {
          grid: [
            [['hi', '< 1 s'], ['', 'per compaction'], ['dim', 'a summary takes 79 s']],
            [['ok', '−19%'], ['', 'cost'], ['dim', 'same work, all tests pass']],
            [['ok', '−33%'], ['', 'time'], ['dim', 'no summary to wait for']],
          ],
        },
      ],
      'One session compacted twice at the same size: Claude Code’s summary took 65.3 seconds, tokendoctor’s slide 0.04 seconds. On a day of work in the benchmark the slide cost 19% less and took 33% less time',
    ),
  },
  {
    tag: 'Undo',
    title: 'Undo anything',
    text: 'Every setting by name, every change reversible. Costs no tokens: `/tokendoctor undo`.',
    links: [
      { href: `${DOCS}/settings`, label: 'Settings' },
      { href: `${DOCS}/undo`, label: 'Undo' },
    ],
    media: terminal(
      [
        ui(
          [['dim', '> '], ['', '/tokendoctor']],
          [['hi', 'tokendoctor: settings']],
          [['', '  window      '], ['acc', '400K     '], ['dim', ' tokens in context before auto-compaction']],
          [['', '  slide       '], ['acc', 'on       '], ['dim', ' elide old tool outputs instead of summarizing']],
          [['', '  effort      '], ['acc', 'medium   '], ['dim', ' reasoning effort']],
          [['', '  subagents   '], ['acc', 'sonnet   '], ['dim', ' model for subagents without their own']],
          [['', '']],
          [['dim', '> '], ['', '/tokendoctor undo']],
          [['', '   1  01 Nov at 04:35  user   slide: '], ['bad', 'off'], ['', ' → '], ['ok', 'on']],
          [['', '   2  01 Nov at 04:35  user   slide: '], ['bad', 'on'], ['', ' → '], ['ok', 'off']],
        ),
      ],
      'The settings as /tokendoctor shows them: window 400K, slide on, effort medium, subagents on Sonnet; then /tokendoctor undo lists two changes of the slide',
    ),
  },
  {
    tag: 'Proof',
    title: 'Six weeks of real use',
    text: 'One developer’s transcripts. On 25 October: a 400K window, Sonnet for subagents. Main-thread cost per request −38% at API list prices, the month before against the week after; context per request −47%, 412K → 219K tokens; the same sessions replayed −33%, only the window changed.',
    links: [{ href: `${DOCS}/proof`, label: 'The numbers' }],
    media: {
      kind: 'image',
      src: '/context-chart.svg',
      alt: 'Mean context per request by day: 412K tokens in the month before, 219K after 25 October, when the compaction window went to 400K: 47% less',
      width: 760,
      height: 340,
    },
  },
  {
    tag: 'Yours',
    title: 'No one pill',
    text: 'Rarely past 400K tokens? The window won’t help. A summary just before you finish can cost more. Models, effort and the work itself move the number. On a Team or Enterprise login, the slide needs one `sudo` install. So tokendoctor shows you your own number before it changes anything.',
    links: [{ href: `${DOCS}/limits`, label: 'Limits' }],
  },
];

const landing: LandingContent = {
  hero: {
    title: { rest: 'The same Claude Code for up to 38% less' },
    lede: 'See what your Claude Code use overpays, fix it, undo it any time. Runs on your machine.',
    under: 'A real session, recorded live. Your saving depends on how you work: [see the proof](/docs/proof).',
    film: {
      src: '/demo.cast',
      label:
        'tokendoctor in a real Claude Code session, recorded with asciinema: /tokendoctor:sessions measures where the tokens went, then tokendoctor-sessions --by day shows the daily trend',
    },
  },
  loop: {
    title: 'How it works',
    aside: 'See, look, fix, slide, undo',
    cards: CARDS,
  },
  docs: { title: 'Documentation' },
  releases: { title: 'Releases', more: { label: 'Full changelog', href: `${GITHUB}/blob/main/CHANGELOG.md` } },
  closing: {
    title: 'See your own number first',
    aside: 'Free · MIT license',
    steps: [
      { title: 'Add the marketplace', text: '`claude plugin marketplace add localixai/tokendoctor` in a terminal.' },
      { title: 'Install the plugin', text: '`claude plugin install tokendoctor@tokendoctor`, then restart Claude Code.' },
      { title: 'Measure', text: '`/tokendoctor:sessions` replays your own sessions at smaller windows, before anything changes.' },
    ],
    links: [
      { label: 'Get started', href: `${DOCS}/getting-started` },
      { label: 'Source on GitHub', href: GITHUB },
    ],
  },
};

export default landing;
