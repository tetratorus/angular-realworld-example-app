import { ReactNode, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { articlesApi } from '../api/client';
import type { Article } from '../api/types';
import { useAuth } from '../auth/AuthContext';

/** Angular FavoriteButtonComponent. `onToggle(favorited)` mirrors the (toggle) output. */
export default function FavoriteButton({
  article,
  onToggle,
  className,
  children,
}: {
  article: Article;
  onToggle: (favorited: boolean) => void;
  className?: string;
  children?: ReactNode;
}) {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setSubmitting] = useState(false);

  const toggleFavorite = () => {
    setSubmitting(true);
    if (!isAuthenticated) {
      navigate('/register');
      return;
    }
    const call = article.favorited ? articlesApi.unfavorite(article.slug) : articlesApi.favorite(article.slug);
    call.then(
      () => {
        setSubmitting(false);
        onToggle(!article.favorited);
      },
      () => setSubmitting(false),
    );
  };

  const classes = ['btn', 'btn-sm', isSubmitting && 'disabled', article.favorited ? 'btn-primary' : 'btn-outline-primary']
    .filter(Boolean)
    .join(' ');
  const button = (
    <button className={classes} onClick={toggleFavorite}>
      <i className="ion-heart"></i> {children}
    </button>
  );
  // Angular renders the button inside an <app-favorite-button> host element that carries the host class.
  return className ? <span className={className}>{button}</span> : button;
}
