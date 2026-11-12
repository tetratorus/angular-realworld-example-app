// RealWorld-spec mock backend with deterministic seed data.
// In-memory; POST /api/__reset restores the seed. No dependencies.
import http from 'node:http';
import crypto from 'node:crypto';
import { seed } from './seed.mjs';

const PORT = Number(process.env.PORT || 3000);
const SECRET = 'conduit-mock-secret';

let db;
function reset() {
  db = structuredClone(seed());
  db.nextUserId = db.users.length + 1;
  db.nextCommentId = 1 + db.comments.reduce((m, c) => Math.max(m, c.id), 0);
}
reset();

const sign = username => {
  const payload = Buffer.from(JSON.stringify({ username })).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
};
const verify = token => {
  const [payload, sig] = (token || '').split('.');
  if (!payload || !sig) return null;
  const expected = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
  if (sig !== expected) return null;
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString()).username;
  } catch {
    return null;
  }
};

const err = (status, field, msg) => ({ status, body: { errors: { [field]: [msg] } } });
const ok = (body, status = 200) => ({ status, body });
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const blank = v => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');

const findUser = username => db.users.find(u => u.username === username);
const userJson = u => ({ email: u.email, token: sign(u.username), username: u.username, bio: u.bio, image: u.image });
const profileJson = (u, viewer) => ({
  username: u.username,
  bio: u.bio,
  image: u.image,
  following: !!viewer && db.follows.some(f => f.follower === viewer && f.followee === u.username),
});
const articleJson = (a, viewer, withBody = true) => {
  const favs = db.favorites.filter(f => f.slug === a.slug);
  const out = {
    slug: a.slug,
    title: a.title,
    description: a.description,
    ...(withBody ? { body: a.body } : {}),
    tagList: [...a.tagList],
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
    favorited: !!viewer && favs.some(f => f.username === viewer),
    favoritesCount: favs.length,
    author: profileJson(findUser(a.author), viewer),
  };
  return out;
};
const commentJson = (c, viewer) => ({
  id: c.id,
  createdAt: c.createdAt,
  updatedAt: c.updatedAt,
  body: c.body,
  author: profileJson(findUser(c.author), viewer),
});
const slugify = title =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'article';
const uniqueSlug = (title, except) => {
  const base = slugify(title);
  let slug = base;
  let i = 2;
  while (db.articles.some(a => a.slug === slug && a !== except)) slug = `${base}-${i++}`;
  return slug;
};
const now = () => new Date().toISOString();
const sortedArticles = () => [...db.articles].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id);
const page = (list, q) => {
  const limit = Math.max(0, parseInt(q.get('limit') ?? '20', 10) || 20);
  const offset = Math.max(0, parseInt(q.get('offset') ?? '0', 10) || 0);
  return list.slice(offset, offset + limit);
};

