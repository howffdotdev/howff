// Closed vocabularies for the catalogue. Single source of truth:
// the validator, the site, and the submit form all read from here.

export const CATEGORIES = [
  'productivity',
  'development',
  'marketing',
  'sales',
  'ops',
  'personal',
  'research',
  'writing',
  'finance',
  'fun',
];

export const CATEGORY_LABEL = {
  productivity: 'Productivity',
  development: 'Development',
  marketing: 'Marketing',
  sales: 'Sales',
  ops: 'Ops',
  personal: 'Personal',
  research: 'Research',
  writing: 'Writing',
  finance: 'Finance',
  fun: 'Fun',
};

// One line per category, so /c/<category> reads as a page rather than a
// filtered list. Shown in the hero and used as the meta description.
export const CATEGORY_BLURB = {
  productivity: 'Inbox, calendar, and notes. The bots that clear the day for you.',
  development: 'Code review, bug repro, specs, and release notes.',
  marketing: 'Content queues, competitor watching, and audience digests.',
  sales: 'Pipeline, call prep, follow-ups, and negotiation.',
  ops: 'Support, vendors, incidents, and keeping the org running.',
  personal: 'Housing, travel, subscriptions, and the household admin.',
  research: 'Reading, gathering, and summarising what you cannot read yourself.',
  writing: 'Drafting, editing, and keeping a voice consistent.',
  finance: 'Spend, invoices, expenses, and disputes.',
  fun: 'Games, oddities, and the bots that exist because they can.',
};

// A bot is listed against the tools it actually needs. Closed on purpose:
// an open list turns the filter into a mess of near-duplicates.
export const INTEGRATIONS = [
  'Slack',
  'Gmail',
  'Google Calendar',
  'Google Docs',
  'Google Drive',
  'Google Search Console',
  'GitHub',
  'Notion',
  'LinkedIn',
  'X',
  'Stripe',
  'Reddit',
];

// share-link · a native x.ai share you add in one click.
// profile-url · a PROFILE.md or SETUP.md URL you paste as the first message.
export const ADD_KINDS = ['share-link', 'profile-url'];

export const ADD_LABEL = {
  'share-link': 'Share link',
  'profile-url': 'Profile',
};

export const ADD_HINT = {
  'share-link': 'Open the share link and click Add to Grok Bot.',
  'profile-url': 'Paste this URL as the first message in a new Grok Bot chat.',
};

// Page names and route prefixes an entry slug must never claim.
export const RESERVED_SLUGS = ['about', 'submit', 'contribute', 'stats', 'c', 'i'];
