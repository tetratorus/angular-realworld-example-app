import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { tagsApi } from '../api/client';
import type { ArticleListConfig } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import ArticleList from '../components/ArticleList';

/** Port of Angular HomeComponent (src/app/features/article/pages/home/home.component.*). */
export default function HomePage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { tag } = useParams();
  const [searchParams] = useSearchParams();
  const feed = searchParams.get('feed');
  const pageParam = searchParams.get('page');
  const page = pageParam ? parseInt(pageParam, 10) : 1;

  // feed=following while signed out redirects to /login without updating the list config (as in Angular).
  const redirectToLogin = feed === 'following' && !isAuthenticated;
  const lastState = useRef<{ listConfig: ArticleListConfig; currentPage: number }>({
    listConfig: { type: 'all', filters: {} },
    currentPage: 1,
  });
  if (!redirectToLogin) {
    let type: string;
    let filters: { tag?: string } = {};
    if (tag) {
      type = 'all';
      filters = { tag };
    } else if (feed === 'following') {
      type = 'feed';
    } else {
      type = 'all';
    }
    lastState.current = { listConfig: { type, filters }, currentPage: page };
  }
  const { listConfig, currentPage } = lastState.current;
  const isFollowingFeed = listConfig.type === 'feed';

  useEffect(() => {
    if (redirectToLogin) navigate('/login');
  }, [redirectToLogin, navigate]);

  // Angular creates a new HomeComponent when switching between the '' and 'tag/:tag' routes,
  // so the tags are fetched again on that switch, but not between two tags.
  const onTagRoute = tag !== undefined;
  const [tags, setTags] = useState<string[] | null>(null);
  const [tagsLoaded, setTagsLoaded] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setTags(null);
    setTagsLoaded(false);
    tagsApi.getAll().then(result => {
      if (cancelled) return;
      setTagsLoaded(true);
      setTags(result);
    });
    return () => {
      cancelled = true;
    };
  }, [onTagRoute]);

  const onPageChange = (newPage: number) => {
    const queryParams = new URLSearchParams();
    // Preserve feed param if present
    if (feed) queryParams.set('feed', feed);
    // Only add page param if not page 1
    if (newPage > 1) queryParams.set('page', String(newPage));
    const search = queryParams.toString();
    navigate({ search: search ? `?${search}` : '' });
  };

  return (
    <div className="home-page">
      {!isAuthenticated && (
        <div className="banner">
          <div className="container">
            <h1 className="logo-font">
              <img src="assets/conduit-logo.svg" alt="Conduit" className="banner-logo" />
            </h1>
            <p>
              {' '}
              This is the <a href="https://github.com/realworld-apps/angular-realworld-example-app">
                Angular frontend
              </a>{' '}
              demo from the <a href="https://github.com/realworld-apps/realworld">Realworld</a> project.
              <br /> This demo is connected to a demo backend that enforces session isolation.{' '}
            </p>
          </div>
        </div>
      )}

      <div className="container page">
        <div className="row">
          <div className="col-md-9">
            <div className="feed-toggle">
              <ul className="nav nav-pills outline-active">
                {isAuthenticated && (
                  <li className="nav-item">
                    <Link
                      className={'nav-link' + (listConfig.type === 'feed' ? ' active' : '')}
                      to={{ pathname: '/', search: '?feed=following' }}
                    >
                      {' '}
                      Your Feed{' '}
                    </Link>
                  </li>
                )}
                <li className="nav-item">
                  <Link
                    className={'nav-link' + (listConfig.type === 'all' && !listConfig.filters.tag ? ' active' : '')}
                    to="/"
                  >
                    {' '}
                    Global Feed{' '}
                  </Link>
                </li>
                <li className="nav-item" hidden={!listConfig.filters.tag}>
                  <a className="nav-link active" style={{ cursor: 'pointer' }}>
                    {' '}
                    <i className="ion-pound"></i> {listConfig.filters.tag}{' '}
                  </a>
                </li>
              </ul>
            </div>

            <ArticleList
              limit={10}
              config={listConfig}
              currentPage={currentPage}
              isFollowingFeed={isFollowingFeed}
              onPageChange={onPageChange}
            />
          </div>

          {tags !== null && (
            <div className="col-md-3">
              <div className="sidebar">
                <p>Popular Tags</p>

                <div className="tag-list">
                  {tags.map(t => (
                    <Link key={t} className="tag-default tag-pill" to={`/tag/${encodeURIComponent(t)}`}>
                      {' '}
                      {t}{' '}
                    </Link>
                  ))}
                </div>

                <div hidden={tagsLoaded}>Loading tags...</div>

                <div hidden={!tagsLoaded || tags.length > 0}>No tags are here... yet.</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