function route(method, path, q, body, viewer, tokenStatus) {
  const needAuth = () => (viewer ? null : tokenStatus === 'invalid' ? err(401, 'token', 'is invalid') : err(401, 'token', 'is missing'));
  let m;

  if (method === 'POST' && path === '/__reset') return reset(), ok({ ok: true });

  if (method === 'POST' && path === '/users/login') {
    const u = body?.user || {};
    if (blank(u.email)) return err(422, 'email', "can't be blank");
    if (blank(u.password)) return err(422, 'password', "can't be blank");
    if (!EMAIL_RE.test(u.email)) return err(422, 'email', 'is invalid');
    const user = db.users.find(x => x.email === u.email && x.password === u.password);
    if (!user) return err(401, 'credentials', 'invalid');
    return ok({ user: userJson(user) });
  }
  if (method === 'POST' && path === '/users') {
    const u = body?.user || {};
    if (blank(u.username)) return err(422, 'username', "can't be blank");
    if (blank(u.email)) return err(422, 'email', "can't be blank");
    if (blank(u.password)) return err(422, 'password', "can't be blank");
    if (!EMAIL_RE.test(u.email)) return err(422, 'email', 'is invalid');
    if (findUser(u.username)) return err(409, 'username', 'has already been taken');
    if (db.users.some(x => x.email === u.email)) return err(409, 'email', 'has already been taken');
    const user = { id: db.nextUserId++, username: u.username, email: u.email, password: u.password, bio: null, image: null };
    db.users.push(user);
    return ok({ user: userJson(user) }, 201);
  }
  if (path === '/user' && method === 'GET') {
    const a = needAuth();
    if (a) return a;
    return ok({ user: userJson(findUser(viewer)) });
  }
  if (path === '/user' && method === 'PUT') {
    const a = needAuth();
    if (a) return a;
    const user = findUser(viewer);
    const u = body?.user || {};
    if ('username' in u) {
      if (blank(u.username)) return err(422, 'username', "can't be blank");
      if (u.username !== user.username && findUser(u.username)) return err(409, 'username', 'has already been taken');
    }
    if ('email' in u) {
      if (blank(u.email)) return err(422, 'email', "can't be blank");
      if (!EMAIL_RE.test(u.email)) return err(422, 'email', 'is invalid');
      if (db.users.some(x => x.email === u.email && x !== user)) return err(409, 'email', 'has already been taken');
    }
    if ('password' in u && blank(u.password)) return err(422, 'password', "can't be blank");
    if ('password' in u && u.password.length < 8) return err(422, 'password', 'is too short (minimum is 8 characters)');
    if ('username' in u && u.username !== user.username) {
      const old = user.username;
      db.articles.forEach(x => x.author === old && (x.author = u.username));
      db.comments.forEach(x => x.author === old && (x.author = u.username));
      db.favorites.forEach(x => x.username === old && (x.username = u.username));
      db.follows.forEach(x => {
        if (x.follower === old) x.follower = u.username;
        if (x.followee === old) x.followee = u.username;
      });
      user.username = u.username;
    }
    if ('email' in u) user.email = u.email;
    if ('password' in u) user.password = u.password;
    if ('bio' in u) user.bio = blank(u.bio) ? null : u.bio;
    if ('image' in u) user.image = blank(u.image) ? null : u.image;
    return ok({ user: userJson(user) });
  }

  if ((m = path.match(/^\/profiles\/([^/]+)(\/follow)?$/))) {
    const username = decodeURIComponent(m[1]);
    if (m[2]) {
      const a = needAuth();
      if (a) return a;
    }
    const target = findUser(username);
    if (!target) return err(404, 'profile', 'not found');
    if (m[2] && method === 'POST') {
      if (!db.follows.some(f => f.follower === viewer && f.followee === username))
        db.follows.push({ follower: viewer, followee: username });
    } else if (m[2] && method === 'DELETE') {
      db.follows = db.follows.filter(f => !(f.follower === viewer && f.followee === username));
    } else if (method !== 'GET') return null;
    return ok({ profile: profileJson(target, viewer) });
  }

  if (path === '/tags' && method === 'GET') {
    const tags = [];
    for (const a of sortedArticles()) for (const t of a.tagList) if (!tags.includes(t)) tags.push(t);
    return ok({ tags });
  }

  if (path === '/articles/feed' && method === 'GET') {
    const a = needAuth();
    if (a) return a;
    const followed = db.follows.filter(f => f.follower === viewer).map(f => f.followee);
    const list = sortedArticles().filter(x => followed.includes(x.author));
    return ok({ articles: page(list, q).map(x => articleJson(x, viewer, false)), articlesCount: list.length });
  }
  if (path === '/articles' && method === 'GET') {
    let list = sortedArticles();
    if (q.get('tag')) list = list.filter(x => x.tagList.includes(q.get('tag')));
    if (q.get('author')) list = list.filter(x => x.author === q.get('author'));
    if (q.get('favorited'))
      list = list.filter(x => db.favorites.some(f => f.slug === x.slug && f.username === q.get('favorited')));
    return ok({ articles: page(list, q).map(x => articleJson(x, viewer, false)), articlesCount: list.length });
  }
  if (path === '/articles' && method === 'POST') {
    const a = needAuth();
    if (a) return a;
    const x = body?.article || {};
    if (blank(x.title)) return err(422, 'title', "can't be blank");
    if (blank(x.description)) return err(422, 'description', "can't be blank");
    if (blank(x.body)) return err(422, 'body', "can't be blank");
    const t = now();
    const tagList = Array.isArray(x.tagList) ? [...new Set(x.tagList.filter(s => typeof s === 'string' && s.trim()))] : [];
    const art = {
      id: 1 + db.articles.reduce((mx, y) => Math.max(mx, y.id), 0),
      slug: uniqueSlug(x.title),
      title: x.title,
      description: x.description,
      body: x.body,
      tagList,
      createdAt: t,
      updatedAt: t,
      author: viewer,
    };
    db.articles.push(art);
    return ok({ article: articleJson(art, viewer) }, 201);
  }

  if ((m = path.match(/^\/articles\/([^/]+)(\/favorite|\/comments(?:\/([^/]+))?)?$/))) {
    const slug = decodeURIComponent(m[1]);
    const sub = m[2];
    const writes = method !== 'GET';
    if (writes) {
      const a = needAuth();
      if (a) return a;
    }
    const art = db.articles.find(x => x.slug === slug);
    if (!art) return err(404, 'article', 'not found');

    if (!sub) {
      if (method === 'GET') return ok({ article: articleJson(art, viewer) });
      if (art.author !== viewer) return err(403, 'article', 'forbidden');
      if (method === 'DELETE') {
        db.articles = db.articles.filter(x => x !== art);
        db.comments = db.comments.filter(c => c.slug !== slug);
        db.favorites = db.favorites.filter(f => f.slug !== slug);
        return { status: 204, body: null };
      }
      if (method === 'PUT') {
        const x = body?.article || {};
        if ('title' in x && blank(x.title)) return err(422, 'title', "can't be blank");
        if ('description' in x && blank(x.description)) return err(422, 'description', "can't be blank");
        if ('body' in x && blank(x.body)) return err(422, 'body', "can't be blank");
        if ('tagList' in x && !Array.isArray(x.tagList)) return err(422, 'tagList', 'must be an array');
        if ('title' in x && x.title !== art.title) {
          const newSlug = uniqueSlug(x.title, art);
          db.comments.forEach(c => c.slug === art.slug && (c.slug = newSlug));
          db.favorites.forEach(f => f.slug === art.slug && (f.slug = newSlug));
          art.slug = newSlug;
          art.title = x.title;
        }
        if ('description' in x) art.description = x.description;
        if ('body' in x) art.body = x.body;
        if ('tagList' in x) art.tagList = [...new Set(x.tagList)];
        art.updatedAt = now();
        return ok({ article: articleJson(art, viewer) });
      }
      return null;
    }
    if (sub === '/favorite') {
      if (method === 'POST') {
        if (!db.favorites.some(f => f.slug === slug && f.username === viewer)) db.favorites.push({ slug, username: viewer });
      } else if (method === 'DELETE') {
        db.favorites = db.favorites.filter(f => !(f.slug === slug && f.username === viewer));
      } else return null;
      return ok({ article: articleJson(art, viewer) });
    }
    // comments
    if (m[3] === undefined) {
      if (method === 'GET') {
        const list = db.comments.filter(c => c.slug === slug).sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id);
        return ok({ comments: list.map(c => commentJson(c, viewer)) });
      }
      if (method === 'POST') {
        const c = body?.comment || {};
        if (blank(c.body)) return err(422, 'body', "can't be blank");
        const t = now();
        const com = { id: db.nextCommentId++, slug, body: c.body, author: viewer, createdAt: t, updatedAt: t };
        db.comments.push(com);
        return ok({ comment: commentJson(com, viewer) }, 201);
      }
      return null;
    }
    if (method === 'DELETE') {
      const id = Number(m[3]);
      const com = db.comments.find(c => c.id === id && c.slug === slug);
      if (!com) return err(404, 'comment', 'not found');
      if (com.author !== viewer) return err(403, 'comment', 'forbidden');
      db.comments = db.comments.filter(c => c !== com);
      return { status: 204, body: null };
    }
    return null;
  }
  return null;
}

