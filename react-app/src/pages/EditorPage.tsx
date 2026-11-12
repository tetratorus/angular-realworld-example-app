import { KeyboardEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { articlesApi, userApi } from '../api/client';
import type { Errors } from '../api/types';
import ListErrors from '../components/ListErrors';

interface ArticleForm {
  title: string;
  description: string;
  body: string;
}

/** Port of src/app/features/article/pages/editor/editor.component.{ts,html}. */
export default function EditorPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [tagList, setTagList] = useState<string[]>([]);
  const [articleForm, setArticleForm] = useState<ArticleForm>({ title: '', description: '', body: '' });
  const [tagField, setTagField] = useState('');
  const [errors, setErrors] = useState<Errors | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let destroyed = false;
    Promise.all([articlesApi.get(slug), userApi.current()]).then(
      ([article, { user }]) => {
        if (destroyed) return;
        if (user.username === article.author.username) {
          setTagList(article.tagList);
          setArticleForm({ title: article.title, description: article.description, body: article.body });
        } else {
          navigate('/');
        }
      },
      () => {},
    );
    return () => {
      destroyed = true;
    };
  }, [slug, navigate]);

  // Returns the resulting tag list so submitForm can use it in the same tick (Angular signals update synchronously).
  const addTag = (): string[] => {
    // retrieve tag control
    const tag = tagField;
    let tags = tagList;
    // only add tag if it does not exist yet
    if (tag != null && tag.trim() !== '' && tagList.indexOf(tag) < 0) {
      tags = [...tagList, tag];
      setTagList(tags);
    }
    // clear the input
    setTagField('');
    return tags;
  };

  const removeTag = (tagName: string) => {
    setTagList(tags => tags.filter(tag => tag !== tagName));
  };

  const submitForm = () => {
    setIsSubmitting(true);
    // update any single tag
    const tags = addTag();

    const articleData = {
      ...articleForm,
      tagList: tags,
    };

    const request = slug ? articlesApi.update({ ...articleData, slug }) : articlesApi.create(articleData);

    request.then(
      article => navigate('/article/' + article.slug),
      err => {
        setErrors(err);
        setIsSubmitting(false);
      },
    );
  };

  const onTagKeyUp = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') addTag();
  };

  const field = (name: keyof ArticleForm) => ({
    name,
    value: articleForm[name],
    onChange: (e: { target: { value: string } }) => setArticleForm(f => ({ ...f, [name]: e.target.value })),
  });

  return (
    <div className="editor-page">
      <div className="container page">
        <div className="row">
          <div className="col-md-10 offset-md-1 col-xs-12">
            <ListErrors errors={errors} />

            <form>
              <fieldset disabled={isSubmitting}>
                <fieldset className="form-group">
                  <input
                    className="form-control form-control-lg"
                    {...field('title')}
                    type="text"
                    placeholder="Article Title"
                  />
                </fieldset>

                <fieldset className="form-group">
                  <input
                    className="form-control"
                    {...field('description')}
                    type="text"
                    placeholder="What's this article about?"
                  />
                </fieldset>

                <fieldset className="form-group">
                  <textarea
                    className="form-control"
                    {...field('body')}
                    rows={8}
                    placeholder="Write your article (in markdown)"
                  ></textarea>
                </fieldset>

                <fieldset className="form-group">
                  <input
                    className="form-control"
                    type="text"
                    placeholder="Enter tags"
                    value={tagField}
                    onChange={e => setTagField(e.target.value)}
                    onKeyUp={onTagKeyUp}
                  />
                  <div className="tag-list">
                    {tagList.map(tag => (
                      <span className="tag-default tag-pill" key={tag}>
                        <i className="ion-close-round" onClick={() => removeTag(tag)}></i> {tag}{' '}
                      </span>
                    ))}
                  </div>
                </fieldset>

                <button className="btn btn-lg pull-xs-right btn-primary" type="button" onClick={submitForm}>
                  Publish Article
                </button>
              </fieldset>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
