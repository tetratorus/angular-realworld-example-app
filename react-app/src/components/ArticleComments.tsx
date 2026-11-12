import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { commentsApi } from '../api/client';
import type { Article, Comment, Errors } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { defaultImage, longDate } from '../lib/format';
import ListErrors from './ListErrors';

/** Angular ArticleCommentComponent (features/article/components/article-comment.component.ts). */
function ArticleComment({ comment, onDelete }: { comment: Comment; onDelete: () => void }) {
  const { currentUser } = useAuth();
  const canModify = currentUser?.username === comment.author.username;
  return (
    <div className="card">
      <div className="card-block">
        <p className="card-text"> {comment.body} </p>
      </div>
      <div className="card-footer">
        <Link className="comment-author" to={`/profile/${comment.author.username}`}>
          <img src={defaultImage(comment.author.image)} className="comment-author-img" />
        </Link>
        {' \u00a0 '}
        <Link className="comment-author" to={`/profile/${comment.author.username}`}>
          {' '}
          {comment.author.username}{' '}
        </Link>
        <span className="date-posted"> {longDate(comment.createdAt)} </span>
        {canModify && (
          <span className="mod-options">
            <i className="ion-trash-a" onClick={onDelete}></i>
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Work package: comments. Port of the comments section of features/article/pages/article/article.component.html/.ts
 * (comment form, sign-in prompt, comment list, delete). Renders the contents of
 * `.row > .col-xs-12.col-md-8.offset-md-2`; ArticlePage owns that wrapper and mounts `<ArticleComments article={article} />` in it.
 * Loads `GET /articles/:slug/comments` itself, after the article.
 */
export default function ArticleComments({ article }: { article: Article }) {
  const { currentUser, isAuthenticated } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentBody, setCommentBody] = useState('');
  const [commentFormErrors, setCommentFormErrors] = useState<Errors | null>(null);
  const [deleteCommentErrors, setDeleteCommentErrors] = useState<Errors | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    commentsApi.getAll(article.slug).then(
      list => !cancelled && setComments(list),
      () => {},
    );
    return () => {
      cancelled = true;
    };
  }, [article.slug]);

  const addComment = (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setCommentFormErrors(null);
    commentsApi.add(article.slug, commentBody).then(
      comment => {
        setComments(list => [comment, ...list]);
        setCommentBody('');
        setSubmitting(false);
      },
      (errors: Errors) => {
        setSubmitting(false);
        setCommentFormErrors(errors);
      },
    );
  };

  const deleteComment = (comment: Comment) => {
    setDeleteCommentErrors(null);
    commentsApi.delete(comment.id, article.slug).then(
      () => setComments(list => list.filter(item => item !== comment)),
      (errors: Errors) => setDeleteCommentErrors(errors),
    );
  };

  return (
    <>
      {isAuthenticated && (
        <div>
          <ListErrors errors={commentFormErrors} />
          <form className="card comment-form" onSubmit={addComment}>
            <fieldset disabled={isSubmitting}>
              <div className="card-block">
                <textarea
                  className="form-control"
                  placeholder="Write a comment..."
                  rows={3}
                  value={commentBody}
                  onChange={e => setCommentBody(e.target.value)}
                ></textarea>
              </div>
              <div className="card-footer">
                <img src={defaultImage(currentUser?.image)} className="comment-author-img" />
                <button className="btn btn-sm btn-primary" type="submit">
                  Post Comment
                </button>
              </div>
            </fieldset>
          </form>
        </div>
      )}

      {!isAuthenticated && (
        <div>
          <Link to="/login">Sign in</Link> or <Link to="/register">sign up</Link> to add comments on this article.{' '}
        </div>
      )}

      <ListErrors errors={deleteCommentErrors} />

      {comments.map(comment => (
        <ArticleComment key={comment.id} comment={comment} onDelete={() => deleteComment(comment)} />
      ))}
    </>
  );
}
