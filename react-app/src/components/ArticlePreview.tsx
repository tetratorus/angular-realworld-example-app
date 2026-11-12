import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Article } from '../api/types';
import ArticleMeta from './ArticleMeta';
import FavoriteButton from './FavoriteButton';

/** Angular ArticlePreviewComponent. */
export default function ArticlePreview({ article: input }: { article: Article }) {
  const [article, setArticle] = useState(input);
  useEffect(() => setArticle(input), [input]);

  const toggleFavorite = (favorited: boolean) =>
    setArticle(a => ({ ...a, favorited, favoritesCount: favorited ? a.favoritesCount + 1 : a.favoritesCount - 1 }));

  return (
    <div className="article-preview">
      <ArticleMeta article={article}>
        <FavoriteButton article={article} onToggle={toggleFavorite} className="pull-xs-right">
          {' '}
          {article.favoritesCount}{' '}
        </FavoriteButton>
      </ArticleMeta>
      <Link to={`/article/${article.slug}`} className="preview-link">
        <h1>{article.title}</h1>
        <p>{article.description}</p>
        <span>Read more...</span>
        <ul className="tag-list">
          {article.tagList.map(tag => (
            <li key={tag} className="tag-default tag-pill tag-outline">
              {' '}
              {tag}{' '}
            </li>
          ))}
        </ul>
      </Link>
    </div>
  );
}
