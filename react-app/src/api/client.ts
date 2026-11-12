import type { Article, ArticleListConfig, Comment, Errors, Profile, User } from './types';

/** Same backend as the Angular app (src/app/core/interceptors/api.interceptor.ts). */
export const API_BASE_URL = 'http://localhost:3000/api';
const TOKEN_KEY = 'jwtToken';

export const jwt = {
  get: (): string | null => window.localStorage.getItem(TOKEN_KEY),
  save: (token: string) => window.localStorage.setItem(TOKEN_KEY, token),
  destroy: () => window.localStorage.removeItem(TOKEN_KEY),
};

let onUnauthorized: () => void = () => {};
/** Registered by AuthProvider: mirrors Angular's global 401 handling (errorInterceptor). */
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn;
}

const NETWORK_ERROR: Errors = { errors: { network: ['Unable to connect. Please check your internet connection.'] } };

/**
 * Port of Angular's HttpClient + apiInterceptor + tokenInterceptor + errorInterceptor.
 * Rejects with `{ errors, status }`, the same shape Angular components receive.
 */
export async function request<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  options: { body?: unknown; params?: Record<string, string | number | undefined> } = {},
): Promise<T> {
  let url = API_BASE_URL + path;
  if (options.params) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(options.params)) if (v !== undefined) qs.set(k, String(v));
    const s = qs.toString();
    if (s) url += `?${s}`;
  }
  const headers: Record<string, string> = {};
  const token = jwt.get();
  if (token) headers['Authorization'] = `Token ${token}`;
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw { ...NETWORK_ERROR, status: 0 };
  }

  const text = await res.text();
  let data: unknown = null;
  let parsed = true;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      parsed = false;
    }
  }

  if (!res.ok) {
    if (res.status === 401 && !path.endsWith('/user')) onUnauthorized();
    const body = data && typeof data === 'object' && 'errors' in (data as object) ? (data as Errors) : NETWORK_ERROR;
    throw { ...body, status: res.status };
  }
  if (!parsed) throw { ...NETWORK_ERROR, status: res.status };
  return data as T;
}

/** UserService endpoints */
export const userApi = {
  login: (credentials: { email: string; password: string }) =>
    request<{ user: User }>('POST', '/users/login', { body: { user: credentials } }),
  register: (credentials: { username: string; email: string; password: string }) =>
    request<{ user: User }>('POST', '/users', { body: { user: credentials } }),
  current: () => request<{ user: User }>('GET', '/user'),
  update: (user: Partial<User> & { password?: string }) => request<{ user: User }>('PUT', '/user', { body: { user } }),
};

/** ArticlesService endpoints */
export const articlesApi = {
  query: (config: ArticleListConfig) =>
    request<{ articles: Article[]; articlesCount: number }>(
      'GET',
      '/articles' + (config.type === 'feed' ? '/feed' : ''),
      {
        params: config.filters as Record<string, string | number | undefined>,
      },
    ),
  get: (slug: string) => request<{ article: Article }>('GET', `/articles/${slug}`).then(d => d.article),
  delete: (slug: string) => request<void>('DELETE', `/articles/${slug}`),
  create: (article: Partial<Article>) =>
    request<{ article: Article }>('POST', '/articles', { body: { article } }).then(d => d.article),
  update: (article: Partial<Article>) =>
    request<{ article: Article }>('PUT', `/articles/${article.slug}`, { body: { article } }).then(d => d.article),
  favorite: (slug: string) =>
    request<{ article: Article }>('POST', `/articles/${slug}/favorite`, { body: {} }).then(d => d.article),
  unfavorite: (slug: string) => request<void>('DELETE', `/articles/${slug}/favorite`),
};

/** CommentsService endpoints */
export const commentsApi = {
  getAll: (slug: string) => request<{ comments: Comment[] }>('GET', `/articles/${slug}/comments`).then(d => d.comments),
  add: (slug: string, body: string) =>
    request<{ comment: Comment }>('POST', `/articles/${slug}/comments`, { body: { comment: { body } } }).then(
      d => d.comment,
    ),
  delete: (commentId: string, slug: string) => request<void>('DELETE', `/articles/${slug}/comments/${commentId}`),
};

/** TagsService endpoints */
export const tagsApi = {
  getAll: () => request<{ tags: string[] }>('GET', '/tags').then(d => d.tags),
};

/** ProfileService endpoints */
export const profileApi = {
  get: (username: string) => request<{ profile: Profile }>('GET', '/profiles/' + username).then(d => d.profile),
  follow: (username: string) =>
    request<{ profile: Profile }>('POST', '/profiles/' + username + '/follow', { body: {} }).then(d => d.profile),
  unfollow: (username: string) =>
    request<{ profile: Profile }>('DELETE', '/profiles/' + username + '/follow').then(d => d.profile),
};
