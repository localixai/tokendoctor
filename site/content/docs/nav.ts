import type { DocsConfig } from '@/shared/config';

// The docs' table of contents. Every markdown file under content/docs is a page listed here, in
// a group, or is named under `unlisted` with why: a file in neither fails the build. The pages
// are the README's reference, arranged to be read: keep the two saying the same.
const docs: DocsConfig = {
  index: {
    title: 'tokendoctor docs',
    description:
      'Install tokendoctor, replay your past sessions to see what each change would have saved, fix only what pays, and undo any change.',
  },
  groups: [
    {
      title: 'Start',
      blurb: 'Install it, and see your own number first.',
      pages: ['getting-started', 'sessions'],
    },
    {
      title: 'Fix',
      blurb: 'The checks, the settings, the slide, and the way back.',
      pages: ['audit', 'settings', 'slide', 'undo'],
    },
    {
      title: 'Reference',
      blurb: 'Every command, the measurements, and what it does not do.',
      pages: ['commands', 'proof', 'limits'],
    },
  ],
  unlisted: {},
};

export default docs;
