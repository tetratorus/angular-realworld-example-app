import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { articlesApi } from '../api/client';
import type { Article, Errors, Profile } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import ArticleComments from '../components/ArticleComments';
import ArticleMeta from '../components/ArticleMeta';
import FavoriteButton from '../components/FavoriteButton';
import FollowButton from '../components/FollowButton';
import ListErrors from '../components/ListErrors';
import { renderMarkdown } from '../lib/markdown';

/** Port of features/article/pages/article/article.component (comments section lives in ArticleComments). */
export default function ArticlePage() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [article, setArticle] = useState<Article | null>(null);
  const [errors, setErrors] = useState<Errors | null>(null);
  const [isDeleting, setDeleting] = useState(false);
  const loadedSlug = useRef<string | null>(null);

  useEffect(() => {
    // Guarded by slug rather than cancelled on cleanup, so StrictMode's double effect issues one request.
    if (loadedSlug.current === slug) return;
    loadedSlug.current = slug;
    articlesApi.get(slug).then(
      a => loadedSlug.current === slug && setArticle(a),
      // Angular stores err.errors (the inner map) and hands it to <app-list-errors>, which reads `.errors` again.
      (err: Errors) =>
        loadedSlug.current === slug &&
        setErrors((err.errors || { error: ['Failed to load article'] }) as unknown as Errors),
    );
  }, [slug]);

  const canModify = !!article && currentUser?.username === article.author.username;

  const onToggleFavorite = (favorited: boolean) =>
    setArticle(a =>
      a ? { ...a, favorited, favoritesCount: favorited ? a.favoritesCount + 1 : a.favoritesCount - 1 } : a,
    );

  const toggleFollowing = (profile: Profile) =>
    setArticle(a => (a ? { ...a, author: { ...a.author, following: profile.following } } : a));

  const deleteArticle = () => {
    if (!article) return;
    setDeleting(true);
    articlesApi.delete(article.slug).then(() => navigate('/'));
  };

  const actions = (a: Article) =>
    canModify ? (
      <span>
        <Link className="btn btn-sm btn-outline-secondary" to={`/editor/${a.slug}`}>
          <i className="ion-edit"></i> Edit Article{' '}
        </Link>
        <button className={`btn btn-sm btn-outline-danger${isDeleting ? ' disabled' : ''}`} onClick={deleteArticle}>
          <i className="ion-trash-a"></i> Delete Article{' '}
        </button>
      </span>
    ) : (
      <span>
        <FollowButton profile={a.author} onToggle={toggleFollowing} />
        <FavoriteButton article={a} onToggle={onToggleFavorite}>
          {a.favorited ? 'Unfavorite' : 'Favorite'} Article <span className="counter">({a.favoritesCount})</span>
        </FavoriteButton>
      </span>
    );

  return (
    <div className="article-page">
      {errors && (
        <div className="container">
          <div className="row">
            <div className="col-md-12">
              <ListErrors errors={errors} />
            </div>
          </div>
        </div>
      )}
      {article && (
        <>
          <div className="banner">
            <div className="container">
              <h1>{article.title}</h1>

              <ArticleMeta article={article}>{actions(article)}</ArticleMeta>
            </div>
          </div>

          <div className="container page">
            <div className="row article-content">
              <div className="col-md-12">
                <div dangerouslySetInnerHTML={{ __html: renderMarkdown(article.body) }}></div>

                <ul className="tag-list">
                  {article.tagList.map(tag => (
                    <li key={tag} className="tag-default tag-pill tag-outline">
                      {' '}
                      {tag}{' '}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <hr />

            <div className="article-actions">
              <ArticleMeta article={article}>{actions(article)}</ArticleMeta>
            </div>

            <div className="row">
              <div className="col-xs-12 col-md-8 offset-md-2">
                <ArticleComments article={article} />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
