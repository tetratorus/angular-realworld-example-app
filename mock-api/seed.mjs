// Deterministic seed: fixed users, 22 articles, tags, comments, follows and favourites.
const AVATAR = name => `http://localhost:3000/avatars/${name}.svg`;

const users = [
  { username: 'demo', email: 'demo@conduit.test', bio: 'Demo account used by the test scenarios.', image: null },
  { username: 'alice', email: 'alice@conduit.test', bio: 'Frontend engineer. Writes about forms and state.', image: AVATAR('alice') },
  { username: 'bob', email: 'bob@conduit.test', bio: 'Platform team. Testing, CI and release notes.', image: AVATAR('bob') },
  { username: 'carol', email: 'carol@conduit.test', bio: 'Designer who codes.', image: AVATAR('carol') },
  { username: 'johndoe', email: 'johndoe@conduit.test', bio: null, image: AVATAR('johndoe') },
  { username: 'erin', email: 'erin@conduit.test', bio: 'QA lead.', image: null },
].map((u, i) => ({ id: i + 1, password: 'password123', ...u }));

const T = [
  ['alice', 'Getting started with reactive forms', 'A short tour of form state, validation and submission', ['forms', 'angular']],
  ['bob', 'Why we run every test in CI', 'Fast feedback beats heroic debugging', ['testing', 'ci']],
  ['carol', 'Designing an empty state', 'What users should see before there is any data', ['design', 'ux']],
  ['johndoe', 'Routing without surprises', 'Keep URLs stable while you change everything behind them', ['routing', 'angular']],
  ['alice', 'Component boundaries that last', 'How to split a page into parts you can test alone', ['components', 'design']],
  ['erin', 'Writing test cases people can run', 'Steps, data and expected results in plain language', ['testing', 'qa']],
  ['bob', 'Pagination done right', 'Offsets, limits and the counts that go with them', ['api', 'pagination']],
  ['carol', 'Colour, contrast and buttons', 'Small changes that make actions obvious', ['design', 'accessibility']],
  ['johndoe', 'Tokens, sessions and logout', 'What the browser keeps and when to throw it away', ['auth', 'security']],
  ['alice', 'Markdown in the browser', 'Render user content safely and predictably', ['markdown', 'security']],
  ['bob', 'Release notes nobody skips', 'Write for the person who has to deploy it', ['ci', 'writing']],
  ['erin', 'Regression suites that stay green', 'Keep the suite honest as the product grows', ['testing', 'qa']],
  ['carol', 'Typography for long reads', 'Line length, spacing and a calm page', ['design', 'ux']],
  ['johndoe', 'Following and feeds', 'How a personal feed is assembled from follows', ['api', 'social']],
  ['alice', 'Migrating a screen at a time', 'Ship value early without a big-bang rewrite', ['migration', 'angular']],
  ['bob', 'Favourites as a signal', 'Counting what readers care about', ['api', 'social']],
  ['erin', 'Negative tests matter', 'Invalid input is half of the specification', ['testing', 'qa']],
  ['carol', 'Settings pages people understand', 'Group fields by what the user is trying to do', ['design', 'forms']],
  ['johndoe', 'Error messages that help', 'Say what went wrong and how to fix it', ['ux', 'forms']],
  ['alice', 'State that survives a refresh', 'What to keep in the URL and what to keep in storage', ['routing', 'state']],
  ['bob', 'Welcome to Conduit', 'Start here: what this site is and how to use it', ['welcome']],
  ['erin', 'Screenshots as evidence', 'Comparing pages pixel by pixel', ['testing', 'migration']],
];

const slugify = t => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const day = i => new Date(Date.UTC(2026, 9, 1, 9, 0, 0) + i * 86400000).toISOString();

const articles = T.map(([author, title, description, tagList], i) => ({
  id: i + 1,
  slug: slugify(title),
  title,
  description,
  body: `## ${title}\n\n${description}.\n\nThis article is part of the seeded demo data. It has **bold text**, a list and a link:\n\n- First point about ${tagList[0]}\n- Second point about ${tagList[tagList.length - 1]}\n\nRead more on [the RealWorld project](https://github.com/realworld-apps/realworld).`,
  tagList,
  createdAt: day(i),
  updatedAt: day(i),
  author,
}));

const C = [
  [0, 'bob', 'Clear and practical, thanks.'],
  [0, 'carol', 'The validation section helped a lot.'],
  [0, 'demo', 'Bookmarking this for the team.'],
  [1, 'erin', 'Agree. Slow suites get skipped.'],
  [4, 'johndoe', 'Nice split between page and parts.'],
  [5, 'alice', 'We use this template now.'],
  [14, 'bob', 'Screen by screen is the only way that worked for us.'],
  [14, 'erin', 'How do you prove each screen still behaves the same?'],
  [20, 'alice', 'Welcome everyone!'],
  [21, 'carol', 'Masking dates is a good tip.'],
];
const comments = C.map(([a, author, body], i) => ({
  id: i + 1,
  slug: articles[a].slug,
  author,
  body,
  createdAt: new Date(Date.parse(articles[a].createdAt) + (i + 1) * 3600000).toISOString(),
  updatedAt: new Date(Date.parse(articles[a].createdAt) + (i + 1) * 3600000).toISOString(),
}));

const follows = [
  { follower: 'demo', followee: 'alice' },
  { follower: 'demo', followee: 'bob' },
  { follower: 'alice', followee: 'carol' },
  { follower: 'erin', followee: 'demo' },
];

const F = [
  [0, ['bob', 'carol', 'demo']],
  [1, ['erin', 'alice']],
  [2, ['alice']],
  [4, ['demo', 'johndoe']],
  [5, ['bob', 'carol', 'johndoe', 'demo']],
  [9, ['erin']],
  [14, ['bob', 'erin', 'carol', 'johndoe', 'demo']],
  [20, ['alice', 'carol']],
  [21, ['alice', 'bob', 'demo']],
];
const favorites = F.flatMap(([a, us]) => us.map(username => ({ slug: articles[a].slug, username })));

export const seed = () => ({ users, articles, comments, follows, favorites });