const AVATAR_COLORS = ['#5CB85C', '#3E8EDE', '#B85C5C', '#E0A800', '#7A5CB8', '#2AA198', '#D35400', '#34495E'];
function avatarSvg(name) {
  const n = [...name].reduce((s, ch) => s + ch.charCodeAt(0), 0);
  const color = AVATAR_COLORS[n % AVATAR_COLORS.length];
  const letter = (name[0] || '?').toUpperCase();
  return `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" fill="${color}"/><text x="64" y="84" font-family="Arial, sans-serif" font-size="64" font-weight="bold" fill="#fff" text-anchor="middle">${letter}</text></svg>`;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.writeHead(204).end();

  const av = url.pathname.match(/^\/avatars\/([a-z0-9_-]+)\.svg$/i);
  if (av) return res.writeHead(200, { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'max-age=3600' }).end(avatarSvg(av[1]));
  if (url.pathname === '/health') return res.writeHead(200).end('ok');
  if (!url.pathname.startsWith('/api/')) return res.writeHead(404).end();

  let raw = '';
  req.on('data', c => (raw += c));
  req.on('end', () => {
    let body = null;
    if (raw) {
      try {
        body = JSON.parse(raw);
      } catch {
        return res.writeHead(400, { 'Content-Type': 'application/json' }).end(JSON.stringify({ errors: { body: ['is invalid JSON'] } }));
      }
    }
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Token ') ? auth.slice(6) : auth.startsWith('Bearer ') ? auth.slice(7) : '';
    let viewer = token ? verify(token) : null;
    if (viewer && !findUser(viewer)) viewer = null;
    const tokenStatus = !token ? 'missing' : viewer ? 'valid' : 'invalid';
    const path = url.pathname.slice(4);
    let result = route(req.method, path, url.searchParams, body, viewer, tokenStatus);
    if (!result) result = { status: 404, body: { errors: { path: ['not found'] } } };
    if (process.env.LOG) console.log(req.method, url.pathname + url.search, result.status);
    if (result.body === null) return res.writeHead(result.status).end();
    res.writeHead(result.status, { 'Content-Type': 'application/json' }).end(JSON.stringify(result.body));
  });
});
server.listen(PORT, () => console.log(`RealWorld mock API on http://localhost:${PORT}/api`));
