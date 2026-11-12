import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { articlesApi } from '../api/client';
import type { Article, ArticleListConfig } from '../api/types';
import ArticlePreview from './ArticlePreview';

type LoadingState = 'NOT_LOADED' | 'LOADING' | 'LOADED';

/** Angular ArticleListComponent: loads a page of articles for `config` and renders pagination. */
export default function ArticleList({
  limit,
  config,
  currentPage = 1,
  isFollowingFeed = false,
  onPageChange,
}: {
  limit: number;
  config: ArticleListConfig;
  currentPage?: number;
  isFollowingFeed?: boolean;
  onPageChange?: (page: number) => void;
}) {
  const [results, setResults] = useState<Article[]>([]);
  const [page, setPage] = useState(currentPage);
  const [totalPages, setTotalPages] = useState<number[]>([]);
  const [loading, setLoading] = useState<LoadingState>('NOT_LOADED');
  const runId = useRef(0);

  const runQuery = (pageNumber: number) => {
    const id = ++runId.current;
    setLoading('LOADING');
    setResults([]);
    const query: ArticleListConfig = { ...config, filters: { ...config.filters } };
    if (limit) {
      query.filters.limit = limit;
      query.filters.offset = limit * (pageNumber - 1);
    }
    articlesApi.query(query).then(data => {
      if (id !== runId.current) return;
      setLoading('LOADED');
      setResults(data.articles);
      setTotalPages(Array.from(new Array(Math.ceil(data.articlesCount / limit)), (_v, i) => i + 1));
    });
  };

  const configKey = JSON.stringify(config);
  useEffect(() => {
    setPage(currentPage);
    runQuery(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configKey, currentPage]);

  const setPageTo = (pageNumber: number) => {
    if (pageNumber !== page) {
      setPage(pageNumber);
      onPageChange?.(pageNumber);
      runQuery(pageNumber);
    }
  };

  return (
    <>
      {loading === 'LOADING' && <div className="article-preview">Loading articles...</div>}
      {loading === 'LOADED' && (
        <>
          {results.map(article => (
            <ArticlePreview key={article.slug} article={article} />
          ))}
          {results.length === 0 && (
            <div className="article-preview empty-feed-message">
              {isFollowingFeed ? (
                <>
                  {' '}
                  Your feed is empty. Follow some users to see their articles here, or check out the{' '}
                  <Link to="/">Global Feed</Link>!{' '}
                </>
              ) : (
                <> No articles are here... yet. </>
              )}
            </div>
          )}
          <nav>
            <ul className="pagination">
              {totalPages.map(pageNumber => (
                <li key={pageNumber} className={'page-item' + (pageNumber === page ? ' active' : '')}>
                  <button className="page-link" onClick={() => setPageTo(pageNumber)}>
                    {' '}
                    {pageNumber}{' '}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </>
      )}
    </>
  );
}
